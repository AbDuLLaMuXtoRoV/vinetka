/** `<input type="date">` value (local) ⇄ ISO timestamp. */
export function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local date at a given time of day as ISO; deadlines default to the end of the day. */
export function fromDateInput(value: string, time: "start" | "noon" | "end" = "noon"): string | null {
  if (!value) return null;
  const clock = time === "start" ? "00:00:00" : time === "end" ? "23:59:00" : "12:00:00";
  return new Date(`${value}T${clock}`).toISOString();
}

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
}

/** `<input type="datetime-local">` value ⇄ ISO. */
export function dateTimeInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dateInputValue(iso)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
