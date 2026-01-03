import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/api-error';
import { ClientService } from '@/lib/services/client.service';
import { InvoiceService } from '@/lib/services/invoice.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const invoiceIdParam = url.searchParams.get('invoiceId');

    const invoiceService = new InvoiceService();

    let invoiceId: number;
    if (invoiceIdParam) {
      invoiceId = Number(invoiceIdParam);
      if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
        return NextResponse.json({ error: 'invoiceId must be a positive integer' }, { status: 400 });
      }
    } else {
      const clientService = new ClientService();
      const uniqueNip = String(Date.now() % 10_000_000_000).padStart(10, '0');
      const client = await clientService.createClient({
        name: 'Debug Client (FA3)',
        nip: uniqueNip,
        address: 'Testowa 1',
        city: 'Wrocław',
        postal_code: '50-001',
        email: 'debug@example.com',
        phone: '+48 500 000 000',
      });

      const today = new Date().toISOString().slice(0, 10);
      const deadline = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);

      const inv = await invoiceService.createInvoice({
        issue_date: today,
        sale_date: today,
        client_id: client.id,
        payment_method: 'bank_transfer',
        payment_deadline: deadline,
        currency: 'PLN',
        notes: 'Debug invoice for FA(3) XML validation',
        items: [
          { name: 'Usługa A', quantity: '1', unit: 'szt', unit_price_grosze: 10000, vat_rate: 23 },
          { name: 'Usługa B', quantity: '2.5', unit: 'h', unit_price_grosze: 8000, vat_rate: 8 },
        ],
      });

      invoiceId = inv.id;
    }

    const xmlPath = await invoiceService.generateAndPersistXml(invoiceId);
    return NextResponse.json({ invoiceId, xmlPath }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Failed to generate FA(3) XML');
  }
}


