/** An amount without a unit must not be relabelled EUR. */
export function formatMoney(amount: number | null | undefined, currency: string | null | undefined, locale: string): string {
  if (amount == null || !Number.isFinite(amount) || !currency?.trim()) return '–';
  const unit = currency.trim().toUpperCase();
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency: unit, currencyDisplay: 'code', maximumFractionDigits: 2 }).format(amount); }
  catch { return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(amount)} ${unit}`; }
}
