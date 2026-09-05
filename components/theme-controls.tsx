"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAccent } from "@/components/theme-provider";
import { accents } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeControls({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className={cn("theme-controls", compact && "compact")} />;

  const dark = theme === "dark";

  return (
    <div className={cn("theme-controls", compact && "compact")} role="group" aria-label="Color theme">
      {compact ? (
        <Button variant="outline" size="icon" className="rounded-full" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setTheme(dark ? "light" : "dark")}>
          {dark ? <Moon size={15} /> : <Sun size={15} />}
        </Button>
      ) : (
        <><button type="button" className={cn("theme-option", !dark && "selected")} aria-pressed={!dark} onClick={() => setTheme("light")}><Sun size={16} /><span>Light</span></button><button type="button" className={cn("theme-option", dark && "selected")} aria-pressed={dark} onClick={() => setTheme("dark")}><Moon size={16} /><span>Dark</span></button></>
      )}
    </div>
  );
}

export function AccentPicker() {
  const { accent, setAccent } = useAccent();
  return (
    <div className="accent-picker" role="group" aria-label="Accent color">
      {accents.map((item) => (
        <button
          key={item.id}
          className={cn(accent === item.id && "selected")}
          aria-label={item.label}
          aria-pressed={accent === item.id}
          onClick={() => setAccent(item.id)}
          type="button"
        ><i style={{ background: item.value }} /><span>{item.label}</span></button>
      ))}
    </div>
  );
}
