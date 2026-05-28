export const C = {
  black: "#000000",
  white: "#ffffff",
  gray: "#888888",
  dim: "#444444",
  border: "#1c1c1c",
  border2: "#2a2a2a",
  card: "#050505",
  cardHover: "#0c0c0c",
  neon: "#caff00",
  neonDim: "rgba(202,255,0,0.12)",
};
export const FONT = `'DM Sans', system-ui, sans-serif`;
export const MONO = `'Space Mono', ui-monospace, monospace`;

export function initialsOf(name?: string | null) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "??";
}
