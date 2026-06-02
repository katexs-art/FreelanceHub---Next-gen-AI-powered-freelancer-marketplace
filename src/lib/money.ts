// Currency formatting helpers — keep all displayed amounts to 2 decimals.

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format a dollar amount (e.g. 12.5 → "$12.50"). */
export function formatUSD(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return "$0.00";
  return usd.format(Number(amount));
}

/** Format cents as USD (e.g. 1250 → "$12.50"). */
export function formatCents(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(Number(cents))) return "$0.00";
  return usd.format(Number(cents) / 100);
}

/** Compact whole-dollar formatting (no decimals) — for headline stats. */
export function formatUSDWhole(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return "$0";
  return usdWhole.format(Number(amount));
}
