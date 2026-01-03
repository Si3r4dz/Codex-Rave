import PDFDocument from 'pdfkit';
import type { Invoice, InvoiceItem, Client } from '@/types';
import type { CompanySettings } from '@/types/settings';
import { groszeToPlnString } from './invoice-calculations';

export interface InvoicePdfData {
  invoice: Invoice;
  client: Client;
  company: CompanySettings;
  items: InvoiceItem[];
}

export function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const { invoice, client, company, items } = data;

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Faktura ${invoice.invoice_number}`,
          Author: company.company_name || 'Company',
          Subject: `Invoice ${invoice.invoice_number}`,
          Creator: 'Freelance Dashboard',
        },
        autoFirstPage: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Register system fonts that support Polish characters
      // macOS: Use system fonts, Linux: fallback to DejaVu, Windows: Arial
      try {
        // Try macOS system fonts first
        doc.registerFont('Regular', '/System/Library/Fonts/Supplemental/Arial.ttf');
        doc.registerFont('Bold', '/System/Library/Fonts/Supplemental/Arial Bold.ttf');
        doc.registerFont('Italic', '/System/Library/Fonts/Supplemental/Arial Italic.ttf');
      } catch {
        try {
          // Fallback to Linux DejaVu fonts
          doc.registerFont('Regular', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
          doc.registerFont('Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf');
          doc.registerFont('Italic', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf');
        } catch {
          // Final fallback: use Courier (monospace but works)
          doc.registerFont('Regular', 'Courier');
          doc.registerFont('Bold', 'Courier-Bold');
          doc.registerFont('Italic', 'Courier-Oblique');
        }
      }
      
      const regularFont = 'Regular';
      const boldFont = 'Bold';
      const italicFont = 'Italic';

      // Header
      doc.fontSize(24).font(boldFont).text('FAKTURA VAT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font(regularFont).text(invoice.invoice_number, { align: 'center' });
  doc.moveDown(1.5);

  // Seller and Buyer blocks side by side
  const leftColumn = 50;
  const rightColumn = 320;
  const currentY = doc.y;

      // Seller (left)
      doc.fontSize(10).font(boldFont).text('Sprzedawca:', leftColumn, currentY);
      doc.moveDown(0.3);
      doc.font(regularFont);
  doc.text(company.company_name || 'N/A', leftColumn);
  if (company.company_nip) {
    doc.text(`NIP: ${company.company_nip}`, leftColumn);
  }
  if (company.company_regon) {
    doc.text(`REGON: ${company.company_regon}`, leftColumn);
  }
  if (company.company_address) {
    doc.text(company.company_address, leftColumn);
  }
  const cityLine = [company.company_postal_code, company.company_city].filter(Boolean).join(' ');
  if (cityLine) {
    doc.text(cityLine, leftColumn);
  }
  if (company.company_email) {
    doc.text(`Email: ${company.company_email}`, leftColumn);
  }
  if (company.company_phone) {
    doc.text(`Tel: ${company.company_phone}`, leftColumn);
  }

      // Buyer (right)
      doc.fontSize(10).font(boldFont).text('Nabywca:', rightColumn, currentY);
      doc.moveDown(0.3);
      doc.font(regularFont);
  doc.text(client.name, rightColumn);
  doc.text(`NIP: ${client.nip}`, rightColumn);
  if (client.address) {
    doc.text(client.address, rightColumn);
  }
  const clientCityLine = [client.postal_code, client.city].filter(Boolean).join(' ');
  if (clientCityLine) {
    doc.text(clientCityLine, rightColumn);
  }
  if (client.email) {
    doc.text(`Email: ${client.email}`, rightColumn);
  }
  if (client.phone) {
    doc.text(`Tel: ${client.phone}`, rightColumn);
  }

      doc.moveDown(2);

      // Invoice details
      doc.fontSize(10).font(regularFont);
  const detailsY = doc.y;
  doc.text(`Data wystawienia: ${invoice.issue_date}`, leftColumn, detailsY);
  doc.text(`Data sprzedaży: ${invoice.sale_date}`, leftColumn);
  doc.text(`Termin płatności: ${invoice.payment_deadline || 'N/A'}`, leftColumn);
  doc.text(`Sposób płatności: ${formatPaymentMethod(invoice.payment_method)}`, leftColumn);
  doc.text(`Waluta: ${invoice.currency}`, leftColumn);

  doc.moveDown(1.5);

  // Line items table
  const tableTop = doc.y;
  const colLp = leftColumn;
  const colNazwa = colLp + 30;
  const colIlosc = colNazwa + 180;
  const colJm = colIlosc + 50;
  const colCenaNetto = colJm + 30;
  const colVAT = colCenaNetto + 60;
  const colWartoscNetto = colVAT + 40;
  const colWartoscBrutto = colWartoscNetto + 60;

      // Table header
      doc.fontSize(9).font(boldFont);
  doc.text('Lp.', colLp, tableTop);
  doc.text('Nazwa', colNazwa, tableTop);
  doc.text('Ilość', colIlosc, tableTop);
  doc.text('J.m.', colJm, tableTop);
  doc.text('Cena netto', colCenaNetto, tableTop);
  doc.text('VAT%', colVAT, tableTop);
  doc.text('Netto', colWartoscNetto, tableTop);
  doc.text('Brutto', colWartoscBrutto, tableTop);

  // Horizontal line below header
  doc.moveTo(leftColumn, tableTop + 15).lineTo(545, tableTop + 15).stroke();

      // Table rows
      doc.font(regularFont).fontSize(9);
  let rowY = tableTop + 20;
  items.forEach((item, index) => {
    const unitPricePln = groszeToPlnString(item.unit_price_grosze);
    const netPln = groszeToPlnString(item.net_grosze);
    const grossPln = groszeToPlnString(item.gross_grosze);
    const vatRateDisplay = typeof item.vat_rate === 'number' ? `${item.vat_rate}%` : item.vat_rate;

    doc.text(`${index + 1}`, colLp, rowY);
    doc.text(item.name, colNazwa, rowY, { width: 170 });
    doc.text(item.quantity, colIlosc, rowY);
    doc.text(item.unit, colJm, rowY);
    doc.text(unitPricePln, colCenaNetto, rowY);
    doc.text(vatRateDisplay, colVAT, rowY);
    doc.text(netPln, colWartoscNetto, rowY);
    doc.text(grossPln, colWartoscBrutto, rowY);

    rowY += 20;
  });

  // Horizontal line after items
  doc.moveTo(leftColumn, rowY).lineTo(545, rowY).stroke();
  rowY += 10;

      // Totals
      doc.fontSize(10).font(boldFont);
  const totalNetPln = groszeToPlnString(invoice.subtotal_grosze);
  const totalVatPln = groszeToPlnString(invoice.tax_grosze);
  const totalGrossPln = groszeToPlnString(invoice.total_grosze);

  doc.text('Suma netto:', colWartoscNetto - 100, rowY);
  doc.text(totalNetPln, colWartoscNetto, rowY);
  rowY += 15;

  doc.text('Suma VAT:', colWartoscNetto - 100, rowY);
  doc.text(totalVatPln, colWartoscNetto, rowY);
  rowY += 15;

  doc.text('Suma brutto:', colWartoscNetto - 100, rowY);
  doc.text(totalGrossPln, colWartoscNetto, rowY);
  rowY += 20;

      // Payment instructions (if bank account available)
      if (company.company_bank_account) {
        doc.fontSize(9).font(regularFont);
        doc.text('Numer rachunku bankowego:', leftColumn, rowY);
        doc.text(company.company_bank_account, leftColumn, rowY + 12);
        rowY += 35;
      }

      // Notes (if any)
      if (invoice.notes) {
        doc.fontSize(9).font(italicFont);
        doc.text('Uwagi:', leftColumn, rowY);
        doc.text(invoice.notes, leftColumn, rowY + 12, { width: 495 });
        rowY += 35;
      }

      // Footer watermark
      doc.fontSize(8).font(italicFont).fillColor('gray');
      doc.text(
        'Wygenerowano automatycznie - nie wymaga podpisu',
        leftColumn,
        doc.page.height - 80,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    cash: 'Gotówka',
    bank_transfer: 'Przelew',
    card: 'Karta',
    other: 'Inne',
  };
  return map[method] || method;
}

