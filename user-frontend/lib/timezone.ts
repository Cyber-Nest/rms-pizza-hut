/**
 * Timezone Utility — Restaurant Local Timezone (America/Edmonton)
 *
 * Uses native Intl.DateTimeFormat API (no external dependency).
 * All date/time operations in the customer-facing frontend should use these helpers
 * to ensure consistency with the restaurant's local Canada timezone.
 */

const TIMEZONE = "America/Edmonton";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Get today's date string (YYYY-MM-DD) in Canada timezone.
 */
export function getCanadaTodayStr(): string {
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
 * Get the current day-of-week name (e.g. "Monday", "Tuesday") in Canada timezone.
 */
export function getCanadaDayName(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
  }).format(new Date());
}

/**
 * Get current hour (0-23) and minute (0-59) in Canada timezone.
 */
export function getCanadaCurrentTime(): { hours: number; minutes: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const hours = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minutes = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hours, minutes };
}

/**
 * Format a UTC date string to local Canada display: MM/DD/YYYY HH:MM AM/PM
 */
export function formatCanadaDateTime12(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      timeZone: TIMEZONE,
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}
