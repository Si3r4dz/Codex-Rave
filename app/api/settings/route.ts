import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/lib/db';
import { SettingsSchema } from '@/lib/schemas/settings';
import { GeocodingService } from '@/lib/services/geocoding.service';
import { handleApiError } from '@/lib/utils/api-error';

const geocodingService = new GeocodingService();

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
    
    // If home_address is provided, geocode it automatically
    if (validatedData.home_address) {
      const address = validatedData.home_address.trim();
      
      if (address) {
        const geocodeResult = await geocodingService.geocodeAddress(address);
        
        if (geocodeResult) {
          // Validate Poland bounds
          if (geocodingService.isWithinPolandBounds(geocodeResult.latitude, geocodeResult.longitude)) {
            // Store coordinates along with address
            validatedData.home_latitude = geocodeResult.latitude.toString();
            validatedData.home_longitude = geocodeResult.longitude.toString();
          } else {
            return NextResponse.json(
              { error: 'Address must be in Poland' },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Could not geocode address. Please verify it is correct.' },
            { status: 400 }
          );
        }
      }
    }
    
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

