import { format, startOfMonth, endOfMonth, addMonths as dateFnsAddMonths, parse } from 'date-fns';

export function getCurrentMonthRange() {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
    startFormatted: format(startOfMonth(now), 'yyyy-MM-dd'),
    endFormatted: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
}

/**
 * Get start and end dates for a specific month
 * @param month - Month string in YYYY-MM format
 * @returns Object with start/end dates and formatted strings
 */
export function getMonthRange(month: string) {
  const date = parse(month, 'yyyy-MM', new Date());
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
    startFormatted: format(startOfMonth(date), 'yyyy-MM-dd'),
    endFormatted: format(endOfMonth(date), 'yyyy-MM-dd'),
  };
}

/**
 * Convert Date to YYYY-MM string format
 * @param date - Date object
 * @returns Month string in YYYY-MM format
 */
export function formatMonth(date: Date): string {
  return format(date, 'yyyy-MM');
}

/**
 * Get previous or next month string
 * @param month - Month string in YYYY-MM format
 * @param delta - Number of months to add (negative for previous)
 * @returns New month string in YYYY-MM format
 */
export function addMonths(month: string, delta: number): string {
  const date = parse(month, 'yyyy-MM', new Date());
  const newDate = dateFnsAddMonths(date, delta);
  return formatMonth(newDate);
}

/**
 * Check if a month string represents the current month
 * @param month - Month string in YYYY-MM format
 * @returns True if the month is current month
 */
export function isCurrentMonth(month: string): boolean {
  const currentMonth = formatMonth(new Date());
  return month === currentMonth;
}

/**
 * Get current month in YYYY-MM format
 * @returns Current month string
 */
export function getCurrentMonth(): string {
  return formatMonth(new Date());
}

/**
 * Validate month string format
 * @param month - Month string to validate
 * @returns True if valid YYYY-MM format
 */
export function isValidMonth(month: string): boolean {
  const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!regex.test(month)) {
    return false;
  }
  
  try {
    const date = parse(month, 'yyyy-MM', new Date());
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

