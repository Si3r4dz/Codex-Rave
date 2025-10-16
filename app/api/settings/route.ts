import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/lib/db';
import { SettingsSchema } from '@/lib/schemas/settings';
import { handleApiError } from '@/lib/utils/api-error';

export async function GET() {
  try {
    const settings = settingsDb.getAll();
    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch settings');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = SettingsSchema.parse(body);
    
    // Update each provided setting
    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        settingsDb.set(key, value);
      }
    });
    
    const updatedSettings = settingsDb.getAll();
    return NextResponse.json(updatedSettings);
  } catch (error) {
    return handleApiError(error, 'Failed to update settings');
  }
}

export const dynamic = 'force-dynamic';

