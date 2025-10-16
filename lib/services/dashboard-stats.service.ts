import { DashboardStats, ProjectStats, DailyStats, EverhourTimeEntry, ProjectRate } from '@/types';
import { getCurrentMonthRange } from '../utils/date';
import { roundToTwoDecimals, secondsToHours } from '../utils/formatters';
import { fetchCurrentUserTimeEntries, fetchProjectNamesMap, getProjectIdFromEntry } from '../utils/everhour-utils';
import { getRatesMap, getDefaultRate, getProjectRate } from '../utils/rates';

export class DashboardStatsService {
  async calculateStats(): Promise<DashboardStats> {
    const { startFormatted, endFormatted } = getCurrentMonthRange();
    
    // Fetch all required data
    const { entries } = await fetchCurrentUserTimeEntries(startFormatted, endFormatted);
    const projectNamesMap = await fetchProjectNamesMap();
    const ratesMap = getRatesMap();
    const defaultRate = getDefaultRate();
    
    // Calculate project stats
    const projects = this.aggregateByProject(entries, projectNamesMap, ratesMap, defaultRate);
    
    // Calculate daily stats
    const dailyBreakdown = this.aggregateByDay(entries, ratesMap, defaultRate);
    
    // Calculate totals and goal
    const totalHours = this.calculateTotalHours(projects);
    const totalIncome = this.calculateTotalIncome(projects);
    const monthlyGoal = this.getMonthlyGoal();
    
    return {
      total_hours: roundToTwoDecimals(totalHours),
      total_income: roundToTwoDecimals(totalIncome),
      active_projects: projects.length,
      monthly_goal: monthlyGoal,
      goal_percentage: this.calculateGoalPercentage(totalHours, monthlyGoal),
      projects,
      daily_breakdown: dailyBreakdown,
    };
  }
  
  private aggregateByProject(
    entries: EverhourTimeEntry[],
    projectNamesMap: Map<string, string>,
    ratesMap: Map<string, ProjectRate>,
    defaultRate: number
  ): ProjectStats[] {
    const projectsMap = new Map<string, { name: string; seconds: number; rate: number | null; isDefaultRate: boolean }>();
    
    entries.forEach((entry) => {
      const projectId = getProjectIdFromEntry(entry);
      const projectName = projectNamesMap.get(projectId) || entry.task.name || 'Unknown Project';
      
      if (!projectsMap.has(projectId)) {
        const rateInfo = ratesMap.get(projectId);
        const rate = getProjectRate(projectId, ratesMap, defaultRate);
        projectsMap.set(projectId, {
          name: rateInfo?.project_name || projectName,
          seconds: 0,
          rate: rate,
          isDefaultRate: !rateInfo && defaultRate > 0,
        });
      }

      const project = projectsMap.get(projectId)!;
      project.seconds += entry.time;
    });

    const totalSeconds = Array.from(projectsMap.values()).reduce((sum, p) => sum + p.seconds, 0);
    const totalHours = secondsToHours(totalSeconds);

    return Array.from(projectsMap.entries()).map(([id, data]) => {
      const hours = secondsToHours(data.seconds);
      const income = data.rate !== null ? hours * data.rate : null;
      
      return {
        project_id: id,
        project_name: data.name,
        hours: roundToTwoDecimals(hours),
        hourly_rate: data.rate,
        income: income !== null ? roundToTwoDecimals(income) : null,
        percentage: totalHours > 0 ? roundToTwoDecimals((hours / totalHours) * 100) : 0,
      };
    }).sort((a, b) => b.hours - a.hours);
  }
  
  private aggregateByDay(
    entries: EverhourTimeEntry[],
    ratesMap: Map<string, ProjectRate>,
    defaultRate: number
  ): DailyStats[] {
    const dailyMap = new Map<string, { seconds: number; income: number }>();
    
    entries.forEach((entry) => {
      const date = entry.date;
      const projectId = getProjectIdFromEntry(entry);
      const rate = getProjectRate(projectId, ratesMap, defaultRate) || 0;
      const hours = secondsToHours(entry.time);
      const income = hours * rate;

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
  
  private calculateTotalHours(projects: ProjectStats[]): number {
    return projects.reduce((sum, p) => sum + p.hours, 0);
  }
  
  private calculateTotalIncome(projects: ProjectStats[]): number {
    return projects.reduce((sum, p) => sum + (p.income || 0), 0);
  }
  
  private getMonthlyGoal(): number {
    return parseInt(process.env.MONTHLY_HOURS_GOAL || '160', 10);
  }
  
  private calculateGoalPercentage(totalHours: number, monthlyGoal: number): number {
    return monthlyGoal > 0 ? roundToTwoDecimals((totalHours / monthlyGoal) * 100) : 0;
  }
}

