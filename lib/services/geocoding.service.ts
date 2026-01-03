import { GeocodingResult } from '@/types';

// Rate limiting for Nominatim API (1 request per second)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second in milliseconds

// Cache for geocoding results (permanent cache since addresses don't change)
const geocodingCache = new Map<string, GeocodingResult>();

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

export class GeocodingService {
  private baseUrl = 'https://nominatim.openstreetmap.org';

  /**
   * Geocode an address to coordinates
   * @param address - Address to geocode
   * @returns Geocoding result with latitude and longitude
   */
  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    // Check cache first
    const cacheKey = address.toLowerCase().trim();
    if (geocodingCache.has(cacheKey)) {
      return geocodingCache.get(cacheKey)!;
    }

    try {
      // Respect Nominatim rate limiting
      await waitForRateLimit();

      const params = new URLSearchParams({
        q: address,
        format: 'json',
        addressdetails: '1',
        limit: '1',
        countrycodes: 'pl', // Limit to Poland for better results
      });

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'User-Agent': 'CompanyDashboard/1.0', // Required by Nominatim
        },
      });

      if (!response.ok) {
        throw new Error(`Geocoding API responded with status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        console.warn('No geocoding results found for address:', address);
        return null;
      }

      const result: GeocodingResult = {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        display_name: data[0].display_name,
        address: data[0].address ? {
          road: data[0].address.road,
          suburb: data[0].address.suburb,
          city: data[0].address.city || data[0].address.town || data[0].address.village,
          postcode: data[0].address.postcode,
          country: data[0].address.country,
        } : undefined,
      };

      // Cache the result permanently
      geocodingCache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to an address
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns Geocoding result with address details
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    // Check cache
    const cacheKey = `${latitude},${longitude}`;
    if (geocodingCache.has(cacheKey)) {
      return geocodingCache.get(cacheKey)!;
    }

    try {
      // Respect Nominatim rate limiting
      await waitForRateLimit();

      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
        addressdetails: '1',
      });

      const response = await fetch(`${this.baseUrl}/reverse?${params}`, {
        headers: {
          'User-Agent': 'CompanyDashboard/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Reverse geocoding API responded with status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.error) {
        console.warn('No reverse geocoding results found');
        return null;
      }

      const result: GeocodingResult = {
        latitude,
        longitude,
        display_name: data.display_name,
        address: data.address ? {
          road: data.address.road,
          suburb: data.address.suburb,
          city: data.address.city || data.address.town || data.address.village,
          postcode: data.address.postcode,
          country: data.address.country,
        } : undefined,
      };

      // Cache the result
      geocodingCache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Validate if coordinates are within Poland bounds
   * Rough bounds: 49°N to 55°N, 14°E to 24°E
   */
  isWithinPolandBounds(latitude: number, longitude: number): boolean {
    return (
      latitude >= 49 && latitude <= 55 &&
      longitude >= 14 && longitude <= 24
    );
  }

  /**
   * Clear the geocoding cache (useful for testing)
   */
  clearCache(): void {
    geocodingCache.clear();
    lastRequestTime = 0;
  }
}

