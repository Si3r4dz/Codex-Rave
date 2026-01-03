import { FuelPriceApiResponse, FuelType } from '@/types';

// Cache for fuel prices to avoid hitting API too frequently
let priceCache: { data: FuelPriceApiResponse; timestamp: number } | null = null;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export class FuelPricesService {
  /**
   * Fetches current fuel prices from e-petrol.pl API
   * Falls back to static prices if API is unavailable
   */
  async getCurrentPrices(): Promise<FuelPriceApiResponse> {
    // Check cache first
    if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
      return priceCache.data;
    }

    try {
      // Try to fetch from e-petrol.pl API
      const response = await fetch('https://api.e-petrol.pl/api/v1/fuel/prices/average', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform API response to our format
      const prices: FuelPriceApiResponse = {
        Pb95: data.pb95 || this.getFallbackPrice('Pb95'),
        Pb98: data.pb98 || this.getFallbackPrice('Pb98'),
        ON: data.on || data.diesel || this.getFallbackPrice('ON'),
        LPG: data.lpg || this.getFallbackPrice('LPG'),
        updated_at: new Date().toISOString()
      };

      // Update cache
      priceCache = {
        data: prices,
        timestamp: Date.now()
      };

      return prices;
    } catch (error) {
      console.error('Failed to fetch fuel prices from API:', error);
      
      // Return fallback prices based on recent Polish average prices
      const fallbackPrices: FuelPriceApiResponse = {
        Pb95: this.getFallbackPrice('Pb95'),
        Pb98: this.getFallbackPrice('Pb98'),
        ON: this.getFallbackPrice('ON'),
        LPG: this.getFallbackPrice('LPG'),
        updated_at: new Date().toISOString()
      };

      // Cache fallback prices for shorter duration
      priceCache = {
        data: fallbackPrices,
        timestamp: Date.now() - (CACHE_DURATION * 0.9) // Cache for only 10% of normal duration
      };

      return fallbackPrices;
    }
  }

  /**
   * Gets a single fuel price by type
   */
  async getPriceByType(fuelType: FuelType): Promise<number> {
    const prices = await this.getCurrentPrices();
    return prices[fuelType] || this.getFallbackPrice(fuelType);
  }

  /**
   * Returns fallback prices based on recent Polish market averages
   * These should be updated periodically to reflect market conditions
   */
  private getFallbackPrice(fuelType: FuelType): number {
    const fallbackPrices: Record<FuelType, number> = {
      Pb95: 6.50,  // PLN per liter
      Pb98: 7.20,  // PLN per liter
      ON: 6.60,    // PLN per liter (Diesel/Olej Napędowy)
      LPG: 3.20    // PLN per liter
    };

    return fallbackPrices[fuelType];
  }

  /**
   * Match station prices based on brand
   * For MVP, we'll return general prices for all stations
   * Future: Could integrate with specific station price APIs
   */
  async matchStationPrices(stations: any[]): Promise<any[]> {
    const currentPrices = await this.getCurrentPrices();

    return stations.map(station => ({
      ...station,
      prices: {
        Pb95: currentPrices.Pb95,
        Pb98: currentPrices.Pb98,
        ON: currentPrices.ON,
        LPG: currentPrices.LPG,
      }
    }));
  }

  /**
   * Clears the price cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    priceCache = null;
  }
}

