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
});

export type SettingsInput = z.infer<typeof SettingsSchema>;

