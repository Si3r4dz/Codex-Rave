import path from 'path';
import fs from 'fs/promises';

const DATA_DIR = path.join(process.cwd(), 'data');
const INVOICES_DIR = path.join(DATA_DIR, 'invoices');
const XML_DIR = path.join(INVOICES_DIR, 'xml');
const PDF_DIR = path.join(INVOICES_DIR, 'pdf');

function assertSafeFilename(name: string): void {
  if (!name || name.length > 255) throw new Error('Invalid filename');
  if (name.includes('/') || name.includes('\\')) throw new Error('Invalid filename (path separators)');
  if (name.includes('..')) throw new Error('Invalid filename (path traversal)');
  if (path.isAbsolute(name)) throw new Error('Invalid filename (absolute path)');
}

export function sanitizeFilenameFromInvoiceNumber(invoiceNumber: string, ext: 'xml' | 'pdf'): string {
  const raw = invoiceNumber.trim();
  if (!raw) throw new Error('Invoice number cannot be empty');

  // FV/2026/01/0001 -> FV-2026-01-0001
  const dashed = raw.replace(/[\\/]+/g, '-');

  // Keep it filesystem-safe and deterministic.
  const safe = dashed
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '');

  const filename = `${safe}.${ext}`;
  assertSafeFilename(filename);
  return filename;
}

export async function ensureInvoiceDirectories(): Promise<void> {
  await fs.mkdir(XML_DIR, { recursive: true });
  await fs.mkdir(PDF_DIR, { recursive: true });
}

export function getXmlPath(invoiceNumber: string): string {
  const filename = sanitizeFilenameFromInvoiceNumber(invoiceNumber, 'xml');
  const full = path.join(XML_DIR, filename);
  // Defensive: ensure join didn't escape base dir
  if (!full.startsWith(XML_DIR + path.sep)) throw new Error('Resolved XML path escapes base directory');
  return full;
}

export function getPdfPath(invoiceNumber: string): string {
  const filename = sanitizeFilenameFromInvoiceNumber(invoiceNumber, 'pdf');
  const full = path.join(PDF_DIR, filename);
  if (!full.startsWith(PDF_DIR + path.sep)) throw new Error('Resolved PDF path escapes base directory');
  return full;
}


