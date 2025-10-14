import { NextResponse } from 'next/server';
import { getEverhourClient } from '@/lib/everhour';

export async function GET() {
  try {
    const everhourClient = getEverhourClient();
    const projects = await everhourClient.getProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching Everhour projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

