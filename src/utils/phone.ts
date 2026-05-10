export function onlyDigits(value: string | undefined | null): string {
  return String(value || "").replace(/\D/g, "");
}

/** URL wa.me com texto; aceita número já com DDI 55. */
export function buildWhatsAppWebUrlWithText(rawPhone: string | undefined | null, text: string): string | null {
  const d = onlyDigits(rawPhone);
  if (d.length < 10) return null;
  const path = d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
  return `https://wa.me/${path}?text=${encodeURIComponent(text)}`;
}

export function formatBrazilPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) {
    return digits ? `(${digits}` : "";
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
