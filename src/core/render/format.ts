const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2022-03" → "Mar 2022", "2022" → "2022". Empty or malformed input gives "". */
export function formatMonth(value: string): string {
  if (/^\d{4}$/.test(value)) return value;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return "";
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : "";
}

/** "Mar 2022 – Present", "Mar 2022 – Jun 2024", "Jun 2024" or "". */
export function formatDateRange(start: string, end: string, current = false): string {
  const from = formatMonth(start);
  const to = current ? "Present" : formatMonth(end);
  if (from && to) return from === to ? from : `${from} – ${to}`;
  return from || to;
}

/** "https://www.linkedin.com/in/jane/" → "linkedin.com/in/jane". */
export function displayUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}

export function joinNonEmpty(parts: (string | undefined | null)[], separator: string): string {
  return parts
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(separator);
}

/** "Jane Doe" + "Acme Corp" → "Jane_Doe_Acme_Corp_Resume". */
export function resumeFileBaseName(name: string, company: string): string {
  const part = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_+|_+$/g, "");
  return joinNonEmpty([part(name), part(company), "Resume"], "_");
}
