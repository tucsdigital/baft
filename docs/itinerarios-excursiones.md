# Itinerarios de excursiones

Código completo de la sección de itinerarios de las excursiones (colección Firestore `paquetes`), para replicarla en otro proyecto.

Flujo: `ItineraryStepsEditor` (admin) → `packageAdminFormSchema` (Zod) → `buildPackageAdminPayload` (sanitiza y guarda en Firestore) → `app/excursion/[slug]/page.tsx` (lee, normaliza y traduce) → `PaqueteItinerary` (render público).

## Dependencias npm

```json
{
  "@hookform/resolvers": "^3.9.1",
  "@tiptap/extension-image": "^3.15.3",
  "@tiptap/extension-link": "^3.10.5",
  "@tiptap/extension-placeholder": "^3.10.5",
  "@tiptap/extension-text-align": "^3.10.5",
  "@tiptap/extension-underline": "^3.10.5",
  "@tiptap/extension-youtube": "^3.15.3",
  "@tiptap/react": "^3.10.5",
  "@tiptap/starter-kit": "^3.10.5",
  "firebase": "^11.1.0",
  "firebase-admin": "^12.6.0",
  "lucide-react": "^0.469.0",
  "next": "^16.1.2",
  "next-intl": "^4.14.8",
  "react-hook-form": "^7.54.2",
  "sanitize-html": "^2.17.6",
  "zod": "^3.24.1"
}
```

Dev: `@types/sanitize-html`. Variables de entorno opcionales (traducción): `DEEPL_API_KEY`, `DEEPL_API_URL`.

Componentes UI usados (shadcn): `Button`, `Input`, `Label`, `Switch`.

---

## 1. Tipos — `types/index.ts`

```ts
export type PaqueteItineraryStep = {
  id: string;
  titulo?: string;
  descripcion?: string;
};

export interface Paquete {
  // ...resto de campos
  itinerario?: string;                      // HTML legacy generado a partir de los pasos
  itinerarioSteps?: PaqueteItineraryStep[]; // fuente de verdad
  mostrarItinerario?: boolean;              // visibilidad pública
  // ...
}
```

---

## 2. Validación de rich text — `lib/packages/rich-text-validation.ts`

```ts
function normalizeHtml(value: string | undefined | null) {
  return String(value ?? '').trim();
}

export function extractPlainTextFromRichText(value: string | undefined | null) {
  return normalizeHtml(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h1|h2|h3|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getRichTextPlainLength(value: string | undefined | null) {
  return extractPlainTextFromRichText(value).length;
}

export function hasMeaningfulRichText(value: string | undefined | null) {
  return getRichTextPlainLength(value) > 0;
}

export function normalizeRichTextContent(value: string | undefined | null) {
  return normalizeHtml(value);
}
```

---

## 3. Sanitización HTML — `lib/packages/rich-text-sanitize.ts`

```ts
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'a',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'hr',
  'code',
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    p: ['style'],
    h1: ['style'],
    h2: ['style'],
    h3: ['style'],
    blockquote: ['style'],
  },
  allowedStyles: {
    p: {
      'text-align': [/^(left|center|right)$/],
    },
    h1: {
      'text-align': [/^(left|center|right)$/],
    },
    h2: {
      'text-align': [/^(left|center|right)$/],
    },
    h3: {
      'text-align': [/^(left|center|right)$/],
    },
    blockquote: {
      'text-align': [/^(left|center|right)$/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href'],
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (tagName, attribs) => {
      const href = String(attribs.href ?? '').trim();
      const safeHref =
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
          ? href
          : '';

      return {
        tagName,
        attribs: safeHref
          ? {
              href: safeHref,
              target: '_blank',
              rel: 'noopener noreferrer nofollow',
            }
          : ({} as sanitizeHtml.Attributes),
      };
    },
  },
};

export function sanitizePackageRichHtml(value: string | undefined | null) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';
  return sanitizeHtml(normalized, SANITIZE_OPTIONS).trim();
}
```

---

## 4. Esquema, defaults y payload — `lib/packages/admin-form.ts` (partes de itinerario)

