/**
 * Timezone Utility — Restaurant Local Timezone (America/Edmonton)
 *
 * All date/time operations in this system should use these helpers
 * to ensure consistency with the restaurant's local timezone.
 *
 * Local timezone (Edmonton/Alberta) uses:
 *   MST (Mountain Standard Time) = UTC-7  (Nov–Mar)
 *   MDT (Mountain Daylight Time) = UTC-6  (Mar–Nov)
 *
 * Luxon handles DST transitions automatically via IANA timezone.
 *
 * BUSINESS DAY RULE:
 *   The restaurant "business day" starts at 3:00 AM local time.
 *   Orders placed between 12:00 AM and 2:59 AM still belong to the PREVIOUS business day.
 *   Example: 2:30 AM Tuesday → business date = Monday
 */

const { DateTime } = require("luxon");

const TIMEZONE = "America/Edmonton";

/**
 * Hour at which a new business day starts (3 = 3:00 AM local time).
 * Orders before this hour belong to the PREVIOUS calendar day.
 */
const BUSINESS_DAY_START_HOUR = 3;

/**
 * Get the current business-date string (YYYY-MM-DD) in local time.
 * If it's before BUSINESS_DAY_START_HOUR (3 AM), returns the previous calendar day.
 *
 * @param {Date|string} [date] - Optional specific UTC date to convert (no business-day shift).
 *                               If omitted, returns TODAY's business date.
 */
function getLocalDateStr(date) {
  if (date) {
    // Converting a specific stored UTC date → just give the local calendar date, no shift
    const dt = DateTime.fromJSDate(new Date(date)).setZone(TIMEZONE);
    return dt.toFormat("yyyy-MM-dd");
  }
  // "What business day is it right now?"
  const now = DateTime.now().setZone(TIMEZONE);
  if (now.hour < BUSINESS_DAY_START_HOUR) {
    // Before 3 AM — still the previous business day
    return now.minus({ days: 1 }).toFormat("yyyy-MM-dd");
  }
  return now.toFormat("yyyy-MM-dd");
}

/**
 * Get the UTC Date object representing the START of a business day in local time.
 * Business day starts at 3:00 AM local time.
 *
 * @param {string} dateStr - Date string in YYYY-MM-DD format (business date).
 * @returns {Date}
 */
function getLocalStartOfDay(dateStr) {
  const dt = DateTime.fromISO(dateStr, { zone: TIMEZONE }).set({
    hour: BUSINESS_DAY_START_HOUR,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  return dt.toJSDate();
}

/**
 * Get the UTC Date object representing the END of a business day in local time.
 * Business day ends at 2:59:59.999 AM of the NEXT calendar day.
 *
 * @param {string} dateStr - Date string in YYYY-MM-DD format (business date).
 * @returns {Date}
 */
function getLocalEndOfDay(dateStr) {
  const dt = DateTime.fromISO(dateStr, { zone: TIMEZONE })
    .plus({ days: 1 })
    .set({
      hour: BUSINESS_DAY_START_HOUR,
      minute: 0,
      second: 0,
      millisecond: 0,
    })
    .minus({ milliseconds: 1 }); // 02:59:59.999 AM next day
  return dt.toJSDate();
}

/**
 * Get the hour (0-23) in local time for a given date.
 * @param {Date|string} date
 * @returns {number}
 */
function getLocalHour(date) {
  return DateTime.fromJSDate(new Date(date)).setZone(TIMEZONE).hour;
}

/**
 * Get the day name (Monday, Tuesday, etc.) in local time for a given date.
 * @param {Date|string} date
 * @returns {string}
 */
function getLocalDayName(date) {
  return DateTime.fromJSDate(new Date(date)).setZone(TIMEZONE).toFormat("EEEE");
}

/**
 * Format a date to local display: MM/DD/YYYY HH:mm
 * @param {Date|string} date
 * @returns {string}
 */
function formatLocalDateTime(date) {
  const dt = DateTime.fromJSDate(new Date(date)).setZone(TIMEZONE);
  return dt.toFormat("MM/dd/yyyy HH:mm");
}

/**
 * Get local "now" as a Luxon DateTime
 * @returns {DateTime}
 */
function getLocalNow() {
  return DateTime.now().setZone(TIMEZONE);
}

module.exports = {
  TIMEZONE,
  BUSINESS_DAY_START_HOUR,
  getLocalDateStr,
  getLocalStartOfDay,
  getLocalEndOfDay,
  getLocalHour,
  getLocalDayName,
  formatLocalDateTime,
  getLocalNow,
};
