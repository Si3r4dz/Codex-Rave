import { NextRequest, NextResponse } from 'next/server';
import { FuelStationsService } from '@/lib/services/fuel-stations.service';
import { FuelPricesService } from '@/lib/services/fuel-prices.service';
import { fuelStationsDb } from '@/lib/db';
import { handleApiError } from '@/lib/utils/api-error';

const stationsService = new FuelStationsService();
const pricesService = new FuelPricesService();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '10';

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude parameters are required' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusKm)) {
      return NextResponse.json(
        { error: 'Invalid coordinates or radius' },
        { status: 400 }
      );
    }

    if (radiusKm < 1 || radiusKm > 50) {
      return NextResponse.json(
        { error: 'Radius must be between 1 and 50 km' },
        { status: 400 }
      );
    }

    // Find nearby stations
    const stations = await stationsService.findStationsNearby(latitude, longitude, radiusKm);

    // Match prices to stations
    const stationsWithPrices = await pricesService.matchStationPrices(stations);

    // Check which stations were used before
    const enrichedStations = stationsWithPrices.map(station => {
      // Try to find this station in our database
      const dbStation = station.latitude && station.longitude
        ? fuelStationsDb.getByCoordinates(station.latitude, station.longitude)
        : null;

      return {
        ...station,
        id: dbStation?.id,
        is_favorite: dbStation?.is_favorite || false,
        usage_count: dbStation?.usage_count || 0,
        last_used: dbStation?.last_used || null,
      };
    });

    return NextResponse.json(enrichedStations);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch fuel stations');
  }
}

export const dynamic = 'force-dynamic';

