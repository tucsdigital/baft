type Props = {
  title: string;
  embedUrl?: string | null;
};

export default function PaqueteGoogleMap({ title, embedUrl }: Props) {
  const normalizedUrl = String(embedUrl ?? '').trim();
  if (!normalizedUrl) return null;

  return (
    <section className="rounded-3xl border border-[#D4E6F7] bg-white p-5 shadow-[0_14px_34px_rgba(15,66,116,0.08)]">
      <div className="mb-4">
        <h3 className="text-xl font-extrabold tracking-[-0.02em] text-[#0B2240]">Ubicación</h3>
        <p className="mt-1 text-sm text-[#5A7898]">Explorá el punto de encuentro o la zona de la experiencia directamente en el mapa.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#D8E9F8] bg-[#F8FBFF]">
        <div className="relative aspect-[4/3] w-full md:aspect-[16/7]">
          <iframe
            src={normalizedUrl}
            title={`Mapa de ${title}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
    </section>
  );
}
