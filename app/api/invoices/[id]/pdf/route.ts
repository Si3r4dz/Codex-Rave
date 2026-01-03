import { NextResponse } from 'next/server';
import { InvoiceService } from '@/lib/services/invoice.service';
import { handleApiError } from '@/lib/utils/api-error';
import { sanitizeFilenameFromInvoiceNumber } from '@/lib/utils/invoice-files';
import fs from 'fs/promises';

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

    // Ensure PDF exists
    let pdfPath = data.invoice.pdf_path;
    if (!pdfPath) {
      pdfPath = await invoiceService.generateAndPersistPdf(id);
    }

    // Read PDF file
    const pdfBuffer = await fs.readFile(pdfPath);

    // Generate filename for download
    const filename = sanitizeFilenameFromInvoiceNumber(data.invoice.invoice_number, 'pdf');

    // Return PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error, 'Failed to download PDF');
  }
}

export const dynamic = 'force-dynamic';

