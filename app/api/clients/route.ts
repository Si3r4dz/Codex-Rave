import { NextResponse } from 'next/server';
import { ClientService } from '@/lib/services/client.service';
import { ClientSchema } from '@/lib/schemas/invoice';
import { handleApiError } from '@/lib/utils/api-error';

const clientService = new ClientService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const result = await clientService.getAllClients({ q, limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch clients');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = ClientSchema.parse(body);

    const client = await clientService.createClient(validatedData);

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create client');
  }
}

export const dynamic = 'force-dynamic';

