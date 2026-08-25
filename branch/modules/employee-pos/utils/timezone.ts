/**
 * Timezone Utility — Restaurant Local Timezone (America/Edmonton)
 *
 * Uses native Intl.DateTimeFormat API (no external dependency).
 * All date operations in the frontend should use these helpers
 * to ensure we always display and filter using Canada local time.
 *
 * Alberta uses:
 *   MST (Mountain Standard Time) = UTC-7  (Nov–Mar)
 *   MDT (Mountain Daylight Time) = UTC-6  (Mar–Nov)
 *
 * BUSINESS DAY RULE:
 *   Restaurant "business day" starts at 3:00 AM local time.
 *   Before 3 AM = still the previous business day.
 *   Example: 2:30 AM Tuesday → business date = Monday
 */

const TIMEZONE = "America/Edmonton";

/**
 * Hour at which a new business day starts.
 * Before this hour, it is still the previous business day.
 */
const BUSINESS_DAY_START_HOUR = 3;

/**
 * Get today's BUSINESS date string (YYYY-MM-DD) in Canada timezone.
 * If current Canada time is before 3 AM, returns YESTERDAY's date.
 *
 * USE THIS instead of new Date().toISOString().split("T")[0]
 */
export function getLocalTodayStr(): string {
  const now = new Date();

  // Get current calendar date AND hour in Canada timezone
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23", // 24-hour clock so hour 0-23
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "12");

  const calendarDateStr = `${year}-${month}-${day}`;

  if (hour < BUSINESS_DAY_START_HOUR) {
    // Before 3 AM — still previous business day
    // Use noon on the current calendar date to safely subtract 1 day
    const d = new Date(calendarDateStr + "T12:00:00");
    d.setDate(d.getDate() - 1);
    return dateToLocalStr(d);
  }

  return calendarDateStr;
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
 * Convert any Date object to YYYY-MM-DD string in Canada local timezone.
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
 * Format a UTC date string to local display: MM/DD/YYYY HH:mm  (24-hour)
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
 * Format a UTC date string to local display: MM/DD/YYYY HH:MM AM/PM  (12-hour)
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
 * No business-day shift — just raw calendar date conversion.
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

/**
 * Get the day-of-week number (0=Sunday ... 6=Saturday) in Canada local timezone.
 * USE THIS instead of new Date().getDay() which returns browser/server local day.
 */
export function getLocalDayNumber(): number {
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const localDayName = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
  })
    .format(new Date())
    .toLowerCase();
  return dayNames.indexOf(localDayName);
}

/**
 * Get the current day name (e.g. "monday") in Canada local timezone.
 * USE THIS for "Deals of the Day" matching instead of new Date().getDay().
 */
export function getLocalDayName(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
  })
    .format(new Date())
    .toLowerCase();
}

/**
 * Format a UTC ISO date/string to a local time display (HH:MM AM/PM) in Canada timezone.
 * USE THIS instead of .toLocaleTimeString() without a timezone argument.
 */
export function formatLocalTime(dateStr: string | Date): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

/**
 * Format a UTC ISO date/string to a local date display (MM/DD/YYYY) in Canada timezone.
 * USE THIS instead of .toLocaleDateString() without a timezone argument.
 */
export function formatLocalDate(dateStr: string | Date): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      timeZone: TIMEZONE,
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Get the current local time as HH:MM AM/PM string in Canada timezone.
 * USE THIS instead of new Date().toLocaleTimeString().
 */
export function getLocalNowTimeStr(): string {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
