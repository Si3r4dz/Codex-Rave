import { NextResponse } from 'next/server';
import { ClientService } from '@/lib/services/client.service';
import { ClientSchema } from '@/lib/schemas/invoice';
import { handleApiError } from '@/lib/utils/api-error';

const clientService = new ClientService();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    const client = await clientService.getClient(id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch client');
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = ClientSchema.parse(body);

    const client = await clientService.updateClient(id, validatedData);

    return NextResponse.json(client);
  } catch (error) {
    return handleApiError(error, 'Failed to update client');
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    await clientService.deleteClient(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to delete client');
  }
}

export const dynamic = 'force-dynamic';

