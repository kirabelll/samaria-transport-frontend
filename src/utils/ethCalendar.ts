/**
 * Ethiopian Calendar Converter (Part A2)
 * Converts between Gregorian and Ethiopian calendars.
 *
 * Ethiopian calendar:
 * - 13 months (12 months of 30 days + 1 month of 5 or 6 days)
 * - ~7-8 years behind Gregorian
 * - New year starts on Sep 11 (or Sep 12 in leap years)
 */

const EC_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagumen'
];

interface EthDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
}

/**
 * Convert Gregorian date to Ethiopian date.
 * Returns a safe zero-value for invalid input instead of throwing.
 */
export function toEthiopian(date: Date): EthDate {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return { year: 0, month: 0, day: 0, monthName: '-' };
  }
  const jdn = gregorianToJDN(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return jdnToEthiopian(jdn);
}

/**
 * Convert Ethiopian date to Gregorian date
 */
export function toGregorian(year: number, month: number, day: number): Date {
  const jdn = ethiopianToJDN(year, month, day);
  const [gy, gm, gd] = jdnToGregorian(jdn);
  return new Date(gy, gm - 1, gd);
}

/**
 * Format Ethiopian date as string
 */
export function formatEthDate(date: Date): string {
  const eth = toEthiopian(date);
  return `${eth.day}/${eth.month}/${eth.year}`;
}

/**
 * Format Ethiopian date with month name
 */
export function formatEthDateFull(date: Date): string {
  const eth = toEthiopian(date);
  return `${eth.monthName} ${eth.day}, ${eth.year}`;
}

/**
 * Format dual date (Gregorian + Ethiopian).
 * Safe against null/undefined/invalid input — returns '-' instead of throwing.
 */
export function formatDualDate(date: Date | string | null | undefined): string {
  if (date === null || date === undefined || date === '') return '-';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d.getTime())) return '-';
  const gc = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const ec = formatEthDate(d);
  return `${gc} (${ec} EC)`;
}

// ── Internal conversion helpers ──────────────────────────────

function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function jdnToGregorian(jdn: number): [number, number, number] {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return [year, month, day];
}

function ethiopianToJDN(year: number, month: number, day: number): number {
  return Math.floor(1723856 + 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + day - 1);
}

function jdnToEthiopian(jdn: number): EthDate {
  const r = Math.floor((jdn - 1723856) % 1461);
  const n = Math.floor(r % 365) + 365 * Math.floor(Math.floor(r / 365) / 4);
  const year = Math.floor(4 * (jdn - 1723856) / 1461) + 1 - Math.floor(Math.floor(4 * r / 1461));
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day, monthName: EC_MONTHS[month - 1] || 'Pagumen' };
}

export default { toEthiopian, toGregorian, formatEthDate, formatEthDateFull, formatDualDate, EC_MONTHS };
