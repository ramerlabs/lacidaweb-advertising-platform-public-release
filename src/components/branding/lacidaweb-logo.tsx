import { cn } from "@/lib/utils";

type LacidawebLogoProps = {
  className?: string;
  height?: number;
  variant?: "default" | "on-dark";
};

export function LacidawebLogo({
  className,
  height = 32,
  variant = "default",
}: LacidawebLogoProps) {
  const markSize = Math.round(height * 0.92);
  const fontSize = Math.round(height * 0.52);

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} style={{ height }}>
      <LacidawebLogoMark size={markSize} />
      <span
        className={cn(
          "font-bold leading-none tracking-tight",
          variant === "on-dark" ? "text-zinc-50" : "text-zinc-900 dark:text-zinc-50",
        )}
        style={{ fontSize }}
      >
        lacidaweb
      </span>
    </span>
  );
}

export function LacidawebLogoMark({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-hidden
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient id="lw-mark-only" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#06B6D4" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#lw-mark-only)" />
      <path
        d="M12 28V12h5.2c3.8 0 6.2 2 6.2 5.4 0 2.4-1.3 4.1-3.5 4.8L25 28h-3.8l-4.6-2.3V28H12zm3.8-6.4h1c1.6 0 2.4-.7 2.4-1.8 0-1.1-.8-1.8-2.4-1.8h-1v3.6z"
        fill="#fff"
      />
    </svg>
  );
}
