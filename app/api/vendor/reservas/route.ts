import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { guardVendor, toJson, type VendorContext } from '@/lib/vendor-guard';
import { isManualReservation, loadVendorReservations, toVendorRow } from '@/lib/vendor-reservations';
import { createReservaCore, patchReservaCore, type ReservaActorContext } from '@/lib/admin/reservas-core';
import { normalizeDigits, normalizeEmail } from '@/lib/reservas/code';

export const runtime = 'nodejs';

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

function actorOf(ctx: VendorContext): ReservaActorContext {
  return {
    email: ctx.email,
    role: 'vendor',
    vendor: { id: ctx.vendorId, name: String(ctx.vendor.name ?? ctx.email), allowedPackages: ctx.allowedPackages },
  };
}

/** Devuelve la reserva solo si pertenece al vendedor. */
async function loadOwned(ctx: VendorContext, id: string) {
  const ref = ctx.db.collection('reservas').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as any;
  if (data.referredBy?.vendorId !== ctx.vendorId) return null;
  return { ref, snap, data };
}

/**
 * GET            -> listado de ventas del vendedor (manuales y online)
 * GET ?id=<id>   -> detalle de una venta propia
 */
export async function GET(request: Request) {
  const ctx = await guardVendor(request);
  if (ctx instanceof NextResponse) return ctx;
  const id = new URL(request.url).searchParams.get('id')?.trim();

  try {
    if (!id) {
      return NextResponse.json({ ok: true, reservations: await loadVendorReservations(ctx.db, ctx.vendorId) });
    }

    const owned = await loadOwned(ctx, id);
    if (!owned) return fail('Reserva no encontrada', 404);
    const { snap, data, ref } = owned;

    const paymentsSnap = await ref.collection('payments').get();
    const payments = paymentsSnap.docs
      .map((p) => toJson({ id: p.id, ...(p.data() as any) }))
      .sort((a: any, b: any) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));

    const row = toVendorRow(snap);
    return NextResponse.json({
      ok: true,
      reservation: {
        ...row,
        paymentMethod: data.paymentMethod ?? null,
        peopleAdults: data.peopleAdults ?? null,
        peopleMinors: data.peopleMinors ?? null,
        customerPhone: data.customerPhone ?? null,
        customerCountry: data.customerCountry ?? null,
        customerDocument: data.customerDocument ?? null,
        customerBirthDate: data.customerBirthDate ?? null,
        customerComments: data.customerComments ?? null,
        passengerDetails: toJson(data.passengerDetails ?? []),
        selectedExtras: toJson(data.selectedExtras ?? []),
        selectedSeats: data.selectedSeats ?? [],
        baseSubtotalAmount: Number(data.baseSubtotalAmount) || 0,
        extrasTotalAmount: Number(data.extrasTotalAmount) || 0,
        attachments: toJson(data.attachments ?? []),
        statusHistory: toJson(data.statusHistory ?? []),
        commission: {
          type: data.referredBy?.commissionType ?? null,
          value: data.referredBy?.commissionValue ?? null,
        },
        payments,
      },
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'No se pudo cargar la reserva', 500);
  }
}

/** Alta de venta manual: misma lógica que el admin, siempre a nombre del vendedor. */
export async function POST(request: Request) {
  const ctx = await guardVendor(request);
  if (ctx instanceof NextResponse) return ctx;
  return createReservaCore(request, actorOf(ctx));
}

const travelerSchema = z.object({
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  age: z.number().int().min(0).max(120),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone: z.string().min(8).max(40),
  document: z.string().min(3).max(40),
  travelerType: z.enum(['adult', 'minor']).nullable().optional(),
});

const patchSchema = z.object({
  reservationId: z.string().min(1),
  action: z.enum(['cancel', 'update']).default('update'),
  note: z.string().max(500).optional(),
  customerName: z.string().trim().min(2).max(120).optional(),
  customerEmail: z.string().trim().email().optional(),
  customerPhone: z.string().trim().max(40).nullable().optional(),
  customerCountry: z.string().trim().max(40).nullable().optional(),
  customerDocument: z.string().trim().max(40).nullable().optional(),
  customerBirthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  customerComments: z.string().trim().max(500).nullable().optional(),
  passengerDetails: z.array(travelerSchema).max(49).optional(),
  attachments: z
    .array(z.object({ url: z.string().url(), name: z.string().max(200).optional(), type: z.string().max(50).optional(), key: z.string().optional() }))
    .max(20)
    .optional(),
});

/**
 * Editar datos del pasajero o cancelar una venta manual propia.
 * Las ventas online (MercadoPago / WeTravel) son de solo lectura.
 */
export async function PATCH(request: Request) {
  const ctx = await guardVendor(request);
  if (ctx instanceof NextResponse) return ctx;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.errors.map((e) => e.message).join(', '), 400);
  const body = parsed.data;

  const owned = await loadOwned(ctx, body.reservationId);
  if (!owned) return fail('Reserva no encontrada', 404);
  const { ref, data } = owned;

  if (!isManualReservation(data)) {
    return fail('Las ventas online son de solo lectura. Contactá al equipo si necesitás un cambio.', 403);
  }
  if (data.status !== 'pending' && data.status !== 'reserved') {
    return fail('Solo se pueden modificar ventas pendientes o reservadas.', 409);
  }

  try {
    if (body.action === 'cancel') {
      const inner = new Request(request.url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: body.reservationId,
          status: 'cancelled',
          note: body.note?.trim() || 'Cancelada por el vendedor',
        }),
      });
      return patchReservaCore(inner, actorOf(ctx));
    }

    const people = Number(data.people) || 1;
    if (body.passengerDetails && body.passengerDetails.length !== Math.max(0, people - 1)) {
      return fail('La cantidad de pasajeros no coincide con la reserva.', 400);
    }

    const now = Timestamp.now();
    const updates: Record<string, any> = { updatedAt: now };
    if (body.customerName !== undefined) {
      updates.customerName = body.customerName;
      updates.customerNameLower = body.customerName.toLowerCase();
    }
    if (body.customerEmail !== undefined) {
      updates.customerEmail = body.customerEmail;
      updates.customerEmailLower = normalizeEmail(body.customerEmail);
    }
    if (body.customerPhone !== undefined) {
      updates.customerPhone = body.customerPhone || null;
      updates.customerPhoneNormalized = normalizeDigits(body.customerPhone);
    }
    if (body.customerDocument !== undefined) {
      updates.customerDocument = body.customerDocument || null;
      updates.customerDocumentNormalized = normalizeDigits(body.customerDocument);
    }
    if (body.customerCountry !== undefined) updates.customerCountry = body.customerCountry || null;
    if (body.customerBirthDate !== undefined) updates.customerBirthDate = body.customerBirthDate;
    if (body.customerComments !== undefined) updates.customerComments = body.customerComments || null;
    if (body.passengerDetails) updates.passengerDetails = body.passengerDetails;
    if (body.attachments?.length) {
      updates.attachments = FieldValue.arrayUnion(
        ...body.attachments.map((a) => ({ id: randomUUID(), ...a, uploadedBy: 'vendor', createdAt: now }))
      );
    }
    updates.statusHistory = FieldValue.arrayUnion({
      status: data.status,
      actor: 'vendor',
      note: body.note?.trim() || 'Datos actualizados por el vendedor',
      createdAt: now,
    });

    await ref.update(updates);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'No se pudo actualizar la reserva', 500);
  }
}
