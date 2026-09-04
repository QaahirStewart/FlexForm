"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ACCENT_KEY, DEFAULT_ACCENT, accents, isAccentId, type AccentId } from "@/lib/theme";

type AccentContextValue = {
  accent: AccentId;
  setAccent: (id: AccentId) => void;
};

const AccentContext = createContext<AccentContextValue>({
  accent: DEFAULT_ACCENT,
  setAccent: () => undefined,
});

export function useAccent() {
  return useContext(AccentContext);
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentId>(DEFAULT_ACCENT);

  useEffect(() => {
    const saved = window.localStorage.getItem(ACCENT_KEY);
    if (isAccentId(saved)) setAccentState(saved);
  }, []);

  const setAccent = useCallback((id: AccentId) => {
    setAccentState(id);
    document.documentElement.dataset.accent = id;
    window.localStorage.setItem(ACCENT_KEY, id);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  const value = useMemo(() => ({ accent, setAccent }), [accent, setAccent]);

  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <AccentContext.Provider value={value}>{children}</AccentContext.Provider>
    </NextThemesProvider>
  );
}
