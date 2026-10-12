'use client';

import VendorProtectedRoute from '@/components/vendor/VendorProtectedRoute';
import VendorLayout from '@/components/vendor/VendorLayout';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { fetchVendorReservations, type VendorReservationRow } from '@/lib/vendor-client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';

export default function VendorReservasPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reservas, setReservas] = useState<VendorReservationRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accrued' | 'paid' | 'cancelled'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'online'>('all');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchVendorReservations(user);
        if (!cancelled) setReservas(list);
      } catch (e: any) {
        if (!cancelled) toast.error(e.message || 'No se pudieron cargar las reservas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(() => {
    let list = reservas;
    if (statusFilter !== 'all') list = list.filter(r => r.referredBy?.payoutStatus === statusFilter);
    if (sourceFilter !== 'all') list = list.filter(r => r.source === sourceFilter);
    const t = search.trim().toLowerCase();
    if (t) {
      list = list.filter(r => `${r.customerName} ${r.experienceTitle} ${r.reservationCode ?? ''}`.toLowerCase().includes(t));
    }
    return list;
  }, [reservas, statusFilter, sourceFilter, search]);

  return (
    <VendorProtectedRoute>
      <VendorLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">Mis reservas referidas</h1>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Buscar..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Origen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="manual">Manuales</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Estado comisión" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="accrued">Devengada</SelectItem>
                  <SelectItem value="paid">Pagada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Reservas</CardTitle>
                <Button asChild size="sm" variant="success">
                  <a href="/vendedor/reservas/nueva">Crear reserva manual</a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="p-4 space-y-2">
                  <div className="grid grid-cols-6 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={`head-${i}`} className="h-4 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                  {Array.from({ length: 8 }).map((_, r) => (
                    <div key={`row-${r}`} className="grid grid-cols-6 gap-3">
                      {Array.from({ length: 6 }).map((__, c) => (
                        <div key={`cell-${r}-${c}`} className="h-4 bg-gray-200 rounded animate-pulse" />
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Fecha</th>
                        <th className="px-4 py-3 text-left font-medium">Paquete</th>
                        <th className="px-4 py-3 text-left font-medium">Cliente</th>
                        <th className="px-4 py-3 text-left font-medium">Origen</th>
                        <th className="px-4 py-3 text-left font-medium">Venta</th>
                        <th className="px-4 py-3 text-left font-medium">Comisión</th>
                        <th className="px-4 py-3 text-left font-medium">Estado</th>
                        <th className="px-4 py-3 text-left font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">No hay reservas asociadas.</td></tr>
                      )}
                      {filtered.map(r => (
                        <tr key={r.id} className="border-t border-gray-100">
                          <td className="px-4 py-3">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</td>
                          <td className="px-4 py-3">{r.experienceTitle}</td>
                          <td className="px-4 py-3">{r.customerName}</td>
                          <td className="px-4 py-3"><Badge variant="outline">{r.source === 'manual' ? 'Manual' : 'Online'}</Badge></td>
                          <td className="px-4 py-3">{(r.amountTotal/100).toLocaleString()} {r.currency?.toUpperCase?.()}</td>
                          <td className="px-4 py-3">{(r.referredBy.commissionAmount/100).toLocaleString()} {r.referredBy.commissionCurrency?.toUpperCase?.() ?? ''}</td>
                          <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{r.referredBy.payoutStatus}</Badge></td>
                          <td className="px-4 py-3">
                            <a href={`/vendedor/reservas/${r.id}`} className="text-primary text-sm hover:underline">Editar</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </VendorLayout>
    </VendorProtectedRoute>
  );
}
