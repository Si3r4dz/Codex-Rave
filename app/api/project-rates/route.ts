import { NextRequest, NextResponse } from 'next/server';
import { projectRatesDb } from '@/lib/db';
import { z } from 'zod';

const ProjectRateSchema = z.object({
  everhour_project_id: z.string().min(1, 'Project ID is required'),
  project_name: z.string().min(1, 'Project name is required'),
  hourly_rate: z.number().positive('Hourly rate must be positive'),
});

export async function GET() {
  try {
    const rates = projectRatesDb.getAll();
    return NextResponse.json(rates);
  } catch (error) {
    console.error('Error fetching project rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project rates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ProjectRateSchema.parse(body);
    
    const rate = projectRatesDb.upsert(validatedData);
    return NextResponse.json(rate, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating project rate:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create/update project rate' },
      { status: 500 }
    );
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
    console.error('Error deleting project rate:', error);
    return NextResponse.json(
      { error: 'Failed to delete project rate' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

