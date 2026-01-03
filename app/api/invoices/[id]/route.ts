import { NextResponse } from 'next/server';
import { InvoiceService } from '@/lib/services/invoice.service';
import { handleApiError } from '@/lib/utils/api-error';

const invoiceService = new InvoiceService();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const data = await invoiceService.getInvoice(id);
    if (!data) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch invoice');
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    await invoiceService.deleteInvoice(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to delete invoice');
  }
}

export const dynamic = 'force-dynamic';
