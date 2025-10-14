export interface ProjectRate {
  id: number;
  everhour_project_id: string;
  project_name: string;
  hourly_rate: number;
  created_at: string;
  updated_at: string;
}

export interface EverhourTimeEntry {
  id: number;
  time: number; // seconds
  date: string; // YYYY-MM-DD
  task: {
    id: string;
    name: string;
    projects?: string[];
  };
  user: {
    id: number;
    name: string;
  };
}

export interface EverhourProject {
  id: string;
  name: string;
  workspaceId: string;
  billing?: {
    type: string;
    rate?: number;
  };
}

export interface ProjectStats {
  project_id: string;
  project_name: string;
  hours: number;
  hourly_rate: number | null;
  income: number | null;
  percentage: number;
}

export interface DailyStats {
  date: string;
  hours: number;
  income: number;
}

export interface DashboardStats {
  total_hours: number;
  total_income: number;
  active_projects: number;
  monthly_goal: number;
  goal_percentage: number;
  projects: ProjectStats[];
  daily_breakdown: DailyStats[];
}

export interface Settings {
  default_hourly_rate: string;
  currency: 'PLN' | 'USD' | 'EUR' | 'GBP';
}

