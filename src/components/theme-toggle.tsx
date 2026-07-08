"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className={cn("h-9 w-9", className)} disabled aria-label="Theme">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("h-9 w-9", className)}
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      title={theme === "light" ? "Dark mode" : "Light mode"}
    >
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
}

export function ThemeSelect({ className }: { className?: string }) {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) {
    return <div className={cn("h-9 w-28 rounded-md border bg-muted", className)} />;
  }

  return (
    <select
      className={cn(
        "h-9 rounded-md border border-input bg-background px-3 text-sm",
        className,
      )}
      value={theme}
      onChange={(e) => setTheme(e.target.value as "light" | "dark")}
      aria-label="Theme"
    >
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
