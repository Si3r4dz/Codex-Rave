import { NextResponse } from 'next/server';
import { DashboardStatsService } from '@/lib/services/dashboard-stats.service';
import { handleApiError } from '@/lib/utils/api-error';

const statsService = new DashboardStatsService();

export async function GET() {
  try {
    const stats = await statsService.calculateStats();
    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch statistics');
  }
}

export const dynamic = 'force-dynamic';