Imports necesarios:

```ts
import * as z from 'zod';
import {
  extractPlainTextFromRichText,
  hasMeaningfulRichText,
  normalizeRichTextContent,
} from '@/lib/packages/rich-text-validation';
import { sanitizePackageRichHtml } from '@/lib/packages/rich-text-sanitize';
```

Tipo y esquema del paso:

```ts
export type ItineraryStepFormItem = {
  id: string;
  titulo: string;
  descripcion: string;
};

const itineraryStepSchema = z.object({
  id: z.string().min(1, 'Falta el identificador del paso'),
  titulo: z
    .string()
    .max(120, 'El titulo del paso es demasiado largo')
    .optional()
    .or(z.literal(''))
    .transform((val) => String(val ?? '').trim()),
  descripcion: z
    .string()
    .max(100000, 'La descripcion del paso es demasiado larga')
    .optional()
    .or(z.literal(''))
    .transform((val) => normalizeRichTextContent(val)),
});
```

Campos dentro de `packageAdminFormSchema = z.object({ ... })`:

```ts
  mostrarItinerario: z.boolean().transform((val) => Boolean(val)),
  itinerarioSteps: z.array(itineraryStepSchema).max(60, 'El itinerario tiene demasiados pasos').optional().default([]),
```

Validación cruzada dentro del `.superRefine((data, ctx) => { ... })` del esquema:

```ts
  const itinerarioLength = (data.itinerarioSteps ?? []).reduce(
    (acc, step) => acc + extractPlainTextFromRichText(step.descripcion).length,
    0
  );

  if (itinerarioLength > 20000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['itinerarioSteps'],
      message: 'El itinerario no puede exceder 20000 caracteres de contenido',
    });
  }

  const hasAnyStep = Array.isArray(data.itinerarioSteps) && data.itinerarioSteps.length > 0;
  const hasMeaningfulSteps = (data.itinerarioSteps ?? []).some((step) => hasMeaningfulRichText(step.descripcion) || Boolean(step.titulo?.trim()));

  if (data.mostrarItinerario && (!hasAnyStep || !hasMeaningfulSteps)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['itinerarioSteps'],
      message: 'Debes cargar al menos un paso del itinerario si la visualizacion publica esta activada',
    });
  }
```

Tipo inferido y valores por defecto:

```ts
export type PackageAdminFormData = z.infer<typeof packageAdminFormSchema>;

export const packageAdminDefaultValues: PackageAdminFormData = {
  // ...
  itinerarioSteps: [],
  mostrarItinerario: false,
  // ...
};
```

Generación del payload (dentro de `buildPackageAdminPayload`, antes del `return`):

```ts
  const itinerarioSteps = (data.itinerarioSteps ?? [])
    .map((step) => ({
      id: String(step.id ?? '').trim(),
      titulo: String(step.titulo ?? '').trim(),
      descripcion: sanitizePackageRichHtml(step.descripcion),
    }))
    .filter((step) => Boolean(step.id) && (Boolean(step.titulo) || hasMeaningfulRichText(step.descripcion)));

  const itinerarioLegacyHtml = itinerarioSteps
    .map((step) => {
      const safeTitle = sanitizePackageRichHtml(step.titulo ? `<h3>${step.titulo}</h3>` : '');
      return `${safeTitle}${step.descripcion}`;
    })
    .join('<hr />');
```

Y dentro del objeto retornado:

```ts
    itinerario: itinerarioLegacyHtml,
    itinerarioSteps,
    mostrarItinerario: Boolean(data.mostrarItinerario),
```

---

## 5. Editor de pasos — `components/admin/ItineraryStepsEditor.tsx`

```tsx
'use client';

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ItineraryStepFormItem } from '@/lib/packages/admin-form';

function createStepId() {
  return `step-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type Props = {
  steps: ItineraryStepFormItem[];
  onChange: (steps: ItineraryStepFormItem[]) => void;
  disabled?: boolean;
};

