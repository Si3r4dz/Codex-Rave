export type InvoiceStatus = 'draft' | 'issued' | 'cancelled';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'other';

export type VatRate = 23 | 8 | 5 | 0 | 'ZW' | 'NP';

export interface Client {
  id: number;
  name: string;
  nip: string; // digits only
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  email?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  issue_date: string; // YYYY-MM-DD
  sale_date: string; // YYYY-MM-DD
  client_id: number;
  status: InvoiceStatus;
  payment_method: PaymentMethod;
  payment_deadline?: string | null; // YYYY-MM-DD
  currency: string; // ISO 4217, typically PLN
  exchange_rate?: string | null; // decimal string
  notes?: string | null;
  subtotal_grosze: number;
  tax_grosze: number;
  total_grosze: number;
  xml_path?: string | null;
  pdf_path?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  name: string;
  quantity: string; // decimal string (up to 3 decimals)
  unit: string; // e.g. "szt", "h"
  unit_price_grosze: number; // net unit price, grosze
  vat_rate: VatRate;
  net_grosze: number;
  vat_grosze: number;
  gross_grosze: number;
  created_at: string;
}

export interface InvoiceSequence {
  id: number;
  year: number;
  month: number;
  last_number: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceWithItems {
  invoice: Invoice;
  client: Client;
  items: InvoiceItem[];
}

export interface CreateClientInput {
  name: string;
  nip: string;
  address?: string;
  city?: string;
  postal_code?: string;
  email?: string;
  phone?: string;
}

export interface CreateInvoiceItemInput {
  name: string;
  quantity: string;
  unit: string;
  unit_price_grosze: number;
  vat_rate: VatRate;
}

export interface CreateInvoiceInput {
  invoice_number?: string; // optional manual override
  issue_date: string;
  sale_date: string;
  client_id: number;
  status?: InvoiceStatus;
  payment_method: PaymentMethod;
  payment_deadline?: string;
  currency: string;
  exchange_rate?: string;
  notes?: string;
  items: CreateInvoiceItemInput[];
}


