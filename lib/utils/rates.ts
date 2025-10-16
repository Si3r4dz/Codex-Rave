import { projectRatesDb, settingsDb } from '../db';
import { ProjectRate } from '@/types';

export function getRatesMap(): Map<string, ProjectRate> {
  const rates = projectRatesDb.getAll();
  return new Map(rates.map(pr => [pr.everhour_project_id, pr]));
}

export function getDefaultRate(): number {
  const setting = settingsDb.get('default_hourly_rate');
  return parseFloat(setting || '0');
}

export function getProjectRate(
  projectId: string,
  ratesMap: Map<string, ProjectRate>,
  defaultRate: number
): number | null {
  const rateInfo = ratesMap.get(projectId);
  return rateInfo?.hourly_rate || (defaultRate > 0 ? defaultRate : null);
}

