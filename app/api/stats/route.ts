import { NextResponse } from 'next/server';
import { calculateDashboardStats } from '@/lib/stats';

export async function GET() {
  try {
    const stats = await calculateDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

