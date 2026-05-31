import React from "react";

export type RiverDisplay =
  | { kind: "new" }
  | { kind: "score"; value: number };

export function riverDisplay(opts: {
  score: number | null | undefined;
  reviews?: number | null;
  orders?: number | null;
}): RiverDisplay {
  const s = Number(opts.score ?? 0);
  const r = Number(opts.reviews ?? 0);
  const o = Number(opts.orders ?? 0);
  if (!s && !r && !o) return { kind: "new" };
  return { kind: "score", value: s };
}

/** Returns either the numeric score (rounded to fixed digits) or null when "New". */
export function riverScoreText(
  score: number | null | undefined,
  opts: { reviews?: number | null; orders?: number | null; digits?: number } = {},
): string | null {
  const d = riverDisplay({ score, reviews: opts.reviews, orders: opts.orders });
  if (d.kind === "new") return null;
  return d.value.toFixed(opts.digits ?? 1);
}

interface NewPillProps {
  surface?: "light" | "dark";
  style?: React.CSSProperties;
}

export function RiverNewPill({ surface = "light", style }: NewPillProps) {
  const bg = surface === "dark" ? "#1a3a1a" : "#dcfce7";
  const color = surface === "dark" ? "#4ade80" : "#166534";
  return React.createElement(
    "span",
    {
      style: {
        display: "inline-block",
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 999,
        letterSpacing: "0.02em",
        ...style,
      },
    },
    "New",
  );
}
