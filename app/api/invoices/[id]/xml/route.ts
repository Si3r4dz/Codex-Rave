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

    // Ensure XML exists
    let xmlPath = data.invoice.xml_path;
    if (!xmlPath) {
      xmlPath = await invoiceService.generateAndPersistXml(id);
    }

    // Read XML file
    const xmlContent = await fs.readFile(xmlPath, 'utf-8');

    // Generate filename for download
    const filename = sanitizeFilenameFromInvoiceNumber(data.invoice.invoice_number, 'xml');

    // Return XML with appropriate headers
    return new NextResponse(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error, 'Failed to download XML');
  }
}

export const dynamic = 'force-dynamic';

