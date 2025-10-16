import { NextRequest, NextResponse } from 'next/server';
import { projectRatesDb } from '@/lib/db';
import { ProjectRateSchema } from '@/lib/schemas/project-rates';
import { handleApiError } from '@/lib/utils/api-error';

export async function GET() {
  try {
    const rates = projectRatesDb.getAll();
    return NextResponse.json(rates);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch project rates');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ProjectRateSchema.parse(body);
    
    const rate = projectRatesDb.upsert(validatedData);
    return NextResponse.json(rate, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create/update project rate');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID parameter is required' },
        { status: 400 }
      );
    }
    
    const success = projectRatesDb.delete(parseInt(id, 10));
    
    if (!success) {
      return NextResponse.json(
        { error: 'Project rate not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to delete project rate');
  }
}

export const dynamic = 'force-dynamic';

