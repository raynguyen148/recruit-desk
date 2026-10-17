export interface Salary {
  min: number;
  max: number;
  currency: string;
  period: "hour" | "month" | "year";
}
const symbols: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "₫": "VND",
  "¥": "JPY",
  "₹": "INR",
  đ: "VND",
};
/**
 * Reads free-text pay such as "USD 4,500 / month", "$3k-4k" or "20-30tr VND".
 * The original text stays the stored value; this only derives numbers for
 * sorting and filtering. Returns null when no amount can be read.
 */
export function parseSalary(text: string): Salary | null {
  const raw = text.trim().toLowerCase();
  if (!raw) return null;
  let currency = "";
  const code = raw.match(/\b(usd|eur|gbp|vnd|jpy|sgd|aud|cad|inr|cny|krw)\b/);
  if (code) currency = code[1].toUpperCase();
  else {
    const symbol = Object.keys(symbols).find((s) => raw.includes(s));
    if (symbol) currency = symbols[symbol];
  }
  if (!currency && /\d\s*(tr|triệu|trieu)/.test(raw)) currency = "VND";
  const amounts: number[] = [];
  const pattern = /(\d[\d.,]*)\s*(k|tr|triệu|trieu|m\b|million)?/g;
  for (const match of raw.matchAll(pattern)) {
    let digits = match[1].replace(/[.,]+$/, "");
    // "4,500" and "4.500" are thousands separators; "4.5" is a decimal.
    digits = /[.,]\d{3}(?!\d)/.test(digits)
      ? digits.replace(/[.,]/g, "")
      : digits.replace(",", ".");
    let value = Number.parseFloat(digits);
    if (!Number.isFinite(value)) continue;
    const unit = match[2];
    if (unit === "k") value *= 1_000;
    else if (unit) value *= 1_000_000;
    amounts.push(value);
  }
  if (!amounts.length) return null;
  // A trailing multiplier covers a bare range: "20-30M" means both are millions.
  if (amounts.length >= 2 && amounts[0] < amounts[1] / 100)
    amounts[0] *= amounts[1] >= 1_000_000 ? 1_000_000 : 1_000;
  const period = /(hour|\/\s*h\b|hr)/.test(raw)
    ? "hour"
    : /(year|annum|annual|\/\s*y|yr|p\.a)/.test(raw)
      ? "year"
      : "month";
  return {
    min: Math.min(...amounts.slice(0, 2)),
    max: Math.max(...amounts.slice(0, 2)),
    currency,
    period,
  };
}
const perMonth = { hour: 160, month: 1, year: 1 / 12 } as const;
/** Lower bound normalised to a month, or null when unreadable. */
export function monthlyMin(text: string): number | null {
  const salary = parseSalary(text);
  return salary ? salary.min * perMonth[salary.period] : null;
}
/** Currencies found in a set of salary texts, for a filter dropdown. */
export function salaryCurrencies(texts: string[]): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    const salary = parseSalary(text);
    if (salary?.currency) found.add(salary.currency);
  }
  return [...found].sort();
}
/** "" matches everything, "none" matches unreadable pay, otherwise a currency code. */
export function matchesSalary(text: string, filter: string): boolean {
  if (!filter) return true;
  const salary = parseSalary(text);
  return filter === "none" ? !salary : salary?.currency === filter;
}
/** Orders by monthly amount; pay that cannot be read always sorts last. */
export function compareSalary(a: string, b: string, desc: boolean): number {
  const x = monthlyMin(a),
    y = monthlyMin(b);
  if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
  return (x - y) * (desc ? -1 : 1);
}
