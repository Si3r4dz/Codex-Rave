import db, { invoicesDb, settingsDb } from '@/lib/db';
import type { Client, CreateInvoiceInput, Invoice, InvoiceItem, InvoiceStatus, PaymentMethod, VatRate } from '@/types';
import { calculateInvoiceTotals, calculateLineAmounts, normalizeQuantity } from '@/lib/utils/invoice-calculations';
import { formatInvoiceNumber, parseYearMonth } from '@/lib/utils/invoice-numbering';
import { ensureInvoiceDirectories, getXmlPath, getPdfPath } from '@/lib/utils/invoice-files';
import { generateFa3Xml, validateFa3Xml } from '@/lib/utils/ksef-fa3-xml';
import { generateInvoicePdf } from '@/lib/utils/invoice-pdf-generator';
import type { CompanySettings } from '@/types/settings';
import fs from 'fs/promises';

export interface InvoiceListItem extends Invoice {
  client_name: string;
  client_nip: string;
}

export class InvoiceService {
  async getInvoice(id: number): Promise<{ invoice: Invoice; client: Client; items: InvoiceItem[] } | undefined> {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as Invoice | undefined;
    if (!invoice) return undefined;

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(invoice.client_id) as Client | undefined;
    if (!client) throw new Error('Client not found');

    const itemsRaw = db
      .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC')
      .all(invoice.id) as any[];

    const items = itemsRaw.map((r) => ({
      ...r,
      vat_rate: r.vat_rate === 'ZW' || r.vat_rate === 'NP' ? r.vat_rate : Number(r.vat_rate),
    })) as InvoiceItem[];

    return { invoice, client, items };
  }

  async getAllInvoices(filters?: {
    q?: string;
    status?: InvoiceStatus;
    from?: string; // YYYY-MM-DD
    to?: string; // YYYY-MM-DD
    limit?: number;
    offset?: number;
  }): Promise<{ rows: InvoiceListItem[]; total: number }> {
    const q = filters?.q?.trim();
    const status = filters?.status;
    const from = filters?.from;
    const to = filters?.to;
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);
    const offset = Math.max(filters?.offset ?? 0, 0);

    const where: string[] = [];
    const params: any[] = [];

