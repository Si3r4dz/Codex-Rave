import { z } from 'zod';

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
});

export type SettingsInput = z.infer<typeof SettingsSchema>;

