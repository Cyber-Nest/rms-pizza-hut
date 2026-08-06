/**
 * Timezone Utility — Restaurant Local Timezone (America/Edmonton)
 * 
 * Uses native Intl.DateTimeFormat API (no external dependency).
 * All date operations in the frontend should use these helpers
 * to ensure we always display and filter using local time.
 */

const TIMEZONE = "America/Edmonton";

/**
 * Get today's date string (YYYY-MM-DD) in local timezone.
 */
export function getLocalTodayStr(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
}

/**
 * Get a past date string (YYYY-MM-DD) in local timezone.
 * @param daysAgo - Number of days in the past.
 */
export function getLocalPastDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return dateToLocalStr(d);
}

/**
 * Get past date relative to a given date string.
 * @param dateStr - Base date in YYYY-MM-DD format.
 * @param daysAgo - Number of days in the past.
 */
export function getLocalPastDateOf(dateStr: string, daysAgo: number): string {
  const d = new Date(dateStr + "T12:00:00"); // Use noon to avoid DST edge cases
  d.setDate(d.getDate() - daysAgo);
  return dateToLocalStr(d);
}

/**
 * Convert any Date object to YYYY-MM-DD string in local timezone.
 */
export function dateToLocalStr(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
}

/**
 * Format a UTC date string to local display: MM/DD/YYYY HH:mm
 * (24-hour format)
 */
export function formatLocalDateTime24(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
    return formatted;
  } catch {
    return dateStr;
  }
}

/**
 * Format a UTC date string to local display: MM/DD/YYYY HH:MM AM/PM
 * (12-hour format)
 */
export function formatLocalDateTime12(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(d);

    const month = parts.find((p) => p.type === "month")?.value || "";
    const day = parts.find((p) => p.type === "day")?.value || "";
    const year = parts.find((p) => p.type === "year")?.value || "";
    const hour = parts.find((p) => p.type === "hour")?.value || "";
    const minute = parts.find((p) => p.type === "minute")?.value || "";
    const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value || "";

    return `${month}/${day}/${year} ${hour}:${minute} ${dayPeriod}`;
  } catch {
    return dateStr;
  }
}

/**
 * Get the local date string (YYYY-MM-DD) for any given date/string.
 */
export function getLocalDateStr(dateInput: string | Date): string {
  try {
    const d = new Date(dateInput);
    return dateToLocalStr(d);
  } catch {
    return "";
  }
}

/**
 * Get the current year in local timezone.
 */
export function getLocalYear(): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
  }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === "year")?.value || new Date().getFullYear());
}