export default function ItineraryStepsEditor({ steps, onChange, disabled }: Props) {
  const items = Array.isArray(steps) ? steps : [];

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [picked] = next.splice(from, 1);
    next.splice(to, 0, picked);
    onChange(next);
  };

  const updateStep = (index: number, patch: Partial<ItineraryStepFormItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeStep = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addStep = () => {
    onChange([
      ...items,
      {
        id: createStepId(),
        titulo: '',
        descripcion: '',
      },
    ]);
  };

  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((step, index) => (
            <div key={step.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-gray-900 px-2 text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">Paso</div>
                  </div>

                  <div>
                    <Label className="text-sm">Título (opcional)</Label>
                    <Input
                      value={step.titulo}
                      onChange={(event) => updateStep(index, { titulo: event.target.value })}
                      placeholder="Ej: Día 1 · Llegada"
                      className="mt-1.5"
                      disabled={disabled}
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Descripción</Label>
                    <div className="mt-1.5">
                      <RichTextEditor
                        content={step.descripcion || ''}
                        onChange={(html) => updateStep(index, { descripcion: html })}
                        placeholder="Detalle del paso..."
                        enableMedia={false}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveStep(index, index - 1)}
                    disabled={disabled || index === 0}
                    aria-label="Subir paso"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveStep(index, index + 1)}
                    disabled={disabled || index === items.length - 1}
                    aria-label="Bajar paso"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeStep(index)}
                    disabled={disabled}
                    aria-label="Eliminar paso"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
          <div className="text-sm font-semibold text-gray-900">Todavía no hay pasos cargados</div>
          <div className="mt-1 text-xs text-gray-500">Agregá el primer paso para armar el itinerario.</div>
        </div>
      )}

      <Button type="button" variant="outline" onClick={addStep} disabled={disabled} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Agregar paso
      </Button>
    </div>
  );
}
```

---

## 6. Editor rich text — `components/admin/RichTextEditor.tsx`

```tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  Strikethrough,
  List, 
  ListOrdered, 
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Minus,
  WrapText,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo
} from 'lucide-react';
import TextAlign from '@tiptap/extension-text-align';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  enableMedia?: boolean;
}

