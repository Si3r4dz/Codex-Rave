import { NextRequest, NextResponse } from 'next/server';
import { fuelTransactionsDb } from '@/lib/db';
import { handleApiError } from '@/lib/utils/api-error';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');

    if (!month) {
      // Default to current month if not specified
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const stats = fuelTransactionsDb.getMonthlyStats(currentMonth);
      return NextResponse.json(stats);
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'Month must be in YYYY-MM format' },
        { status: 400 }
      );
    }

    const stats = fuelTransactionsDb.getMonthlyStats(month);
    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch fuel transaction stats');
  }
}

export const dynamic = 'force-dynamic';

