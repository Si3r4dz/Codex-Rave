import { FuelStation, FuelType } from '@/types';
import { getDistanceKm } from '@/lib/utils/distance';

// Cache for station searches (24 hours)
const stationCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface OverpassElement {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags?: {
    name?: string;
    brand?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
    'addr:postcode'?: string;
    operator?: string;
    amenity?: string;
  };
}

export class FuelStationsService {
  private overpassUrl = 'https://overpass-api.de/api/interpreter';

  /**
   * Find fuel stations near a location
   * @param latitude - Center latitude
   * @param longitude - Center longitude
   * @param radiusKm - Search radius in kilometers
   * @returns Array of fuel stations
   */
  async findStationsNearby(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<Partial<FuelStation>[]> {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${radiusKm}`;

    // Check cache
    if (stationCache.has(cacheKey)) {
      const cached = stationCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Using cached station data');
        return this.processStations(cached.data, latitude, longitude);
      }
    }

    try {
      // Convert km to meters for Overpass API
      const radiusMeters = radiusKm * 1000;

      // Overpass QL query for fuel stations
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="fuel"](around:${radiusMeters},${latitude},${longitude});
          way["amenity"="fuel"](around:${radiusMeters},${latitude},${longitude});
        );
        out center;
      `;

      const response = await fetch(this.overpassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();

      // Cache the raw data
      stationCache.set(cacheKey, {
        data: data.elements || [],
        timestamp: Date.now(),
      });

      return this.processStations(data.elements || [], latitude, longitude);
    } catch (error) {
      console.error('Error fetching fuel stations:', error);
      
      // Return cached data if available, even if expired
      if (stationCache.has(cacheKey)) {
        console.log('Returning expired cache due to API error');
        const cached = stationCache.get(cacheKey)!;
        return this.processStations(cached.data, latitude, longitude);
      }
      
      return [];
    }
  }

  /**
   * Process raw Overpass API elements into FuelStation format
   */
  private processStations(
    elements: OverpassElement[],
    userLat: number,
    userLng: number
  ): Partial<FuelStation>[] {
    return elements
      .map((element) => {
        // Get coordinates (use center for ways)
        const lat = element.lat || (element as any).center?.lat;
        const lon = element.lon || (element as any).center?.lon;

        if (!lat || !lon) return null;

        // Extract station information
        const tags = element.tags || {};
        const name = tags.name || tags.operator || tags.brand || 'Stacja paliw';
        const brand = this.normalizeBrand(tags.brand || tags.operator);

        // Build address
        const addressParts = [
          tags['addr:street'],
          tags['addr:housenumber'],
          tags['addr:city'],
          tags['addr:postcode'],
        ].filter(Boolean);

        const address = addressParts.length > 0
          ? addressParts.join(', ')
          : undefined;

        // Calculate distance
        const distance = getDistanceKm(userLat, userLng, lat, lon);

        return {
          name,
          brand,
          address,
          latitude: lat,
          longitude: lon,
          distance_km: distance,
          is_favorite: false,
        } as Partial<FuelStation>;
      })
      .filter((station): station is Partial<FuelStation> => station !== null)
      .sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0)); // Sort by distance
  }

  /**
   * Normalize brand names to common formats
   */
  private normalizeBrand(brand?: string): string | undefined {
    if (!brand) return undefined;

    const normalized = brand.toLowerCase().trim();

    // Map common variations to standard names
    const brandMap: Record<string, string> = {
      'orlen': 'Orlen',
      'pko orlen': 'Orlen',
      'shell': 'Shell',
      'bp': 'BP',
      'circle k': 'Circle K',
      'lotos': 'Lotos',
      'moya': 'Moya',
      'avia': 'Avia',
      'lukoil': 'Lukoil',
      'statoil': 'Circle K', // Statoil was rebranded to Circle K
    };

    for (const [key, value] of Object.entries(brandMap)) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    // Return original with proper capitalization if not found
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  }

  /**
   * Clear the station cache (useful for testing)
   */
  clearCache(): void {
    stationCache.clear();
  }
}

