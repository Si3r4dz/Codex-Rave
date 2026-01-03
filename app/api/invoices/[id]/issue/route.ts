import { NextResponse } from 'next/server';
import { InvoiceService } from '@/lib/services/invoice.service';
import { handleApiError } from '@/lib/utils/api-error';

const invoiceService = new InvoiceService();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const result = await invoiceService.issueInvoice(id);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'Failed to issue invoice');
  }
}

export const dynamic = 'force-dynamic';

