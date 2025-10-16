import { eachDayOfInterval, isWeekend, format } from 'date-fns';
import { HolidaysService } from '../services/holidays.service';

const holidaysService = new HolidaysService();

export async function calculateWorkingDays(
  startDate: Date,
  endDate: Date
): Promise<number> {
  // Get holidays for the year(s) covered by the date range
  const years = new Set<number>();
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    years.add(currentDate.getFullYear());
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  // Fetch holidays for all relevant years
  const allHolidays = new Set<string>();
  for (const year of years) {
    const holidays = await holidaysService.getHolidaysForYear(year);
    holidays.forEach(h => allHolidays.add(h.date));
  }
  
  // Count working days
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  
  return allDays.filter(day => {
    // Exclude weekends
    if (isWeekend(day)) {
      return false;
    }
    
    // Exclude holidays
    const dateStr = format(day, 'yyyy-MM-dd');
    if (allHolidays.has(dateStr)) {
      return false;
    }
    
    return true;
  }).length;
}

export async function calculateMonthlyWorkingDays(date: Date = new Date()): Promise<number> {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  return calculateWorkingDays(startOfMonth, endOfMonth);
}

