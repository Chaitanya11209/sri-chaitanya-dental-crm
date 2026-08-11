/**
 * Shared utility for standardized appointment time options and validation.
 * All appointment forms across the CRM and public portal must consume these options.
 */

export const APPOINTMENT_TIME_OPTIONS: string[] = generateAppointmentTimeOptions();

/**
 * Generates time options from 5:00 AM (05:00) to 11:00 PM (23:00) in 15-minute increments.
 * Total 73 slots.
 */
export function generateAppointmentTimeOptions(): string[] {
  const options: string[] = [];
  // 5 AM (300 mins) to 11 PM (1380 mins)
  for (let mins = 300; mins <= 1380; mins += 15) {
    const hour24 = Math.floor(mins / 60);
    const minute = mins % 60;

    const period = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;

    const minuteStr = minute < 10 ? `0${minute}` : `${minute}`;
    options.push(`${hour12}:${minuteStr} ${period}`);
  }
  return options;
}

/**
 * Validates whether a given time string is one of the approved 15-minute slots between 5:00 AM and 11:00 PM.
 */
export function isValidAppointmentTime(timeStr: string | null | undefined): boolean {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const normalized = normalizeTo12HourTime(timeStr);

  // Must match 12-hour format: H:MM AM/PM or HH:MM AM/PM with 15-min increments
  const match = normalized.match(/^(0?[1-9]|1[0-2]):(00|15|30|45)\s*(AM|PM)$/i);
  if (!match) return false;

  const hour12 = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  let hour24 = hour12;
  if (period === 'PM' && hour12 < 12) hour24 += 12;
  if (period === 'AM' && hour12 === 12) hour24 = 0;

  const totalMins = hour24 * 60 + minute;

  // Must be between 5:00 AM (300 mins) and 11:00 PM (1380 mins) inclusive
  return totalMins >= 300 && totalMins <= 1380;
}

/**
 * Throws an error if the appointment time is not valid.
 */
export function validateAppointmentTime(timeStr: string | null | undefined): void {
  if (!timeStr || !isValidAppointmentTime(timeStr)) {
    throw new Error('Please select a valid appointment time between 5:00 AM and 11:00 PM.');
  }
}

/**
 * Converts 24-hour format ('17:15' or '17:15:00') to 12-hour format ('5:15 PM').
 */
export function convert24To12(timeStr: string | null | undefined): string {
  return normalizeTo12HourTime(timeStr);
}

/**
 * Converts 12-hour format ('5:15 PM') to 24-hour format ('17:15').
 */
export function convert12To24(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const match12 = timeStr.trim().match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i);
  if (!match12) return timeStr;
  let hour = parseInt(match12[1], 10);
  const minute = match12[2];
  const period = match12[3].toUpperCase();
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  const hour24 = hour < 10 ? `0${hour}` : `${hour}`;
  return `${hour24}:${minute}`;
}

/**
 * Safely converts any time format (e.g. "17:15", "17:15:00", "05:00", "05:15 PM") to standardized 12-hour display.
 * Retains text like "General Slot" for historical legacy fallback.
 */
export function normalizeTo12HourTime(timeStr: string | null | undefined): string {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const trimmed = timeStr.trim();
  if (!trimmed) return '';

  // 1. Check if already 12-hour format
  const match12 = trimmed.match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i);
  if (match12) {
    const hour = parseInt(match12[1], 10);
    const minute = match12[2];
    const period = match12[3].toUpperCase();
    return `${hour}:${minute} ${period}`;
  }

  // 2. Check 24-hour format: "17:15" or "17:15:00"
  const match24 = trimmed.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?$/);
  if (match24) {
    const hour24 = parseInt(match24[1], 10);
    const minute = match24[2];
    const period = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12}:${minute} ${period}`;
  }

  return trimmed;
}

/**
 * Converts a time string into minutes since midnight for chronological sorting.
 */
export function parseTimeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr || typeof timeStr !== 'string') return 9999;
  const trimmed = timeStr.trim();
  if (!trimmed) return 9999;

  // Try 12-hour format
  const match12 = trimmed.match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  // Try 24-hour format
  const match24 = trimmed.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?$/);
  if (match24) {
    const hour = parseInt(match24[1], 10);
    const minute = parseInt(match24[2], 10);
    return hour * 60 + minute;
  }

  return 9999;
}
