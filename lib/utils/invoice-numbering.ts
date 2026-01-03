import db, { invoiceSequencesDb, invoicesDb } from '@/lib/db';

export function formatInvoiceNumber(year: number, month: number, sequence: number): string {
  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const nnnn = String(sequence).padStart(4, '0');
  return `FV/${yyyy}/${mm}/${nnnn}`;
}

export function parseYearMonth(issueDate: string): { year: number; month: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
    throw new Error('issue_date must be in YYYY-MM-DD format');
  }
  const [y, m] = issueDate.split('-');
  const year = Number(y);
  const month = Number(m);
  if (!Number.isInteger(year) || year < 2000 || year > 9999) throw new Error('Invalid year in issue_date');
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('Invalid month in issue_date');
  return { year, month };
}

export function generateNextInvoiceNumber(issueDate: string, manualOverride?: string): string {
  if (manualOverride) {
    const trimmed = manualOverride.trim();
    if (!trimmed) throw new Error('Invoice number cannot be empty');
    if (invoicesDb.getByNumber(trimmed)) {
      throw new Error('Invoice number already exists');
    }
    return trimmed;
  }

  const { year, month } = parseYearMonth(issueDate);

  const tx = db.transaction(() => {
    const existing = invoiceSequencesDb.get(year, month);
    const next = (existing?.last_number ?? 0) + 1;
    invoiceSequencesDb.upsert(year, month, next);
    return formatInvoiceNumber(year, month, next);
  });

  const generated = tx();

  // Extra guard: should not happen with sequences, but keep it safe.
  if (invoicesDb.getByNumber(generated)) {
    throw new Error('Generated invoice number already exists');
  }

  return generated;
}


