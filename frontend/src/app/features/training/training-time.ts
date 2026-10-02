/** Local input values must never be obtained by truncating a UTC timestamp. */
export function localDateTime(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error('invalidDate');
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function tomorrowSchedule(now = new Date()): { start: string; end: string } {
  const start = new Date(now);
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(17, 0, 0, 0);
  return { start: localDateTime(start), end: localDateTime(end) };
}
export function validDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function parseLocalDateTime(value: string, originalIso?: string | null): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('invalidDate');
  if (originalIso) {
    const original = new Date(originalIso);
    if (Number.isFinite(original.getTime()) && localDateTime(original) === value) return original;
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || localDateTime(date) !== value) throw new Error('invalidDate');
  for (const day of [-1, 1]) {
    const adjacent = new Date(date.getTime() + day * 86400000);
    const difference = adjacent.getTimezoneOffset() - date.getTimezoneOffset();
    const alternative = new Date(date.getTime() + difference * 60000);
    if (difference !== 0 && localDateTime(alternative) === value) throw new Error('ambiguousTime');
  }
  return date;
}
export function calendarDateInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (name: string) => parts.find(part => part.type === name)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function schedulePayload(timed: boolean, start: string, end: string,
    originalStart?: string | null, originalEnd?: string | null, sessionZone?: string | null) {
  if (!timed) {
    if (!validDateOnly(start) || !validDateOnly(end) || end < start) throw new Error('invalidDate');
    return { startDate: start, endDate: end, startsAt: null, endsAt: null, timeZone: null };
  }
  const a = parseLocalDateTime(start, originalStart), b = parseLocalDateTime(end, originalEnd);
  if (b.getTime() <= a.getTime()) throw new Error('invalidDate');
  const timeZone = sessionZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return { startDate: calendarDateInZone(a, timeZone), endDate: calendarDateInZone(b, timeZone),
    startsAt: a.toISOString(), endsAt: b.toISOString(), timeZone };
}
export function validDuration(value: number): boolean {
  return Number.isFinite(value) && value >= 0.5 && value <= 9999.99
    && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
}
export function validCapacity(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 500;
}
export function meetingUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
