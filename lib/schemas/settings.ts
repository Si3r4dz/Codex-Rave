import { z } from 'zod';

const digitsOnly = (value: string) => value.replace(/[^\d]/g, '');

export const SettingsSchema = z.object({
  default_hourly_rate: z.string().transform(val => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      throw new Error('Invalid hourly rate');
    }
    return val;
  }).optional(),
  currency: z.enum(['PLN', 'USD', 'EUR', 'GBP']).optional(),
  daily_hours_target: z.string().transform(val => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0 || num > 24) {
      throw new Error('Daily hours must be between 0 and 24');
    }
    return val;
  }).optional(),
  home_address: z.string().optional(),
  home_latitude: z.string().optional(),
  home_longitude: z.string().optional(),
  search_radius_km: z.string().transform(val => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 1 || num > 50) {
      throw new Error('Search radius must be between 1 and 50 km');
    }
    return val;
  }).optional(),

  // Company settings (for invoices)
  company_name: z.string().min(1).max(255).optional(),
  company_nip: z
    .string()
    .transform((val) => digitsOnly(val))
    .refine((val) => val === '' || /^\d{10}$/.test(val), 'Company NIP must be 10 digits')
    .optional(),
  company_regon: z
    .string()
    .transform((val) => digitsOnly(val))
    .refine((val) => val === '' || /^\d{9}(\d{5})?$/.test(val), 'Company REGON must be 9 or 14 digits')
    .optional(),
  company_address: z.string().max(255).optional(),
  company_city: z.string().max(120).optional(),
  company_postal_code: z.string().max(32).optional(),
  company_email: z.string().email().optional(),
  company_phone: z.string().max(64).optional(),
  company_bank_account: z.string().max(64).optional(),
});

export type SettingsInput = z.infer<typeof SettingsSchema>;

