import { NextResponse } from 'next/server';
import { FuelPricesService } from '@/lib/services/fuel-prices.service';
import { handleApiError } from '@/lib/utils/api-error';

const fuelPricesService = new FuelPricesService();

export async function GET() {
  try {
    const prices = await fuelPricesService.getCurrentPrices();
    return NextResponse.json(prices);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch fuel prices');
  }
}

export const dynamic = 'force-dynamic';

