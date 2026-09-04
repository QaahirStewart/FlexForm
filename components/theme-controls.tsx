"use client";

import { Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useAccent } from "@/components/theme-provider";
import { accents, type AccentId } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeControls({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className={cn("theme-controls", compact && "compact")} />;

  const dark = theme === "dark";

  return (
    <div className={cn("theme-controls", compact && "compact")}>
      {compact ? (
        <Button variant="outline" size="icon" className="rounded-full" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setTheme(dark ? "light" : "dark")}>
          {dark ? <Moon size={15} /> : <Sun size={15} />}
        </Button>
      ) : (
        <div className="theme-mode">
          {dark ? <Moon size={14} /> : <Sun size={14} />}
          <span>{dark ? "Dark" : "Light"}</span>
          <Switch checked={dark} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} aria-label="Toggle dark mode" />
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size={compact ? "icon" : "sm"} className={compact ? "rounded-full" : ""} aria-label="Choose accent color" />}>
          <Palette size={15} />
          {compact ? null : <span>Accent</span>}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Accent color</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={accent} onValueChange={(value) => setAccent(value as AccentId)}>
            {accents.map((item) => (
              <DropdownMenuRadioItem key={item.id} value={item.id}>
                <i className="accent-swatch" style={{ background: item.value }} />
                {item.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function AccentPicker() {
  const { accent, setAccent } = useAccent();
  return (
    <div className="accent-picker">
      {accents.map((item) => (
        <button
          key={item.id}
          className={cn(accent === item.id && "selected")}
          style={{ background: item.value }}
          aria-label={item.label}
          onClick={() => setAccent(item.id)}
          type="button"
        />
      ))}
    </div>
  );
}
