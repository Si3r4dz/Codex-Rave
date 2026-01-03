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
  task?: {
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

// Legacy flat settings interface (kept for backward compatibility)
export interface Settings {
  default_hourly_rate: string;
  currency: 'PLN' | 'USD' | 'EUR' | 'GBP';
  daily_hours_target: string;
}

// Re-export grouped settings types
export type {
  Currency,
  GeneralSettings,
  LocationSettings,
  FuelSettings,
  AppSettings,
  FlatSettings,
} from './settings';
export { toGroupedSettings, toFlatSettings } from './settings';

export interface TaskTimeEntry {
  task_id: string;
  task_name: string;
  hours: number;
  dates: string[]; // List of dates worked on this task
}

export interface ProjectDetails {
  project_id: string;
  project_name: string;
  total_hours: number;
  total_income: number | null;
  hourly_rate: number | null;
  daily_breakdown: DailyStats[];
  tasks: TaskTimeEntry[];
  stats: {
    days_worked: number;
    avg_hours_per_day: number;
    most_productive_day: { date: string; hours: number } | null;
  };
}

export type FuelType = 'Pb95' | 'Pb98' | 'ON' | 'LPG';

export interface FuelTransaction {
  id: number;
  date: string; // YYYY-MM-DD format
  fuel_type: FuelType;
  liters: number;
  price_per_liter: number;
  total_amount: number;
  station_id?: number;
  station_name?: string;
  station_address?: string;
  created_at: string;
}

export interface FuelMonthlyStats {
  total: {
    transaction_count: number;
    total_spent: number;
    total_liters: number;
  };
  byType: Array<{
    fuel_type: FuelType;
    transaction_count: number;
    total_spent: number;
    total_liters: number;
    avg_price_per_liter: number;
  }>;
}

export interface FuelPriceApiResponse {
  Pb95?: number;
  Pb98?: number;
  ON?: number;
  LPG?: number;
  updated_at?: string;
}

export interface FuelStation {
  id: number;
  name: string;
  brand?: string;
  address?: string;
  latitude: number;
  longitude: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  distance_km?: number; // Calculated field
  usage_count?: number; // From joins
  last_used?: string; // From joins
  prices?: Partial<Record<FuelType, number>>; // Matched prices
}

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  display_name: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
}

export type {
  InvoiceStatus,
  PaymentMethod,
  VatRate,
  Client,
  Invoice,
  InvoiceItem,
  InvoiceSequence,
  InvoiceWithItems,
  CreateClientInput,
  CreateInvoiceItemInput,
  CreateInvoiceInput,
} from './invoice';

