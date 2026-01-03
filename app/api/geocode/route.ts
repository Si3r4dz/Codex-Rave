import { NextRequest, NextResponse } from 'next/server';
import { GeocodingService } from '@/lib/services/geocoding.service';
import { handleApiError } from '@/lib/utils/api-error';

const geocodingService = new GeocodingService();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    const result = await geocodingService.geocodeAddress(address);

    if (!result) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    // Validate Poland bounds
    if (!geocodingService.isWithinPolandBounds(result.latitude, result.longitude)) {
      return NextResponse.json(
        { error: 'Address must be in Poland', result },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'Failed to geocode address');
  }
}

export const dynamic = 'force-dynamic';

