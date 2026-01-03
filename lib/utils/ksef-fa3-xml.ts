import type { Client, Invoice, InvoiceItem, VatRate } from '@/types';
import type { CompanySettings } from '@/types/settings';
import { groszeToPlnString } from '@/lib/utils/invoice-calculations';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isoUtcDateTimeZ(d: Date): string {
  // XML schema requires Zulu time in allowed range; use seconds precision.
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-` +
    `${pad(d.getUTCMonth() + 1)}-` +
    `${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}:` +
    `${pad(d.getUTCMinutes())}:` +
    `${pad(d.getUTCSeconds())}Z`
  );
}

function tag(name: string, content?: string | number | null, attrs?: Record<string, string>): string {
  const attrStr = attrs
    ? Object.entries(attrs)
        .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
        .join('')
    : '';
  if (content === undefined || content === null) return `<${name}${attrStr}/>`;
  return `<${name}${attrStr}>${escapeXml(String(content))}</${name}>`;
}

function normalizeDigits(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function required(value: string | undefined | null, field: string): string {
  const v = value?.trim();
  if (!v) throw new Error(`Missing required field: ${field}`);
  return v;
}

function vatRateToFa3Stawka(rate: VatRate): string {
  if (rate === 'ZW') return 'zw';
  if (rate === 'NP') return 'np I';
  if (rate === 0) return '0 KR';
  return String(rate);
}

function formatAddressLine(address?: string | null, postal?: string | null, city?: string | null): string | null {
  const a = address?.trim() || '';
  const pc = postal?.trim() || '';
  const c = city?.trim() || '';
  const tail = [pc, c].filter(Boolean).join(' ');
  const line = [a, tail].filter(Boolean).join(', ').trim();
  return line || null;
}

function sumByVat(items: InvoiceItem[]): {
  net23: number;
  vat23: number;
  net8: number;
  vat8: number;
  net5: number;
  vat5: number;
  net0: number;
  netZw: number;
  netNp: number;
} {
  let net23 = 0,
    vat23 = 0,
    net8 = 0,
    vat8 = 0,
    net5 = 0,
    vat5 = 0,
    net0 = 0,
    netZw = 0,
    netNp = 0;

  for (const it of items) {
    if (it.vat_rate === 23) {
      net23 += it.net_grosze;
      vat23 += it.vat_grosze;
    } else if (it.vat_rate === 8) {
      net8 += it.net_grosze;
      vat8 += it.vat_grosze;
    } else if (it.vat_rate === 5) {
      net5 += it.net_grosze;
      vat5 += it.vat_grosze;
    } else if (it.vat_rate === 0) {
      net0 += it.net_grosze;
    } else if (it.vat_rate === 'ZW') {
      netZw += it.net_grosze;
    } else if (it.vat_rate === 'NP') {
      netNp += it.net_grosze;
    }
  }

  return { net23, vat23, net8, vat8, net5, vat5, net0, netZw, netNp };
}

export function generateFa3Xml(input: {
  invoice: Invoice;
  client: Client;
  company: CompanySettings;
  items: InvoiceItem[];
}): string {
  const { invoice, client, company, items } = input;

  const companyName = required(company.company_name, 'company.company_name');
  const companyNip = normalizeDigits(required(company.company_nip, 'company.company_nip'));
  if (!/^\d{10}$/.test(companyNip)) throw new Error('Invalid company NIP (must be 10 digits)');

  const clientName = required(client.name, 'client.name');
  const clientNip = normalizeDigits(required(client.nip, 'client.nip'));
  if (!/^\d{10}$/.test(clientNip)) throw new Error('Invalid client NIP (must be 10 digits)');

  const sellerAddr = required(
    formatAddressLine(company.company_address ?? null, company.company_postal_code ?? null, company.company_city ?? null) ??
      undefined,
    'company address (company_address/company_postal_code/company_city)'
  );
  const buyerAddr =
    formatAddressLine(client.address ?? null, client.postal_code ?? null, client.city ?? null) ??
    // Buyer address is optional in schema; keep empty if missing.
    null;

  const currency = required(invoice.currency, 'invoice.currency');
  const issueDate = required(invoice.issue_date, 'invoice.issue_date');
  const saleDate = required(invoice.sale_date, 'invoice.sale_date');
  const invoiceNumber = required(invoice.invoice_number, 'invoice.invoice_number');

  const totalsByVat = sumByVat(items);
  const totalGrossPln = groszeToPlnString(invoice.total_grosze);

  const hasZw = items.some((i) => i.vat_rate === 'ZW');

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<Faktura xmlns="http://crd.gov.pl/wzor/2025/06/25/13775/">');

  // Naglowek (required)
  lines.push('<Naglowek>');
  lines.push(
    tag('KodFormularza', 'FA', {
      kodSystemowy: 'FA (3)',
      wersjaSchemy: '1-0E',
    })
  );
  lines.push(tag('WariantFormularza', 3));
  lines.push(tag('DataWytworzeniaFa', isoUtcDateTimeZ(new Date())));
  lines.push(tag('SystemInfo', 'Codex-Rave'));
  lines.push('</Naglowek>');

  // Podmiot1 (seller) (required)
  lines.push('<Podmiot1>');
  lines.push('<DaneIdentyfikacyjne>');
  lines.push(tag('NIP', companyNip));
  lines.push(tag('Nazwa', companyName));
  lines.push('</DaneIdentyfikacyjne>');
  lines.push('<Adres>');
  lines.push(tag('KodKraju', 'PL'));
  lines.push(tag('AdresL1', sellerAddr));
  lines.push('</Adres>');
  if (company.company_email || company.company_phone) {
    lines.push('<DaneKontaktowe>');
    if (company.company_email) lines.push(tag('Email', company.company_email.trim()));
    if (company.company_phone) lines.push(tag('Telefon', company.company_phone.trim()));
    lines.push('</DaneKontaktowe>');
  }
  lines.push('</Podmiot1>');

  // Podmiot2 (buyer) (required)
  lines.push('<Podmiot2>');
  lines.push('<DaneIdentyfikacyjne>');
  lines.push(tag('NIP', clientNip));
  lines.push(tag('Nazwa', clientName));
  lines.push('</DaneIdentyfikacyjne>');
  if (buyerAddr) {
    lines.push('<Adres>');
    lines.push(tag('KodKraju', 'PL'));
    lines.push(tag('AdresL1', buyerAddr));
    lines.push('</Adres>');
  }
  // Required flags in schema
  lines.push(tag('JST', 2));
  lines.push(tag('GV', 2));
  lines.push('</Podmiot2>');

  // Fa (required)
  lines.push('<Fa>');
  lines.push(tag('KodWaluty', currency));
  lines.push(tag('P_1', issueDate));
  lines.push(tag('P_2', invoiceNumber));
  // Optional choice: we emit P_6 (common sale date)
  lines.push(tag('P_6', saleDate));

  // Optional VAT totals blocks (emit only when relevant)
  if (totalsByVat.net23 || totalsByVat.vat23) {
    lines.push(tag('P_13_1', groszeToPlnString(totalsByVat.net23)));
    lines.push(tag('P_14_1', groszeToPlnString(totalsByVat.vat23)));
  }
  if (totalsByVat.net8 || totalsByVat.vat8) {
    lines.push(tag('P_13_2', groszeToPlnString(totalsByVat.net8)));
    lines.push(tag('P_14_2', groszeToPlnString(totalsByVat.vat8)));
  }
  if (totalsByVat.net5 || totalsByVat.vat5) {
    lines.push(tag('P_13_3', groszeToPlnString(totalsByVat.net5)));
    lines.push(tag('P_14_3', groszeToPlnString(totalsByVat.vat5)));
  }

  // Other optional totals
  if (totalsByVat.net0) lines.push(tag('P_13_6_1', groszeToPlnString(totalsByVat.net0)));
  if (totalsByVat.netZw) lines.push(tag('P_13_7', groszeToPlnString(totalsByVat.netZw)));
  if (totalsByVat.netNp) lines.push(tag('P_13_8', groszeToPlnString(totalsByVat.netNp)));

  // Required: total due
  lines.push(tag('P_15', totalGrossPln));

  // Required: Adnotacje block
  lines.push('<Adnotacje>');
  lines.push(tag('P_16', 2));
  lines.push(tag('P_17', 2));
  lines.push(tag('P_18', 2));
  lines.push(tag('P_18A', 2));

  // Zwolnienie (required choice)
  lines.push('<Zwolnienie>');
  if (hasZw) {
    // If we have exempt items, mark exemption and provide a legal basis placeholder.
    // This can be refined later via explicit user-provided basis (P_19A/B/C).
    lines.push(tag('P_19', 1));
    lines.push(tag('P_19C', 'zw'));
  } else {
    lines.push(tag('P_19N', 1));
  }
  lines.push('</Zwolnienie>');

  // NoweSrodkiTransportu (required choice) - no
  lines.push('<NoweSrodkiTransportu>');
  lines.push(tag('P_22N', 1));
  lines.push('</NoweSrodkiTransportu>');

  // Required flag - no
  lines.push(tag('P_23', 2));

  // PMarzy (required choice) - no
  lines.push('<PMarzy>');
  lines.push(tag('P_PMarzyN', 1));
  lines.push('</PMarzy>');

  lines.push('</Adnotacje>');

  // Required: invoice type
  lines.push(tag('RodzajFaktury', 'VAT'));

  // Line items (optional in schema, but we emit them for normal invoices)
  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    lines.push('<FaWiersz>');
    lines.push(tag('NrWierszaFa', idx + 1));
    lines.push(tag('P_7', it.name));
    lines.push(tag('P_8A', it.unit));
    lines.push(tag('P_8B', it.quantity));
    lines.push(tag('P_9A', groszeToPlnString(it.unit_price_grosze)));
    lines.push(tag('P_11', groszeToPlnString(it.net_grosze)));
    lines.push(tag('P_12', vatRateToFa3Stawka(it.vat_rate as VatRate)));
    lines.push('</FaWiersz>');
  }

  lines.push('</Fa>');
  lines.push('</Faktura>');

  return lines.join('\n');
}

export async function validateFa3Xml(xmlPath: string): Promise<void> {
  const schemaPath = path.join(process.cwd(), 'lib', 'schemas', 'ksef', 'fa3', 'schemat.xsd');
  const catalogPath = path.join(process.cwd(), 'lib', 'schemas', 'ksef', 'fa3', 'catalog.xml');

  // Fail fast with clear errors when schema files are missing.
  await fs.access(schemaPath);
  await fs.access(catalogPath);
  await fs.access(xmlPath);

  try {
    await execFileAsync(
      'xmllint',
      [
        '--noout',
        '--nonet',
        '--catalogs',
        '--schema',
        schemaPath,
        xmlPath,
      ],
      {
        // libxml2 honors catalogs via flags and env; set both.
        env: { ...process.env, XML_CATALOG_FILES: catalogPath, SGML_CATALOG_FILES: catalogPath },
      }
    );
  } catch (err: any) {
    const stderr = typeof err?.stderr === 'string' ? err.stderr.trim() : '';
    const msg = stderr || err?.message || 'Unknown xmllint error';
    throw new Error(`FA(3) XML validation failed: ${msg}`);
  }
}


