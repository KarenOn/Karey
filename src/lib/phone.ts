export function normalizePhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits.slice(-10);
}

export function formatKareyPhone(value: string) {
  const digits = normalizePhoneDigits(value);
  if (!digits) return "";
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);
  return `+1 (${area}${area.length === 3 ? ") " : ""}${prefix}${prefix.length === 3 ? "-" : ""}${line}`;
}