import { LANDING_PLATFORMS } from "@/lib/platforms";

export function PlatformsSection() {
  return (
    <section id="platforms" className="border-y bg-muted/40 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Every platform, one dashboard</h2>
          <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
            Connect organic social channels and ad accounts. Post unlimited content and schedule unlimited posts
            across all of them from a single workspace.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {LANDING_PLATFORMS.map((platform) => (
            <div
              key={platform.id}
              className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm font-medium shadow-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold uppercase text-primary">
                {platform.label.slice(0, 2)}
              </span>
              <span className="truncate">{platform.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