export default function RichTextEditor({ content, onChange, placeholder, enableMedia = true }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      ...(enableMedia
        ? [
            Image.configure({
              inline: false,
              allowBase64: false,
              HTMLAttributes: {
                class: 'rounded-2xl shadow-sm',
              },
            }),
            Youtube.configure({
              width: 720,
              height: 405,
              controls: true,
              HTMLAttributes: {
                class: 'rounded-2xl overflow-hidden',
              },
            }),
          ]
        : []),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Escribe aquí...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm md:prose-base max-w-none focus:outline-none min-h-[200px] md:min-h-[250px] px-3 md:px-4 py-3',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL:', previousUrl);
    
    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = () => {
    if (!enableMedia) return;
    const url = window.prompt('URL de imagen:');
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  const addYoutube = () => {
    if (!enableMedia) return;
    const url = window.prompt('URL de YouTube:');
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url });
  };

  const ToolbarButton = ({ 
    onClick, 
    isActive, 
    disabled, 
    title, 
    icon: Icon 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    disabled?: boolean; 
    title: string; 
    icon: typeof Bold;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-2 md:p-2.5 rounded-lg hover:bg-gray-200 transition-colors ${
        isActive ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'text-gray-700'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Toolbar */}
      <div className="border-b bg-gray-50 px-2 py-2 flex flex-wrap gap-1 overflow-x-auto">
        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Título 1"
          icon={Heading1}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Título 2"
          icon={Heading2}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Título 3"
          icon={Heading3}
        />

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Negrita (Ctrl+B)"
          icon={Bold}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Cursiva (Ctrl+I)"
          icon={Italic}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Subrayado (Ctrl+U)"
          icon={UnderlineIcon}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Tachado"
          icon={Strikethrough}
        />

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* Text alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Alinear izquierda"
          icon={AlignLeft}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Alinear centro"
          icon={AlignCenter}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Alinear derecha"
          icon={AlignRight}
        />

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Lista con viñetas"
          icon={List}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Lista numerada"
          icon={ListOrdered}
        />

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* Block formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Cita"
          icon={Quote}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Código inline"
          icon={Code}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Línea horizontal"
          icon={Minus}
        />

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* Link */}
        <ToolbarButton
          onClick={addLink}
          isActive={editor.isActive('link')}
          title="Agregar/Editar link"
          icon={LinkIcon}
        />

        {enableMedia ? (
          <>
            <ToolbarButton
              onClick={addImage}
              title="Insertar imagen"
              icon={ImageIcon}
            />
            <ToolbarButton
              onClick={addYoutube}
              title="Insertar video"
              icon={Video}
            />
          </>
        ) : null}

        {/* Line break */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHardBreak().run()}
          title="Salto de línea (Shift+Enter)"
          icon={WrapText}
        />

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* History */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Deshacer (Ctrl+Z)"
          icon={Undo}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rehacer (Ctrl+Y)"
          icon={Redo}
        />
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
```

---

## 7. Sección en el formulario — `components/admin/PackageForm.tsx`

Imports:

```tsx
import { Controller } from 'react-hook-form';
import ItineraryStepsEditor from '@/components/admin/ItineraryStepsEditor';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
```

El componente recibe `control`, `watch`, `setValue`, `errors` y `loading` como props, y define:

```tsx
const mostrarItinerario = watch('mostrarItinerario');
```

Bloque JSX (el `id` es el ancla usada por el feedback de errores):

```tsx
<div id="itinerario-section" className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
  <div className="flex items-start justify-between gap-4">
    <div className="space-y-1">
      <Label htmlFor="mostrarItinerario" className="text-base font-medium cursor-pointer">
        Mostrar itinerario en la ficha pública
      </Label>
      <p className="text-sm text-gray-500">
        Activá esta opción si querés que el usuario final vea el programa detallado de la excursión.
      </p>
    </div>
    <Switch
      id="mostrarItinerario"
      checked={Boolean(mostrarItinerario)}
      onCheckedChange={(checked) => setValue('mostrarItinerario', checked, { shouldValidate: true })}
    />
  </div>

  <div>
    <Label>
      Itinerario por pasos {mostrarItinerario ? <span className="text-red-500">*</span> : null}
    </Label>
    <div className="mt-2">
      <Controller
        name="itinerarioSteps"
        control={control}
        render={({ field }) => (
          <ItineraryStepsEditor steps={field.value || []} onChange={field.onChange} disabled={loading} />
        )}
      />
    </div>
    {errors.itinerarioSteps && <p className="text-base text-red-500 mt-2">{errors.itinerarioSteps.message as string}</p>}
  </div>
</div>
```

---

## 8. Páginas de admin

### Crear — `app/admin/paquetes/nuevo/page.tsx`

```tsx
const { ... } = useForm<PackageAdminFormData>({
  resolver: zodResolver(packageAdminFormSchema),
  defaultValues: packageAdminDefaultValues,
});

// en onSubmit:
const sanitizedData = {
  slug,
  ...buildPackageAdminPayload({ data, categorias, /* ... */ extra: { orden: nuevoOrden, fechaCreacion: Timestamp.now() } }),
};

await addDoc(collection(db, 'paquetes'), sanitizedData);
```

### Editar — `app/admin/paquetes/[id]/page.tsx`

Carga del documento al formulario (con compatibilidad hacia atrás: si solo existe el HTML legacy `itinerario`, se convierte en un único paso):

```tsx
const docRef = doc(db, 'paquetes', id);
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
  const data = syncPackageCategoryData(docSnap.data() as Paquete, catData);
  // ...
  setValue('mostrarItinerario', Boolean(data.mostrarItinerario));
  setValue(
    'itinerarioSteps',
    Array.isArray((data as any).itinerarioSteps) && (data as any).itinerarioSteps.length > 0
      ? (data as any).itinerarioSteps
      : data.itinerario
        ? [{ id: `step-${Date.now()}`, titulo: '', descripcion: data.itinerario }]
        : []
  );
}
```

Guardado:

```tsx
const sanitizedData = {
  slug,
  ...buildPackageAdminPayload({ data, categorias, /* ... */ existingBookingConfig: currentPackage?.bookingConfig ?? null }),
};
// luego updateDoc(doc(db, 'paquetes', id), sanitizedData)
```

---

## 9. Feedback de errores — `lib/packages/admin-submit-feedback.ts`

```ts
const FIELD_TARGETS: Record<string, string> = {
  // ...
  itinerarioSteps: '#itinerario-section',
  // ...
};

