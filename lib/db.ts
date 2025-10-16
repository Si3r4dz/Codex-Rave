import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { ProjectRate } from '@/types';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'dashboard.db');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Initialize database schema
function initializeDatabase() {
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS project_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      everhour_project_id TEXT UNIQUE NOT NULL,
      project_name TEXT NOT NULL,
      hourly_rate REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      country_code TEXT DEFAULT 'PL',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
    CREATE INDEX IF NOT EXISTS idx_holidays_year ON holidays(year);
  `;
  
  db.exec(createTablesSQL);
  
  // Initialize default settings if they don't exist
  const defaultRate = process.env.DEFAULT_HOURLY_RATE || '50';
  const checkSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
  
  if (!checkSetting.get('default_hourly_rate')) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insertSetting.run('default_hourly_rate', defaultRate);
    insertSetting.run('currency', 'PLN');
    insertSetting.run('daily_hours_target', '8');
  }
}

initializeDatabase();

// CRUD operations for project rates
export const projectRatesDb = {
  getAll(): ProjectRate[] {
    const stmt = db.prepare('SELECT * FROM project_rates ORDER BY project_name');
    return stmt.all() as ProjectRate[];
  },

  getById(id: number): ProjectRate | undefined {
    const stmt = db.prepare('SELECT * FROM project_rates WHERE id = ?');
    return stmt.get(id) as ProjectRate | undefined;
  },

  getByEverhourId(everhour_project_id: string): ProjectRate | undefined {
    const stmt = db.prepare('SELECT * FROM project_rates WHERE everhour_project_id = ?');
    return stmt.get(everhour_project_id) as ProjectRate | undefined;
  },

  create(data: Omit<ProjectRate, 'id' | 'created_at' | 'updated_at'>): ProjectRate {
    const stmt = db.prepare(`
      INSERT INTO project_rates (everhour_project_id, project_name, hourly_rate)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(data.everhour_project_id, data.project_name, data.hourly_rate);
    return this.getById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: Partial<Omit<ProjectRate, 'id' | 'created_at' | 'updated_at'>>): ProjectRate | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.everhour_project_id !== undefined) {
      fields.push('everhour_project_id = ?');
      values.push(data.everhour_project_id);
    }
    if (data.project_name !== undefined) {
      fields.push('project_name = ?');
      values.push(data.project_name);
    }
    if (data.hourly_rate !== undefined) {
      fields.push('hourly_rate = ?');
      values.push(data.hourly_rate);
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE project_rates 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getById(id);
  },

  upsert(data: Omit<ProjectRate, 'id' | 'created_at' | 'updated_at'>): ProjectRate {
    const existing = this.getByEverhourId(data.everhour_project_id);
    
    if (existing) {
      return this.update(existing.id, data)!;
    }
    
    return this.create(data);
  },

  delete(id: number): boolean {
    const stmt = db.prepare('DELETE FROM project_rates WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};

// Settings operations
export const settingsDb = {
  get(key: string): string | undefined {
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value;
  },

  set(key: string, value: string): void {
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(key, value);
  },

  getAll(): Record<string, string> {
    const stmt = db.prepare('SELECT key, value FROM settings');
    const rows = stmt.all() as { key: string; value: string }[];
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);
  }
};

// Holidays operations
export const holidaysDb = {
  getByYear(year: number): Array<{ date: string; name: string }> {
    const stmt = db.prepare('SELECT date, name FROM holidays WHERE year = ? ORDER BY date');
    return stmt.all(year) as Array<{ date: string; name: string }>;
  },
  
  bulkInsert(holidays: Array<{ date: string; name: string; year: number }>): void {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO holidays (date, name, year) 
      VALUES (?, ?, ?)
    `);
    
    const insertMany = db.transaction((holidays) => {
      for (const holiday of holidays) {
        stmt.run(holiday.date, holiday.name, holiday.year);
      }
    });
    
    insertMany(holidays);
  },
  
  hasHolidaysForYear(year: number): boolean {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM holidays WHERE year = ?');
    const result = stmt.get(year) as { count: number };
    return result.count > 0;
  }
};

export default db;

