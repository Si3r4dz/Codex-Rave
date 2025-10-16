import { ProjectDetails, TaskTimeEntry, DailyStats, EverhourTimeEntry, ProjectRate } from '@/types';
import { getCurrentMonthRange } from '../utils/date';
import { roundToTwoDecimals, secondsToHours } from '../utils/formatters';
import { fetchCurrentUserTimeEntries, fetchProjectNamesMap, getProjectIdFromEntry } from '../utils/everhour-utils';
import { getRatesMap, getDefaultRate, getProjectRate } from '../utils/rates';

export class ProjectDetailsService {
  async getProjectDetails(projectId: string): Promise<ProjectDetails> {
    const { startFormatted, endFormatted } = getCurrentMonthRange();
    
    // Fetch data
    const { entries } = await fetchCurrentUserTimeEntries(startFormatted, endFormatted);
    const projectNamesMap = await fetchProjectNamesMap();
    const ratesMap = getRatesMap();
    const defaultRate = getDefaultRate();
    
    // Filter for this project
    const projectEntries = entries.filter(
      entry => getProjectIdFromEntry(entry) === projectId
    );
    
    if (projectEntries.length === 0) {
      throw new Error('No time entries found for this project');
    }
    
    // Calculate details
    const projectName = this.getProjectName(projectId, projectNamesMap);
    const hourlyRate = getProjectRate(projectId, ratesMap, defaultRate);
    const dailyBreakdown = this.aggregateByDay(projectEntries, hourlyRate);
    const tasks = this.aggregateByTask(projectEntries);
    const stats = this.calculateStats(dailyBreakdown);
    const totalHours = this.calculateTotalHours(projectEntries);
    const totalIncome = this.calculateTotalIncome(projectEntries, hourlyRate);
    
    return {
      project_id: projectId,
      project_name: projectName,
      total_hours: roundToTwoDecimals(totalHours),
      total_income: totalIncome !== null ? roundToTwoDecimals(totalIncome) : null,
      hourly_rate: hourlyRate,
      daily_breakdown: dailyBreakdown,
      tasks,
      stats,
    };
  }
  
  private getProjectName(projectId: string, projectNamesMap: Map<string, string>): string {
    return projectNamesMap.get(projectId) || 'Unknown Project';
  }
  
  private aggregateByDay(
    entries: EverhourTimeEntry[],
    hourlyRate: number | null
  ): DailyStats[] {
    const dailyMap = new Map<string, { seconds: number; income: number }>();
    
    entries.forEach((entry) => {
      const date = entry.date;
      const hours = secondsToHours(entry.time);
      const income = hourlyRate !== null ? hours * hourlyRate : 0;

      if (!dailyMap.has(date)) {
        dailyMap.set(date, { seconds: 0, income: 0 });
      }

      const day = dailyMap.get(date)!;
      day.seconds += entry.time;
      day.income += income;
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        hours: roundToTwoDecimals(secondsToHours(data.seconds)),
        income: roundToTwoDecimals(data.income),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  
  private aggregateByTask(entries: EverhourTimeEntry[]): TaskTimeEntry[] {
    const taskMap = new Map<string, { name: string; seconds: number; dates: Set<string> }>();
    
    entries.forEach((entry) => {
      const taskId = entry.task.id;
      const taskName = entry.task.name;
      const date = entry.date;

      if (!taskMap.has(taskId)) {
        taskMap.set(taskId, {
          name: taskName,
          seconds: 0,
          dates: new Set(),
        });
      }

      const task = taskMap.get(taskId)!;
      task.seconds += entry.time;
      task.dates.add(date);
    });

    return Array.from(taskMap.entries())
      .map(([taskId, data]) => ({
        task_id: taskId,
        task_name: data.name,
        hours: roundToTwoDecimals(secondsToHours(data.seconds)),
        dates: Array.from(data.dates).sort(),
      }))
      .sort((a, b) => b.hours - a.hours);
  }
  
  private calculateStats(dailyBreakdown: DailyStats[]) {
    const daysWorked = dailyBreakdown.length;
    const totalHours = dailyBreakdown.reduce((sum, day) => sum + day.hours, 0);
    const avgHoursPerDay = daysWorked > 0 ? totalHours / daysWorked : 0;
    
    const mostProductiveDay = dailyBreakdown.reduce((max, day) => 
      day.hours > (max?.hours || 0) ? day : max
    , dailyBreakdown[0] || null);

    return {
      days_worked: daysWorked,
      avg_hours_per_day: roundToTwoDecimals(avgHoursPerDay),
      most_productive_day: mostProductiveDay ? {
        date: mostProductiveDay.date,
        hours: mostProductiveDay.hours,
      } : null,
    };
  }
  
  private calculateTotalHours(entries: EverhourTimeEntry[]): number {
    const totalSeconds = entries.reduce((sum, entry) => sum + entry.time, 0);
    return secondsToHours(totalSeconds);
  }
  
  private calculateTotalIncome(entries: EverhourTimeEntry[], hourlyRate: number | null): number | null {
    if (hourlyRate === null) return null;
    const totalHours = this.calculateTotalHours(entries);
    return totalHours * hourlyRate;
  }
}

