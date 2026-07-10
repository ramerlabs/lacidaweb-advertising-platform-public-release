import type { PublisherAdTemplate } from "@/lib/publisher-ad-templates";

export function AdTemplatePreview({
  template,
  compact,
}: {
  template: PublisherAdTemplate;
  compact?: boolean;
}) {
  const { sample, format, width, height } = template;
  const isText = template.category === "text";

  if (format === "TEXT_INLINE") {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 p-4">
        <p className="text-sm text-zinc-400">
          Sponsored ·{" "}
          <span className="font-medium text-cyan-400 underline decoration-cyan-500/50">
            {sample.headline.replace(/^Sponsored ·\s*/i, "")}
          </span>
        </p>
      </div>
    );
  }

  if (format === "TEXT_BOX" || format === "TEXT") {
    const headlines = [
      sample.headline,
      "Grow with lacidaweb",
      "Advertise with us",
      "Reach more customers",
    ];
    const bodies = [
      sample.primaryText,
      "Self-serve campaigns with wallet billing and fast review.",
      "Reach customers across the network. Visit lacidaweb.com",
      "Compact sponsored units that fit neatly in your content.",
    ];
    return (
      <div className="w-full space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {headlines.map((headline, i) => (
            <div
              key={i}
              className="rounded-md border border-emerald-500/30 bg-zinc-900/80 p-2.5"
            >
              <p className="text-[8px] font-semibold uppercase tracking-wider text-zinc-500">
                Sponsored
              </p>
              <p className="mt-1 text-xs font-semibold leading-snug text-zinc-100 line-clamp-2">
                {headline}
              </p>
              {bodies[i] ? (
                <p className="mt-1 text-[10px] leading-snug text-zinc-400 line-clamp-2">
                  {bodies[i]}
                </p>
              ) : null}
              <span className="mt-2 inline-block text-[10px] font-medium text-emerald-400">
                {sample.ctaLabel} →
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-500">4 compact text box ads · Ads by lacidaweb</p>
      </div>
    );
  }

  const maxW = compact ? Math.min(width, 280) : Math.min(width, 320);
  const scale = maxW / width;
  const previewH = Math.max(50, Math.round(height * scale));

  return (
    <div
      className="overflow-hidden rounded-lg border border-zinc-700 bg-white"
      style={{ width: maxW, minHeight: previewH }}
    >
      <div
        className="flex h-full flex-col bg-gradient-to-br from-cyan-500/20 to-emerald-500/20"
        style={{ minHeight: previewH }}
      >
        {!isText && (
          <div
            className="w-full shrink-0 bg-gradient-to-br from-cyan-500 to-emerald-500"
            style={{ height: Math.max(40, previewH * 0.45) }}
          />
        )}
        <div className="flex flex-1 flex-col justify-center p-3">
          <p className="text-xs font-bold text-zinc-900 line-clamp-1">{sample.headline}</p>
          {!compact && sample.primaryText ? (
            <p className="mt-1 text-[10px] text-zinc-600 line-clamp-2">{sample.primaryText}</p>
          ) : null}
          <span className="mt-2 inline-block w-fit rounded bg-cyan-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            {sample.ctaLabel}
          </span>
        </div>
      </div>
      <p className="bg-zinc-100 px-2 py-0.5 text-[9px] text-zinc-400">
        {width}×{height} · Ads by lacidaweb
      </p>
    </div>
  );
}
