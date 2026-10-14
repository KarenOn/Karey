export const DEFAULT_LOCALE = "es-DO";
export const DEFAULT_CURRENCY = "DOP";
export const DEFAULT_TIMEZONE = "America/Santo_Domingo";
const MONEY_OPTIONS = { minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;

export function formatMoney(value: unknown, currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE) {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const normalizedCurrency = currency.toUpperCase();

  if (normalizedCurrency === DEFAULT_CURRENCY) {
    const formattedAmount = new Intl.NumberFormat(DEFAULT_LOCALE, MONEY_OPTIONS).format(safeAmount);
    return `RD$${formattedAmount}`;
  }

  return new Intl.NumberFormat(locale, { style: "currency", currency: normalizedCurrency, ...MONEY_OPTIONS }).format(safeAmount);
}

export function formatDecimal(value: unknown, locale = DEFAULT_LOCALE) {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat(locale, MONEY_OPTIONS).format(Number.isFinite(amount) ? amount : 0);
}

export function formatClinicDate(value: Date | string | number, timeZone = DEFAULT_TIMEZONE, locale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone }).format(new Date(value));
}

export function formatClinicDateTime(value: Date | string | number, timeZone = DEFAULT_TIMEZONE, locale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(value));
}

export function formatClinicTime(value: Date | string | number, timeZone = DEFAULT_TIMEZONE, locale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(value));
}
