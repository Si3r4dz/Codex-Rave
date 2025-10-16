import { format, startOfMonth, endOfMonth } from 'date-fns';

export function getCurrentMonthRange() {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
    startFormatted: format(startOfMonth(now), 'yyyy-MM-dd'),
    endFormatted: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
}