    if (q) {
      where.push('(i.invoice_number LIKE ? OR c.name LIKE ? OR c.nip LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (status) {
      where.push('i.status = ?');
      params.push(status);
    }
    if (from) {
      where.push('i.issue_date >= ?');
      params.push(from);
    }
    if (to) {
      where.push('i.issue_date <= ?');
      params.push(to);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalRow = db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM invoices i
        INNER JOIN clients c ON c.id = i.client_id
        ${whereSql}
      `
      )
      .get(...params) as { count: number };

    const rows = db
      .prepare(
        `
        SELECT
          i.*,
          c.name as client_name,
          c.nip as client_nip
        FROM invoices i
        INNER JOIN clients c ON c.id = i.client_id
        ${whereSql}
        ORDER BY i.issue_date DESC, i.id DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, limit, offset) as InvoiceListItem[];

    return { rows, total: totalRow.count };
  }

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    const tx = db.transaction((data: CreateInvoiceInput) => {
      const status: InvoiceStatus = data.status ?? 'draft';

      // Manual override (must be unique)
      let invoiceNumber = data.invoice_number?.trim();
      if (invoiceNumber) {
        const exists = db.prepare('SELECT 1 FROM invoices WHERE invoice_number = ?').get(invoiceNumber);
        if (exists) throw new Error('Invoice number already exists');
      } else {
        const { year, month } = parseYearMonth(data.issue_date);
        const seq = db.prepare('SELECT * FROM invoice_sequences WHERE year = ? AND month = ?').get(year, month) as
          | { last_number: number }
          | undefined;
        const next = (seq?.last_number ?? 0) + 1;
        db.prepare(
          `
          INSERT INTO invoice_sequences (year, month, last_number, created_at, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(year, month) DO UPDATE SET
            last_number = excluded.last_number,
            updated_at = CURRENT_TIMESTAMP
        `
        ).run(year, month, next);
        invoiceNumber = formatInvoiceNumber(year, month, next);
      }

      const computedItems = data.items.map((it) => {
        const quantity = normalizeQuantity(it.quantity);
        const amounts = calculateLineAmounts({
          quantity,
          unit_price_grosze: it.unit_price_grosze,
          vat_rate: it.vat_rate as VatRate,
        });
        return {
          name: it.name.trim(),
          quantity,
          unit: it.unit.trim(),
          unit_price_grosze: it.unit_price_grosze,
          vat_rate: it.vat_rate,
          ...amounts,
        };
      });

      const totals = calculateInvoiceTotals(
        computedItems.map((i) => ({
          net_grosze: i.net_grosze,
          vat_grosze: i.vat_grosze,
          gross_grosze: i.gross_grosze,
        }))
      );

      const insertInvoice = db.prepare(`
        INSERT INTO invoices (
          invoice_number, issue_date, sale_date, client_id, status, payment_method,
          payment_deadline, currency, exchange_rate, notes,
          subtotal_grosze, tax_grosze, total_grosze,
          xml_path, pdf_path,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      const invResult = insertInvoice.run(
        invoiceNumber,
        data.issue_date,
        data.sale_date,
        data.client_id,
        status,
        data.payment_method as PaymentMethod,
        data.payment_deadline ?? null,
        data.currency,
        data.exchange_rate ?? null,
        data.notes ?? null,
        totals.subtotal_grosze,
        totals.tax_grosze,
        totals.total_grosze
      );

      const invoiceId = invResult.lastInsertRowid as number;

      const insertItem = db.prepare(`
        INSERT INTO invoice_items (
          invoice_id, name, quantity, unit,
          unit_price_grosze, vat_rate,
          net_grosze, vat_grosze, gross_grosze,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      for (const item of computedItems) {
        insertItem.run(
          invoiceId,
          item.name,
          item.quantity,
          item.unit,
          item.unit_price_grosze,
          String(item.vat_rate),
          item.net_grosze,
          item.vat_grosze,
          item.gross_grosze
        );
      }

      const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as Invoice;
      return invoice;
    });

    return tx(input);
  }

  async updateInvoice(id: number, input: Omit<CreateInvoiceInput, 'client_id'> & { client_id?: number }): Promise<Invoice> {
    const tx = db.transaction((invoiceId: number, data: any) => {
      const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as Invoice | undefined;
      if (!existing) throw new Error('Invoice not found');

      const invoiceNumber = data.invoice_number?.trim() || existing.invoice_number;
      if (invoiceNumber !== existing.invoice_number) {
        const dup = db.prepare('SELECT 1 FROM invoices WHERE invoice_number = ? AND id != ?').get(invoiceNumber, invoiceId);
        if (dup) throw new Error('Invoice number already exists');
      }

      const computedItems = data.items.map((it: any) => {
        const quantity = normalizeQuantity(it.quantity);
        const amounts = calculateLineAmounts({
          quantity,
          unit_price_grosze: it.unit_price_grosze,
          vat_rate: it.vat_rate as VatRate,
        });
        return {
          name: it.name.trim(),
          quantity,
          unit: it.unit.trim(),
          unit_price_grosze: it.unit_price_grosze,
          vat_rate: it.vat_rate,
          ...amounts,
        };
      });

      const totals = calculateInvoiceTotals(
        computedItems.map((i: any) => ({
          net_grosze: i.net_grosze,
          vat_grosze: i.vat_grosze,
          gross_grosze: i.gross_grosze,
        }))
      );

      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(invoiceId);

      const insertItem = db.prepare(`
        INSERT INTO invoice_items (
          invoice_id, name, quantity, unit,
          unit_price_grosze, vat_rate,
          net_grosze, vat_grosze, gross_grosze,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      for (const item of computedItems) {
        insertItem.run(
          invoiceId,
          item.name,
          item.quantity,
          item.unit,
          item.unit_price_grosze,
          String(item.vat_rate),
          item.net_grosze,
          item.vat_grosze,
          item.gross_grosze
        );
      }

      db.prepare(
        `
        UPDATE invoices
        SET
          invoice_number = ?,
          issue_date = ?,
          sale_date = ?,
          client_id = ?,
          status = ?,
          payment_method = ?,
          payment_deadline = ?,
          currency = ?,
          exchange_rate = ?,
          notes = ?,
          subtotal_grosze = ?,
          tax_grosze = ?,
          total_grosze = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      ).run(
        invoiceNumber,
        data.issue_date ?? existing.issue_date,
        data.sale_date ?? existing.sale_date,
        data.client_id ?? existing.client_id,
        (data.status ?? existing.status) as InvoiceStatus,
        (data.payment_method ?? existing.payment_method) as PaymentMethod,
        data.payment_deadline ?? existing.payment_deadline ?? null,
        data.currency ?? existing.currency,
        data.exchange_rate ?? existing.exchange_rate ?? null,
        data.notes ?? existing.notes ?? null,
        totals.subtotal_grosze,
        totals.tax_grosze,
        totals.total_grosze,
        invoiceId
      );

      return db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as Invoice;
    });

    return tx(id, input);
  }

  async deleteInvoice(id: number): Promise<void> {
    const deleted = db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
    if (deleted.changes === 0) {
      throw new Error('Invoice not found');
    }
  }

  async generateAndPersistXml(invoiceId: number): Promise<string> {
    const data = await this.getInvoice(invoiceId);
    if (!data) throw new Error('Invoice not found');

    await ensureInvoiceDirectories();

    const flat = settingsDb.getAll();
    const company: CompanySettings = {
      company_name: flat.company_name,
      company_nip: flat.company_nip,
      company_regon: flat.company_regon,
      company_address: flat.company_address,
      company_city: flat.company_city,
      company_postal_code: flat.company_postal_code,
      company_email: flat.company_email,
      company_phone: flat.company_phone,
      company_bank_account: flat.company_bank_account,
    };

    const xml = generateFa3Xml({
      invoice: data.invoice,
      client: data.client,
      items: data.items,
      company,
    });

    const xmlPath = getXmlPath(data.invoice.invoice_number);
    await fs.writeFile(xmlPath, xml, { encoding: 'utf8' });

    await validateFa3Xml(xmlPath);

    invoicesDb.update(invoiceId, { xml_path: xmlPath });

    return xmlPath;
  }

  async generateAndPersistPdf(invoiceId: number): Promise<string> {
    const data = await this.getInvoice(invoiceId);
    if (!data) throw new Error('Invoice not found');

    await ensureInvoiceDirectories();

    const flat = settingsDb.getAll();
    const company: CompanySettings = {
      company_name: flat.company_name,
      company_nip: flat.company_nip,
      company_regon: flat.company_regon,
      company_address: flat.company_address,
      company_city: flat.company_city,
      company_postal_code: flat.company_postal_code,
      company_email: flat.company_email,
      company_phone: flat.company_phone,
      company_bank_account: flat.company_bank_account,
    };

    const pdfBuffer = await generateInvoicePdf({
      invoice: data.invoice,
      client: data.client,
      items: data.items,
      company,
    });

    const pdfPath = getPdfPath(data.invoice.invoice_number);
    await fs.writeFile(pdfPath, pdfBuffer);

    invoicesDb.update(invoiceId, { pdf_path: pdfPath });

    return pdfPath;
  }

  async issueInvoice(invoiceId: number): Promise<{ invoice: Invoice; xmlPath: string; pdfPath: string }> {
    const data = await this.getInvoice(invoiceId);
    if (!data) throw new Error('Invoice not found');

    // Guard: if already issued, just ensure paths exist
    if (data.invoice.status === 'issued') {
      let xmlPath = data.invoice.xml_path;
      let pdfPath = data.invoice.pdf_path;

      if (!xmlPath) {
        xmlPath = await this.generateAndPersistXml(invoiceId);
      }
      if (!pdfPath) {
        pdfPath = await this.generateAndPersistPdf(invoiceId);
      }

      return { invoice: data.invoice, xmlPath, pdfPath };
    }

    // Update status to issued
    invoicesDb.update(invoiceId, { status: 'issued' as InvoiceStatus });

    // Generate XML and PDF
    const xmlPath = await this.generateAndPersistXml(invoiceId);
    const pdfPath = await this.generateAndPersistPdf(invoiceId);

    // Fetch updated invoice
    const updated = await this.getInvoice(invoiceId);
    if (!updated) throw new Error('Invoice not found after update');

    return { invoice: updated.invoice, xmlPath, pdfPath };
  }
}


