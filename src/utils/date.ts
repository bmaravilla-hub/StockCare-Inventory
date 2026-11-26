/**
 * Utilidades de fechas locales en formato ISO (YYYY-MM-DD) para evitar desfases por zona horaria.
 */

export function getTodayLocalISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

export function diffDaysFromToday(isoDate: string, referenceISO = getTodayLocalISO()): number {
  const target = parseLocalDate(isoDate);
  const ref = parseLocalDate(referenceISO);
  if (!target || !ref) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((target.getTime() - ref.getTime()) / msPerDay);
}

export function formatDateDisplay(isoDate: string): string {
  const parsed = parseLocalDate(isoDate);
  if (!parsed) return isoDate;
  return parsed.toLocaleDateString('es-SV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTimeDisplay(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return isoDateTime;
  return date.toLocaleString('es-SV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isValidFutureOrTodayDate(isoDate: string): boolean {
  const parsed = parseLocalDate(isoDate);
  if (!parsed) return false;
  return diffDaysFromToday(isoDate) >= 0;
}

export function isValidNotFutureDate(isoDate: string): boolean {
  const parsed = parseLocalDate(isoDate);
  if (!parsed) return false;
  return diffDaysFromToday(isoDate) <= 0;
}

