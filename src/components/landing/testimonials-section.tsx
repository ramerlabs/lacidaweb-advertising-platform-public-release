import { BadgeCheck } from "lucide-react";
import { TESTIMONIALS } from "@/lib/testimonials";

export function TestimonialsSection() {
  return (
    <section className="bg-muted/50 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Loved by teams who publish every day</h2>
          <p className="mt-3 text-muted-foreground">
            Agencies, founders, and creators use the platform to schedule, engage, and grow — without
            switching tools.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-sm"
            >
              <p className="font-mono text-sm leading-relaxed text-foreground/90">{item.quote}</p>
              <div className="mt-6 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                >
                  {item.initials}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className="truncate">{item.name}</span>
                    <BadgeCheck className="h-4 w-4 shrink-0 text-red-500" aria-label="Verified" />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{item.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
