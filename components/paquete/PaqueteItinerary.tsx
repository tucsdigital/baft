import { sanitizePackageRichHtml } from '@/lib/packages/rich-text-sanitize';
import type { PaqueteItineraryStep } from '@/types';

type Props = {
  steps?: PaqueteItineraryStep[] | null;
  html?: string | null;
  visible?: boolean | null;
};

export default function PaqueteItinerary({ steps, html, visible }: Props) {
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
        <h3 className="text-xl font-extrabold tracking-[-0.02em] text-[#0B2240]">Itinerario</h3>
        <p className="mt-1 text-sm text-[#5A7898]">Consultá el programa completo de la excursión antes de reservar.</p>
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
