import { NextResponse } from 'next/server';
import { DashboardStatsService } from '@/lib/services/dashboard-stats.service';
import { handleApiError } from '@/lib/utils/api-error';
import { isValidMonth } from '@/lib/utils/date';

const statsService = new DashboardStatsService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    
    // Validate month format if provided
    if (month && !isValidMonth(month)) {
      return NextResponse.json(
        { error: 'Invalid month format. Expected YYYY-MM.' },
        { status: 400 }
      );
    }
    
    const stats = await statsService.calculateStats(month || undefined);
    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch statistics');
  }
}

export const dynamic = 'force-dynamic';

