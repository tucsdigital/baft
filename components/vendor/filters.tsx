'use client';

import { useState } from 'react';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const pill =
  'h-9 rounded-full border-0 bg-white px-3.5 text-sm font-normal shadow-xs ring-1 ring-gray-200/60 transition-all hover:ring-gray-300 focus-visible:ring-2 focus-visible:ring-gray-300 data-[state=open]:ring-gray-300';
const pillActive = 'bg-gray-900/[0.04] ring-gray-300 text-gray-900';

export type FilterOption = { value: string; label: string; count?: number };

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = 'Todos',
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  allLabel?: string;
  className?: string;
}) {
  const active = value !== 'all';
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={cn(pill, 'w-auto min-w-[150px] gap-2', active && pillActive, className)}>
        <span className="text-gray-500">{label}:</span>
        <span className={cn('truncate', active ? 'font-medium text-gray-900' : 'text-gray-700')}>
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent className="rounded-xl border-gray-100 bg-white shadow-xl">
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
            {typeof o.count === 'number' && <span className="ml-1.5 text-gray-400">· {o.count}</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const fmt = (iso: string) => format(parseISO(iso), 'dd/MM/yyyy');
const toIso = (d: Date) => format(d, 'yyyy-MM-dd');

export function DateRangeFilter({
  label = 'Fecha',
  from,
  to,
  onChange,
  minDate,
  maxDate,
}: {
  label?: string;
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  /** Límites reales (yyyy-MM-dd) según los datos del vendedor. */
  minDate?: string;
  maxDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const active = Boolean(from || to);
  const selected: DateRange | undefined = from ? { from: parseISO(from), to: to ? parseISO(to) : undefined } : undefined;

  const text = !active ? 'Todas' : from && to ? `${fmt(from)} – ${fmt(to)}` : `${fmt(from)} – …`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn('inline-flex items-center', pill, 'p-0', active && pillActive)}>
        <PopoverTrigger asChild>
          <button type="button" className="flex h-9 items-center gap-2 rounded-full pl-3.5 pr-3 text-sm outline-none" aria-label={`Filtrar por ${label.toLowerCase()}`}>
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">{label}:</span>
            <span className={cn(active ? 'font-medium text-gray-900' : 'text-gray-700')}>{text}</span>
            {!active && <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
        </PopoverTrigger>
        {active && (
          <button
            type="button"
            aria-label="Quitar filtro de fecha"
            className="mr-2 rounded-full p-1 text-gray-400 hover:bg-gray-200/60 hover:text-gray-700"
            onClick={() => onChange({ from: '', to: '' })}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)]">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={selected}
          defaultMonth={selected?.from ?? (maxDate ? parseISO(maxDate) : undefined)}
          startMonth={minDate ? parseISO(minDate) : undefined}
          endMonth={maxDate ? parseISO(maxDate) : undefined}
          disabled={[...(minDate ? [{ before: parseISO(minDate) }] : []), ...(maxDate ? [{ after: parseISO(maxDate) }] : [])]}
          onSelect={(range) => onChange({ from: range?.from ? toIso(range.from) : '', to: range?.to ? toIso(range.to) : '' })}
        />
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-2.5">
          <p className="text-xs text-gray-500">{active ? text : 'Elegí el primer y el último día'}</p>
          <div className="flex items-center gap-2">
            {active && (
              <button type="button" className="text-xs font-medium text-gray-500 hover:text-gray-800" onClick={() => onChange({ from: '', to: '' })}>
                Limpiar
              </button>
            )}
            <button type="button" className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-800" onClick={() => setOpen(false)}>
              Listo
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
