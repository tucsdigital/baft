'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { FormattedAmountInput } from '@/components/ui/formatted-amount-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  MAX_PACKAGE_ADDONS,
  createEmptyAddon,
  type AddonFormItem,
} from '@/lib/packages/package-addons';

type Props = {
  items: AddonFormItem[];
  onItemsChange: (items: AddonFormItem[]) => void;
  disabled?: boolean;
};

function formatPricePreview(price: number) {
  return `$${(Math.max(0, Number(price) || 0)).toLocaleString('es-AR')}`;
}

export default function AddonsManager({ items, onItemsChange, disabled }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const patchItem = (id: string, patch: Partial<AddonFormItem>) => {
    onItemsChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    onItemsChange(next);
  };

  const handleImageFile = async (id: string, file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploadingId(id);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
        reader.readAsDataURL(file);
      });
      patchItem(id, { image: dataUrl, imageKey: null });
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        El precio de cada adicional se cobra una sola vez por reserva.
      </p>

      <div className="space-y-3">
        {items.map((item, index) => {
          const expanded = expandedId === item.id;
          const uploading = uploadingId === item.id;
          return (
            <div
              key={item.id}
              className={`rounded-xl border bg-white transition ${
                item.enabled ? 'border-gray-200' : 'border-gray-200 bg-gray-50 opacity-80'
              }`}
            >
              <div className="flex items-center gap-3 p-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  aria-expanded={expanded}
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                    {item.image ? (
                      <Image src={item.image} alt={item.title || `Adicional ${index + 1}`} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-gray-900">
                      {item.title.trim() || `Adicional ${index + 1} (sin título)`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatPricePreview(item.price)} · {item.enabled ? 'Visible' : 'Oculto'}
                    </div>
                  </div>
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                  )}
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveItem(index, -1)}
                    disabled={disabled || index === 0}
                    aria-label="Subir"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveItem(index, 1)}
                    disabled={disabled || index === items.length - 1}
                    aria-label="Bajar"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => onItemsChange(items.filter((row) => row.id !== item.id))}
                    disabled={disabled}
                    aria-label="Eliminar adicional"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {expanded ? (
                <CardContent className="space-y-4 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                    <div>
                      <Label className="text-sm font-semibold">Visible en el modal</Label>
                      <p className="text-xs text-gray-500">Apagalo para ocultarlo sin borrarlo.</p>
                    </div>
                    <Switch
                      checked={item.enabled}
                      onCheckedChange={(checked) => patchItem(item.id, { enabled: checked })}
                      disabled={disabled}
                      aria-label={`Visible: ${item.title || 'adicional'}`}
                    />
                  </div>

                  <div>
                    <Label className="text-sm">
                      Título <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={item.title}
                      onChange={(event) => patchItem(item.id, { title: event.target.value })}
                      placeholder="Ej: Almuerzo en el refugio"
                      maxLength={80}
                      className="mt-1.5"
                      disabled={disabled}
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Descripción</Label>
                    <Textarea
                      value={item.description}
                      onChange={(event) => patchItem(item.id, { description: event.target.value })}
                      placeholder="Ej: Menú patagónico con bebida incluida, servido al mediodía."
                      maxLength={400}
                      className="mt-1.5 min-h-[80px]"
                      disabled={disabled}
                    />
                    <p className="mt-1 text-right text-xs text-gray-400">{item.description.length}/400</p>
                  </div>

                  <div>
                    <Label className="text-sm">
                      Precio (por reserva) <span className="text-red-500">*</span>
                    </Label>
                    <FormattedAmountInput
                      value={Number(item.price) || 0}
                      onChange={(value) => patchItem(item.id, { price: Math.max(0, Math.floor(Number(value) || 0)) })}
                      placeholder="0"
                      className="mt-1.5 max-w-xs"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Se cobra una sola vez por reserva, no por persona. En la moneda del paquete.
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm">Imagen de tarjeta</Label>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                        {item.image ? (
                          <Image src={item.image} alt={item.title || 'Adicional'} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400">
                            <ImagePlus className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                          {item.image ? 'Cambiar imagen' : 'Subir imagen'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={disabled || uploading}
                            onChange={(event) => {
                              void handleImageFile(item.id, event.target.files?.[0]);
                              event.target.value = '';
                            }}
                          />
                        </label>
                        {item.image ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => patchItem(item.id, { image: '', imageKey: null })}
                            disabled={disabled}
                          >
                            <X className="mr-1 h-3.5 w-3.5" />
                            Quitar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Recomendado: 800x600 px. Se sube al guardar la excursión.</p>
                  </div>
                </CardContent>
              ) : null}
            </div>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
          <p className="text-sm font-medium text-gray-700">Sin adicionales</p>
          <p className="mt-1 text-xs text-gray-500">
            Agregá el primero para vender más que la excursión: traslados, comidas, fotos, seguros, etc.
          </p>
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const next = createEmptyAddon();
          onItemsChange([...items, next]);
          setExpandedId(next.id);
        }}
        disabled={disabled || items.length >= MAX_PACKAGE_ADDONS}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Agregar adicional {items.length > 0 ? `(${items.length}/${MAX_PACKAGE_ADDONS})` : ''}
      </Button>
    </div>
  );
}