const FIELD_LABELS: Record<string, string> = {
  // ...
  itinerarioSteps: 'Itinerario',
  // ...
};
```

---

## 10. Duplicar paquete — `lib/duplicatePaquete.ts`

```ts
const clonedItinerarioSteps = Array.isArray(original.itinerarioSteps)
  ? deepClone(original.itinerarioSteps)
  : original.itinerarioSteps;

const duplicatedData: PackageDocumentInput = {
  ...deepClone(original),
  // ...
  itinerarioSteps: clonedItinerarioSteps,
  // ...
};
```

---

## 11. Render público

### `components/paquete/PaqueteItinerary.tsx`

```tsx
import { sanitizePackageRichHtml } from '@/lib/packages/rich-text-sanitize';
import { useTranslations } from 'next-intl';
import type { PaqueteItineraryStep } from '@/types';

type Props = {
  steps?: PaqueteItineraryStep[] | null;
  html?: string | null;
  visible?: boolean | null;
};

export default function PaqueteItinerary({ steps, html, visible }: Props) {
  const p = useTranslations('excursionPage');
  const normalizedSteps = (Array.isArray(steps) ? steps : [])
    .map((step) => ({
      id: String(step?.id ?? '').trim(),
      titulo: String(step?.titulo ?? '').trim(),
      descripcion: sanitizePackageRichHtml(step?.descripcion),
    }))
    .filter((step) => Boolean(step.id) && (Boolean(step.titulo) || Boolean(step.descripcion)));

  const normalizedHtml = sanitizePackageRichHtml(html);
  if (!visible) return null;
  if (normalizedSteps.length === 0 && !normalizedHtml) return null;

  return (
    <section className="rounded-3xl border border-[#D4E6F7] bg-white p-5 shadow-[0_14px_34px_rgba(15,66,116,0.08)]">
      <div className="mb-4">
        <h3 className="text-xl font-extrabold tracking-[-0.02em] text-[#0B2240]">{p('itineraryTitle')}</h3>
        <p className="mt-1 text-sm text-[#5A7898]">{p('itineraryDescription')}</p>
      </div>

      {normalizedSteps.length > 0 ? (
        <div className="grid gap-3">
          {normalizedSteps.map((step, index) => (
            <div key={step.id} className="rounded-2xl border border-[#E0EEF9] bg-[#F8FBFF] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#0B2240] px-2 text-xs font-semibold text-white">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  {step.titulo ? (
                    <div className="text-sm font-extrabold text-[#0B2240]">{step.titulo}</div>
                  ) : null}
                  {step.descripcion ? (
                    <div
                      className="prose prose-sm mt-2 max-w-none text-[#415F7E] md:prose-base prose-headings:text-[#0B2240] prose-strong:text-[#17395E]"
                      dangerouslySetInnerHTML={{ __html: step.descripcion }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="prose prose-sm max-w-none text-[#415F7E] md:prose-base prose-headings:text-[#0B2240] prose-strong:text-[#17395E]"
          dangerouslySetInnerHTML={{ __html: normalizedHtml }}
        />
      )}
    </section>
  );
}
```

### `app/excursion/[slug]/page.tsx`

Lectura y normalización (se vuelve a sanitizar al leer):

```tsx
async function getPaquete(slug: string): Promise<Paquete | null> {
  if (!firebaseEnabled) return null;
  try {
    const paquete = await getPaqueteBySlug(slug);
    if (!paquete || !paquete.visible) return null;

    const descripcionHtml = sanitizePackageRichHtml(paquete.descripcionLarga || paquete.descripcion);
    const itinerarioHtml = sanitizePackageRichHtml(paquete.itinerario);
    const itinerarioSteps = Array.isArray((paquete as any).itinerarioSteps)
      ? (paquete as any).itinerarioSteps
        .map((step: any) => ({
          id: String(step?.id ?? '').trim(),
          titulo: String(step?.titulo ?? '').trim(),
          descripcion: sanitizePackageRichHtml(step?.descripcion),
        }))
        .filter((step: any) => Boolean(step.id) && (Boolean(step.titulo) || Boolean(step.descripcion)))
      : [];

    return {
      ...paquete,
      descripcion: descripcionHtml || '',
      descripcionLarga: descripcionHtml || '',
      itinerario: itinerarioHtml || '',
      itinerarioSteps,
      // ...
    };
  } catch (error) {
    console.error('Error fetching paquete:', error);
    return null;
  }
}
```

Uso (después de localizar el paquete con `localizePaquete(paqueteBase, locale)`):

```tsx
import PaqueteItinerary from '@/components/paquete/PaqueteItinerary';

<PaqueteItinerary steps={paquete.itinerarioSteps} html={paquete.itinerario} visible={paquete.mostrarItinerario} />
```

---

## 12. Textos — `messages/es.json` y `messages/en.json`

Dentro del namespace `excursionPage`.

`messages/es.json`:

```json
"itineraryTitle": "Itinerario",
"itineraryDescription": "Consultá el programa completo de la excursión antes de reservar."
```

`messages/en.json`:

```json
"itineraryTitle": "Itinerary",
"itineraryDescription": "Check the full excursion program before booking."
```

---

## 13. Traducción automática (opcional, DeepL)

### `lib/i18n/cms-content.ts` (parte de itinerario)

```ts
import 'server-only';

import type { Paquete } from '@/types';
import { translatedField } from '@/lib/i18n/cms-translator';
import { sanitizePackageRichHtml } from '@/lib/packages/rich-text-sanitize';

export async function localizePaquete(paquete: Paquete, locale: 'es' | 'en'): Promise<Paquete> {
  if (locale === 'es') return paquete;
  const id = paquete.id || paquete.slug;

  const itinerario = await translatedField('paquetes', id, 'itinerario', paquete.itinerario, locale, true);

  const itinerarioSteps = await Promise.all((paquete.itinerarioSteps || []).map(async (step, index) => ({
    ...step,
    titulo: await translatedField('paquetes', id, `itinerarioSteps.${index}.titulo`, step.titulo, locale),
    descripcion: sanitizePackageRichHtml(await translatedField('paquetes', id, `itinerarioSteps.${index}.descripcion`, step.descripcion, locale, true)),
  })));

  return {
    ...paquete,
    itinerario,
    itinerarioSteps,
    // ...resto de campos traducidos
  };
}
```

### `lib/i18n/cms-translator.ts`

```ts
import 'server-only';

import { createHash } from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import { adminDb } from '@/lib/firebaseAdmin';
import { createDeepLQueue } from './deepl-queue';

const TRANSLATOR_VERSION = 'deepl-v1';
const CACHE_COLLECTION = 'translationCache';
const inFlight = new Map<string, Promise<string>>();
let transport: { key: string; url: string; translate: ReturnType<typeof createDeepLQueue> } | undefined;

type TranslationOptions = {
  collection: string;
  documentId: string;
  field: string;
  source: string;
  sourceLocale?: 'es';
  targetLocale: 'es' | 'en';
  html?: boolean;
};

function cacheId(options: TranslationOptions): string {
  const contentHash = createHash('sha256').update(options.source).digest('hex').slice(0, 32);
  return [options.collection, options.documentId, options.field, options.targetLocale, contentHash, TRANSLATOR_VERSION]
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, '_'))
    .join('__');
}

function deeplUrl(): string {
  return (process.env.DEEPL_API_URL || 'https://api-free.deepl.com').replace(/\/$/, '');
}

function cleanTranslatedHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: sanitizeHtml.defaults.allowedTags,
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

/**
 * Traduce contenido CMS únicamente en servidor. Un fallo de DeepL nunca bloquea
 * la página: siempre se devuelve el texto original como fallback.
 */
export async function translateCmsText(options: TranslationOptions): Promise<string> {
  const id = cacheId(options);
  const existing = inFlight.get(id);
  if (existing) return existing;
  const task = translateUncached(options);
  inFlight.set(id, task);
  try { return await task; }
  finally { inFlight.delete(id); }
}

async function translateUncached(options: TranslationOptions): Promise<string> {
  const source = options.source.trim();
  if (!source || options.targetLocale === (options.sourceLocale || 'es')) return options.source;

  const id = cacheId(options);
  try {
    if (adminDb) {
      const cached = await adminDb.collection(CACHE_COLLECTION).doc(id).get();
      const cachedValue = cached.exists ? cached.data()?.value : null;
      if (typeof cachedValue === 'string' && cachedValue.trim()) return cachedValue;
    }
  } catch (error) {
    console.warn('[i18n] No se pudo leer la cache de traducción:', error instanceof Error ? error.message : 'unknown');
  }

  const apiKey = process.env.DEEPL_API_KEY?.trim();
  if (!apiKey) return options.source;

  try {
    const url = deeplUrl();
    if (!transport || transport.key !== apiKey || transport.url !== url) {
      transport = { key: apiKey, url, translate: createDeepLQueue({ url, apiKey }) };
    }
    const translated = await transport.translate(options.source, options.html);
    const value = options.html ? cleanTranslatedHtml(translated) : translated;

    try {
      await adminDb?.collection(CACHE_COLLECTION).doc(id).set({
        value,
        collection: options.collection,
        documentId: options.documentId,
        field: options.field,
        locale: options.targetLocale,
        sourceHash: createHash('sha256').update(source).digest('hex'),
        translatorVersion: TRANSLATOR_VERSION,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.warn('[i18n] No se pudo guardar la cache de traducción:', error instanceof Error ? error.message : 'unknown');
    }
    return value;
  } catch (error) {
    console.warn('[i18n] Falló la traducción CMS; se usa español:', error instanceof Error ? error.message : 'unknown');
    return options.source;
  }
}

export function translatedField(
  collection: string,
  documentId: string,
  field: string,
  source: string | undefined,
  targetLocale: 'es' | 'en',
  html = false,
): Promise<string> {
  return translateCmsText({ collection, documentId, field, source: source || '', targetLocale, html });
}
```

### `lib/i18n/deepl-queue.ts`

```ts
type Job = { text: string; html: boolean; resolve: (text: string) => void; reject: (error: Error) => void };
type Options = {
  url: string;
  apiKey: string;
  fetcher?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

/** Server-side transport: bounded batches avoid one HTTP request per CMS field. */
export function createDeepLQueue({ url, apiKey, fetcher = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)) }: Options) {
  const pending: Job[] = [];
  let running = false;
  let scheduled = false;
  const bodyFor = (jobs: Job[]) => JSON.stringify({
    text: jobs.map(job => job.text), source_lang: 'ES', target_lang: 'EN-US',
    ...(jobs[0].html ? { tag_handling: 'html', split_sentences: 'nonewlines' } : {}),
  });

  async function send(jobs: Job[]): Promise<string[]> {
    for (let attempt = 0; ; attempt++) {
      const response = await fetcher(`${url}/v2/translate`, {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'content-type': 'application/json' },
        body: bodyFor(jobs), cache: 'no-store', signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        const transient = response.status === 429 || response.status >= 500;
        if (transient && attempt < 3) {
          const retry = response.headers.get('retry-after');
          const seconds = retry === null ? NaN : Number(retry);
          const requested = Number.isFinite(seconds) ? seconds * 1000 : retry ? Date.parse(retry) - Date.now() : 0;
          await response.body?.cancel();
          // Long provider cooldowns fall back instead of holding a render indefinitely.
          if (requested > 10000) throw new Error(`DeepL HTTP ${response.status}: cooldown`);
          await sleep(Math.max(500 * 2 ** attempt, Number.isFinite(requested) ? requested : 0));
          continue;
        }
        await response.body?.cancel();
        throw new Error(`DeepL HTTP ${response.status}`);
      }
      const payload = await response.json() as { translations?: { text?: string }[] };
      if (payload.translations?.length !== jobs.length || payload.translations.some(item => !item.text?.trim())) {
        throw new Error('DeepL: incomplete translation batch');
      }
      return payload.translations.map(item => item.text!.trim());
    }
  }

  async function drain() {
    scheduled = false;
    if (running) return;
    running = true;
    try {
      while (pending.length) {
        const jobs = [pending.shift()!];
        for (let index = 0; index < pending.length && jobs.length < 40;) {
          const candidate = pending[index];
          if (candidate.html !== jobs[0].html || Buffer.byteLength(bodyFor([...jobs, candidate]), 'utf8') > 96000) {
            index++;
          } else {
            jobs.push(...pending.splice(index, 1));
          }
        }
        try {
          if (Buffer.byteLength(bodyFor(jobs), 'utf8') > 128000) throw new Error('DeepL: text exceeds request limit');
          const translations = await send(jobs);
          jobs.forEach((job, index) => job.resolve(translations[index]));
        } catch (error) {
          // Do not retry uncertain network failures: the provider may already have billed them.
          const safeError = new Error(error instanceof Error && error.message.startsWith('DeepL') ? error.message : 'DeepL: network or timeout error');
          jobs.forEach(job => job.reject(safeError));
        }
      }
    } finally { running = false; }
  }

  return (text: string, html = false): Promise<string> => new Promise((resolve, reject) => {
    pending.push({ text, html, resolve, reject });
    if (!running && !scheduled) {
      scheduled = true;
      setTimeout(() => { void drain(); }, 25);
    }
  });
}
```

---

## 14. Checklist de migración

1. Instalar las dependencias npm y los componentes UI (`Button`, `Input`, `Label`, `Switch`).
2. Agregar los tipos de la sección 1.
3. Copiar `rich-text-validation.ts` y `rich-text-sanitize.ts`.
4. Agregar el esquema, los defaults y la generación de payload de `admin-form.ts` (sección 4).
5. Copiar `RichTextEditor.tsx` e `ItineraryStepsEditor.tsx`.
6. Insertar el bloque `#itinerario-section` en el formulario de admin y conectar `control`, `watch` y `setValue`.
7. En las páginas de crear y editar: `zodResolver(packageAdminFormSchema)`, `buildPackageAdminPayload` y la carga con compatibilidad legacy.
8. Mapear `itinerarioSteps` en `admin-submit-feedback.ts`.
9. Clonar `itinerarioSteps` al duplicar paquetes.
10. Copiar `PaqueteItinerary.tsx`, usarlo en la ficha pública y agregar las claves i18n.
11. Opcional: copiar `cms-content.ts`, `cms-translator.ts` y `deepl-queue.ts`, y configurar `DEEPL_API_KEY` y `firebase-admin`.

## 15. Notas

- La fuente de verdad es `itinerarioSteps`. `itinerario` (HTML) se regenera en cada guardado para retrocompatibilidad y funciona como fallback de render.
- El HTML se sanitiza en tres puntos: al guardar (`buildPackageAdminPayload`), al leer en la página y al renderizar (`PaqueteItinerary`). Se mantiene `dangerouslySetInnerHTML` solo porque el contenido ya pasó por `sanitize-html`.
- El editor de pasos usa `enableMedia={false}`: no permite imágenes ni videos, y la lista blanca de etiquetas tampoco los admite.
- Los límites son 60 pasos, 120 caracteres de título, 100.000 por descripción y 20.000 de texto plano en total.
- La clave de traducción de cada paso depende del índice (`itinerarioSteps.${index}.…`), por lo que reordenar pasos cambia la clave de caché. Además se usa un hash del contenido, así que se retraduce automáticamente.
- Si `mostrarItinerario` es `false` o no hay contenido, `PaqueteItinerary` no renderiza nada.
