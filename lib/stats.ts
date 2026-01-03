import { format, startOfMonth, endOfMonth } from 'date-fns';
import { getEverhourClient } from './everhour';
import { projectRatesDb, settingsDb } from './db';
import { DashboardStats, ProjectStats, DailyStats, EverhourTimeEntry } from '@/types';

export async function calculateDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const fromDate = format(monthStart, 'yyyy-MM-dd');
  const toDate = format(monthEnd, 'yyyy-MM-dd');

  // Fetch time entries from Everhour
  const everhourClient = getEverhourClient();

  // First get current user to determine their ID
  const currentUser = await everhourClient.getCurrentUser();
  const userId = currentUser.id;

  // Fetch time entries for the current user
  const timeEntries = await everhourClient.getTimeEntries(fromDate, toDate, userId);

  // Fetch all projects from Everhour to get actual project names
  const everhourProjects = await everhourClient.getProjects();
  const projectNamesMap = new Map(everhourProjects.map(p => [p.id, p.name]));

  // Fetch all project rates from database
  const projectRates = projectRatesDb.getAll();
  const ratesMap = new Map(projectRates.map(pr => [pr.everhour_project_id, pr]));

  // Get default hourly rate from settings database
  const defaultRateSetting = settingsDb.get('default_hourly_rate');
  const defaultRate = parseFloat(defaultRateSetting || '0');

  // Aggregate by project
  const projectsMap = new Map<string, { name: string; seconds: number; rate: number | null; isDefaultRate: boolean }>();

  timeEntries.forEach((entry: EverhourTimeEntry) => {
    const projectId = entry.task?.projects?.[0] || 'unknown';
    // Get the actual project name from Everhour projects
    const projectName = projectNamesMap.get(projectId) || entry.task?.name || 'Unknown Project';

    if (!projectsMap.has(projectId)) {
      const rateInfo = ratesMap.get(projectId);
      const rate = rateInfo?.hourly_rate || (defaultRate > 0 ? defaultRate : null);
      projectsMap.set(projectId, {
        // Prefer: saved rate name > Everhour project name > task name > fallback
        name: rateInfo?.project_name || projectName,
        seconds: 0,
        rate: rate,
        isDefaultRate: !rateInfo && defaultRate > 0,
      });
    }

    const project = projectsMap.get(projectId)!;
    project.seconds += entry.time;
  });

  // Calculate total hours
  const totalSeconds = Array.from(projectsMap.values()).reduce((sum, p) => sum + p.seconds, 0);
  const totalHours = totalSeconds / 3600;

  // Calculate project stats
  const projects: ProjectStats[] = Array.from(projectsMap.entries()).map(([id, data]) => {
    const hours = data.seconds / 3600;
    const income = data.rate !== null ? hours * data.rate : null;

    return {
      project_id: id,
      project_name: data.name,
      hours: Math.round(hours * 100) / 100,
      hourly_rate: data.rate,
      income: income !== null ? Math.round(income * 100) / 100 : null,
      percentage: totalHours > 0 ? Math.round((hours / totalHours) * 100 * 100) / 100 : 0,
    };
  }).sort((a, b) => b.hours - a.hours);

  // Calculate total income
  const totalIncome = projects.reduce((sum, p) => sum + (p.income || 0), 0);

  // Aggregate by day
  const dailyMap = new Map<string, { seconds: number; income: number }>();

  timeEntries.forEach((entry: EverhourTimeEntry) => {
    const date = entry.date;
    const projectId = entry.task?.projects?.[0] || 'unknown';
    const rateInfo = ratesMap.get(projectId);
    const rate = rateInfo?.hourly_rate || (defaultRate > 0 ? defaultRate : 0);
    const hours = entry.time / 3600;
    const income = hours * rate;

    if (!dailyMap.has(date)) {
      dailyMap.set(date, { seconds: 0, income: 0 });
    }

    const day = dailyMap.get(date)!;
    day.seconds += entry.time;
    day.income += income;
  });

  const dailyBreakdown: DailyStats[] = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      hours: Math.round((data.seconds / 3600) * 100) / 100,
      income: Math.round(data.income * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Get monthly goal from environment variable
  const monthlyGoal = parseInt(process.env.MONTHLY_HOURS_GOAL || '160', 10);
  const goalPercentage = monthlyGoal > 0 ? Math.round((totalHours / monthlyGoal) * 100 * 100) / 100 : 0;

  return {
    total_hours: Math.round(totalHours * 100) / 100,
    total_income: Math.round(totalIncome * 100) / 100,
    active_projects: projects.length,
    monthly_goal: monthlyGoal,
    goal_percentage: goalPercentage,
    projects,
    daily_breakdown: dailyBreakdown,
  };
}

