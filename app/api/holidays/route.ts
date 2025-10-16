import { NextResponse } from 'next/server';
import { HolidaysService } from '@/lib/services/holidays.service';
import { handleApiError } from '@/lib/utils/api-error';

const holidaysService = new HolidaysService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    
    const holidays = await holidaysService.getHolidaysForYear(year);
    return NextResponse.json(holidays);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch holidays');
  }
}

export const dynamic = 'force-dynamic';

