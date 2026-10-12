import { NextResponse } from 'next/server';
import { requireAdminToken } from '@/lib/adminAuth';
import { createReservaCore, patchReservaCore, type ReservaActorContext } from '@/lib/admin/reservas-core';

export const runtime = 'nodejs';

async function adminContext(request: Request): Promise<ReservaActorContext | NextResponse> {
  try {
    const user = await requireAdminToken(request);
    return { email: String(user?.email ?? 'admin'), role: 'admin' };
  } catch (error) {
    console.error('[admin/reservas] Token inválido', error);
    return NextResponse.json({ error: 'Autenticación inválida' }, { status: 401 });
  }
}

export async function POST(request: Request) {
  const ctx = await adminContext(request);
  if (ctx instanceof NextResponse) return ctx;
  return createReservaCore(request, ctx);
}

export async function PATCH(request: Request) {
  const ctx = await adminContext(request);
  if (ctx instanceof NextResponse) return ctx;
  return patchReservaCore(request, ctx);
}
