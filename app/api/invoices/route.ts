import { NextResponse } from 'next/server';
import { InvoiceService } from '@/lib/services/invoice.service';
import { CreateInvoiceSchema } from '@/lib/schemas/invoice';
import { handleApiError } from '@/lib/utils/api-error';

const invoiceService = new InvoiceService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || undefined;
    const status = searchParams.get('status') as any;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const result = await invoiceService.getAllInvoices({
      q,
      status,
      from,
      to,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch invoices');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = CreateInvoiceSchema.parse(body);

    const invoice = await invoiceService.createInvoice(validatedData);

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create invoice');
  }
}

export const dynamic = 'force-dynamic';

