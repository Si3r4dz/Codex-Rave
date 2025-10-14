import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/lib/db';
import { z } from 'zod';

const SettingsSchema = z.object({
  default_hourly_rate: z.string().transform(val => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      throw new Error('Invalid hourly rate');
    }
    return val;
  }).optional(),
  currency: z.enum(['PLN', 'USD', 'EUR', 'GBP']).optional(),
});

export async function GET() {
  try {
    const settings = settingsDb.getAll();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
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
    console.error('Error updating settings:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

