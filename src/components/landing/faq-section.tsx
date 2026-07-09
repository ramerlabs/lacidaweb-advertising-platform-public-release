type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export function FaqSection({
  faqs,
  variant = "light",
}: {
  faqs: FaqItem[];
  variant?: "light" | "dark";
}) {
  if (faqs.length === 0) return null;

  const isDark = variant === "dark";

  return (
    <section
      id="faq"
      className={isDark ? "border-t border-zinc-800 py-20" : "border-t bg-muted/40 py-16"}
    >
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-10 text-center">
          <h2
            className={`text-3xl font-bold tracking-tight ${isDark ? "text-white" : "text-foreground"}`}
          >
            Frequently asked questions
          </h2>
          <p className={`mt-2 ${isDark ? "text-zinc-400" : "text-muted-foreground"}`}>
            {isDark
              ? "Quick answers about campaigns, wallet payments, and support."
              : "Quick answers about plans, publishing, and support."}
          </p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.id}
              className={
                isDark
                  ? "group rounded-xl border border-zinc-700 bg-zinc-900/80 px-5 py-4 open:border-cyan-500/40 open:bg-zinc-900"
                  : "group rounded-xl border bg-card px-5 py-4 shadow-sm open:shadow-md"
              }
            >
              <summary
                className={`cursor-pointer list-none font-medium marker:hidden [&::-webkit-details-marker]:hidden ${
                  isDark ? "text-zinc-100" : "text-foreground"
                }`}
              >
                <span className="flex items-center justify-between gap-4">
                  {faq.question}
                  <span
                    className={`shrink-0 text-lg leading-none transition-transform group-open:rotate-45 ${
                      isDark ? "text-cyan-400" : "text-primary"
                    }`}
                  >
                    +
                  </span>
                </span>
              </summary>
              <p
                className={`mt-3 text-sm leading-relaxed ${
                  isDark ? "text-zinc-400" : "text-muted-foreground"
                }`}
              >
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
