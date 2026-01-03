// Settings Types organized by sections

export type Currency = 'PLN' | 'USD' | 'EUR' | 'GBP';

export interface GeneralSettings {
  default_hourly_rate: string;
  currency: Currency;
  daily_hours_target: string;
}

export interface LocationSettings {
  home_address?: string;
  home_latitude?: string;
  home_longitude?: string;
  search_radius_km?: string;
}

export interface FuelSettings {
  monthly_budget?: string;
  price_alerts_enabled?: boolean;
  preferred_fuel_type?: string;
  auto_fill_enabled?: boolean;
}

export interface CompanySettings {
  company_name?: string;
  company_nip?: string;
  company_regon?: string;
  company_address?: string;
  company_city?: string;
  company_postal_code?: string;
  company_email?: string;
  company_phone?: string;
  company_bank_account?: string;
}

export interface AppSettings {
  general: GeneralSettings;
  location: LocationSettings;
  fuel: FuelSettings;
  company: CompanySettings;
}

// Flat settings format for backward compatibility with DB
export interface FlatSettings {
  default_hourly_rate: string;
  currency: Currency;
  daily_hours_target: string;
  home_address?: string;
  home_latitude?: string;
  home_longitude?: string;
  search_radius_km?: string;
  // Future fuel settings
  monthly_budget?: string;
  price_alerts_enabled?: boolean;
  preferred_fuel_type?: string;
  auto_fill_enabled?: boolean;

  // Company settings
  company_name?: string;
  company_nip?: string;
  company_regon?: string;
  company_address?: string;
  company_city?: string;
  company_postal_code?: string;
  company_email?: string;
  company_phone?: string;
  company_bank_account?: string;
}

// Helper to convert flat settings to grouped
export function toGroupedSettings(flat: FlatSettings): AppSettings {
  return {
    general: {
      default_hourly_rate: flat.default_hourly_rate,
      currency: flat.currency,
      daily_hours_target: flat.daily_hours_target,
    },
    location: {
      home_address: flat.home_address,
      home_latitude: flat.home_latitude,
      home_longitude: flat.home_longitude,
      search_radius_km: flat.search_radius_km,
    },
    fuel: {
      monthly_budget: flat.monthly_budget,
      price_alerts_enabled: flat.price_alerts_enabled,
      preferred_fuel_type: flat.preferred_fuel_type,
      auto_fill_enabled: flat.auto_fill_enabled,
    },
    company: {
      company_name: flat.company_name,
      company_nip: flat.company_nip,
      company_regon: flat.company_regon,
      company_address: flat.company_address,
      company_city: flat.company_city,
      company_postal_code: flat.company_postal_code,
      company_email: flat.company_email,
      company_phone: flat.company_phone,
      company_bank_account: flat.company_bank_account,
    },
  };
}

// Helper to convert grouped settings to flat
export function toFlatSettings(grouped: AppSettings): FlatSettings {
  return {
    ...grouped.general,
    ...grouped.location,
    ...grouped.fuel,
    ...grouped.company,
  };
}

