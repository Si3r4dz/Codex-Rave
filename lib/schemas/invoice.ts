import { z } from 'zod';

const digitsOnly = (value: string) => value.replace(/[^\d]/g, '');

export const InvoiceStatusSchema = z.enum(['draft', 'issued', 'cancelled']);
export const PaymentMethodSchema = z.enum(['cash', 'bank_transfer', 'card', 'other']);
export const VatRateSchema = z.union([z.literal(23), z.literal(8), z.literal(5), z.literal(0), z.literal('ZW'), z.literal('NP')]);

export const NipSchema = z
  .string()
  .transform((val) => digitsOnly(val))
  .refine((val) => /^\d{10}$/.test(val), 'NIP must be 10 digits');

export const DateYmdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

// Quantity as decimal string, up to 3 decimal places, positive
export const QuantitySchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .transform((v) => v.trim().replace(',', '.'))
  .refine((v) => /^\d+(\.\d{1,3})?$/.test(v), 'Quantity must be a positive number with up to 3 decimals')
  .refine((v) => parseFloat(v) > 0, 'Quantity must be greater than 0');

export const MoneyGroszeSchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'string' ? Number(v) : v))
  .refine((n) => Number.isInteger(n) && n >= 0, 'Amount must be a non-negative integer in grosze');

export const ClientSchema = z.object({
  name: z.string().min(1).max(255),
  nip: NipSchema,
  address: z.string().max(255).optional(),
  city: z.string().max(120).optional(),
  postal_code: z.string().max(32).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(64).optional(),
});

export const InvoiceItemSchema = z.object({
  name: z.string().min(1).max(255),
  quantity: QuantitySchema,
  unit: z.string().min(1).max(32),
  unit_price_grosze: MoneyGroszeSchema,
  vat_rate: VatRateSchema,
});

export const CreateInvoiceSchema = z.object({
  invoice_number: z.string().min(1).max(64).optional(),
  issue_date: DateYmdSchema,
  sale_date: DateYmdSchema,
  client_id: z.number().int().positive(),
  status: InvoiceStatusSchema.optional(),
  payment_method: PaymentMethodSchema,
  payment_deadline: DateYmdSchema.nullish(),
  currency: z.string().min(3).max(8),
  exchange_rate: z.string().max(32).nullish(),
  notes: z.string().max(2000).nullish(),
  items: z.array(InvoiceItemSchema).min(1),
});

export type ClientInput = z.infer<typeof ClientSchema>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type InvoiceItemInput = z.infer<typeof InvoiceItemSchema>;


