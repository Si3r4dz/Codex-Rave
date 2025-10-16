import { holidaysDb } from '../db';

interface PublicHoliday {
  date: string;
  localName: string;
  name: string;
}

export class HolidaysService {
  private readonly NAGER_API = 'https://date.nager.at/api/v3';
  
  async getHolidaysForYear(year: number): Promise<Array<{ date: string; name: string }>> {
    // Check cache first
    if (holidaysDb.hasHolidaysForYear(year)) {
      return holidaysDb.getByYear(year);
    }
    
    // Fetch from API
    try {
      const holidays = await this.fetchFromNagerAPI(year);
      
      // Cache in database
      holidaysDb.bulkInsert(
        holidays.map(h => ({
          date: h.date,
          name: h.localName || h.name,
          year,
        }))
      );
      
      return holidays.map(h => ({
        date: h.date,
        name: h.localName || h.name,
      }));
    } catch (error) {
      console.error('Failed to fetch holidays from API:', error);
      // Return empty array as fallback
      return [];
    }
  }
  
  private async fetchFromNagerAPI(year: number): Promise<PublicHoliday[]> {
    const response = await fetch(`${this.NAGER_API}/PublicHolidays/${year}/PL`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch holidays: ${response.statusText}`);
    }
    
    return response.json();
  }
}

