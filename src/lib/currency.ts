/**
 * Format a number as FCFA currency.
 * 1500 → "1 500 FCFA"
 */
export function formatFCFA(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
  if (isNaN(n as number)) return "0 FCFA";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
    .format(Math.round(n as number)) + " FCFA";
}
