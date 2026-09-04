export const accents = [
  { id: "red", label: "Bright red", value: "#d83036" },
  { id: "ember", label: "Ember", value: "#e64d13" },
  { id: "forest", label: "Forest", value: "#2d8a4e" },
  { id: "ocean", label: "Ocean", value: "#1d6fd8" },
  { id: "violet", label: "Violet", value: "#6b3fbf" },
  { id: "gold", label: "Gold", value: "#c9a227" },
] as const;

export type AccentId = (typeof accents)[number]["id"];

export const ACCENT_KEY = "flexform-accent";
export const DEFAULT_ACCENT: AccentId = "red";

export function isAccentId(value: string | null): value is AccentId {
  return accents.some((accent) => accent.id === value);
}
