import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import {
  ProjectRate,
  FuelTransaction,
  FuelMonthlyStats,
  Invoice,
  InvoiceItem,
  Client,
  InvoiceSequence,
  InvoiceStatus,
  PaymentMethod,
  VatRate,
} from '@/types';

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
    
    CREATE TABLE IF NOT EXISTS fuel_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      fuel_type TEXT NOT NULL CHECK(fuel_type IN ('Pb95', 'Pb98', 'ON', 'LPG')),
      liters REAL NOT NULL,
      price_per_liter REAL NOT NULL,
      total_amount REAL NOT NULL,
      station_id INTEGER,
      station_name TEXT,
      station_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (station_id) REFERENCES fuel_stations(id) ON DELETE SET NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_fuel_transactions_date ON fuel_transactions(date);
    CREATE INDEX IF NOT EXISTS idx_fuel_transactions_fuel_type ON fuel_transactions(fuel_type);
    CREATE INDEX IF NOT EXISTS idx_fuel_transactions_station_id ON fuel_transactions(station_id);
    
    CREATE TABLE IF NOT EXISTS fuel_stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT,
      address TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      is_favorite INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(latitude, longitude)
    );
    
    CREATE INDEX IF NOT EXISTS idx_fuel_stations_coords ON fuel_stations(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_fuel_stations_brand ON fuel_stations(brand);
    CREATE INDEX IF NOT EXISTS idx_fuel_stations_favorite ON fuel_stations(is_favorite);

    -- VAT invoices + clients (KSeF-compatible offline export)
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      nip TEXT NOT NULL,
      address TEXT,
      city TEXT,
      postal_code TEXT,
      email TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(nip)
    );

    CREATE INDEX IF NOT EXISTS idx_clients_nip ON clients(nip);

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      sale_date TEXT NOT NULL,
      client_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('draft', 'issued', 'cancelled')),
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank_transfer', 'card', 'other')),
      payment_deadline TEXT,
      currency TEXT NOT NULL,
      exchange_rate TEXT,
      notes TEXT,
      subtotal_grosze INTEGER NOT NULL,
      tax_grosze INTEGER NOT NULL,
      total_grosze INTEGER NOT NULL,
      xml_path TEXT,
      pdf_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(invoice_number),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
    CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity TEXT NOT NULL,
      unit TEXT NOT NULL,
      unit_price_grosze INTEGER NOT NULL,
      vat_rate TEXT NOT NULL,
      net_grosze INTEGER NOT NULL,
      vat_grosze INTEGER NOT NULL,
      gross_grosze INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

    CREATE TABLE IF NOT EXISTS invoice_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      last_number INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(year, month)
    );
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

// Fuel transactions operations
export const fuelTransactionsDb = {
  getAll(): FuelTransaction[] {
    const stmt = db.prepare('SELECT * FROM fuel_transactions ORDER BY date DESC, created_at DESC');
    return stmt.all() as FuelTransaction[];
  },

  getById(id: number): FuelTransaction | undefined {
    const stmt = db.prepare('SELECT * FROM fuel_transactions WHERE id = ?');
    return stmt.get(id) as FuelTransaction | undefined;
  },

  getByMonth(month: string): FuelTransaction[] {
    // month format: YYYY-MM
    const stmt = db.prepare(`
      SELECT * FROM fuel_transactions 
      WHERE strftime('%Y-%m', date) = ? 
      ORDER BY date DESC, created_at DESC
    `);
    return stmt.all(month) as FuelTransaction[];
  },

  getMonthlyStats(month: string): FuelMonthlyStats {
    // month format: YYYY-MM
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as transaction_count,
        SUM(total_amount) as total_spent,
        SUM(liters) as total_liters,
        AVG(price_per_liter) as avg_price_per_liter,
        fuel_type
      FROM fuel_transactions 
      WHERE strftime('%Y-%m', date) = ?
      GROUP BY fuel_type
    `);
    const byType = stmt.all(month);

    const totalStmt = db.prepare(`
      SELECT 
        COUNT(*) as transaction_count,
        SUM(total_amount) as total_spent,
        SUM(liters) as total_liters
      FROM fuel_transactions 
      WHERE strftime('%Y-%m', date) = ?
    `);
    const total = totalStmt.get(month);

    return {
      total,
      byType
    } as FuelMonthlyStats;
  },

  create(data: { 
    date: string; 
    fuel_type: string; 
    liters: number; 
    price_per_liter: number; 
    total_amount: number 
  }): FuelTransaction {
    const stmt = db.prepare(`
      INSERT INTO fuel_transactions (date, fuel_type, liters, price_per_liter, total_amount)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.date, 
      data.fuel_type, 
      data.liters, 
      data.price_per_liter, 
      data.total_amount
    );
    
    return this.getById(result.lastInsertRowid as number)!;
  },

  delete(id: number): boolean {
    const stmt = db.prepare('DELETE FROM fuel_transactions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};

// Fuel stations operations
export const fuelStationsDb = {
  getAll(): any[] {
    const stmt = db.prepare('SELECT * FROM fuel_stations ORDER BY name');
    return stmt.all();
  },

  getById(id: number): any | undefined {
    const stmt = db.prepare('SELECT * FROM fuel_stations WHERE id = ?');
    return stmt.get(id);
  },

  getByCoordinates(latitude: number, longitude: number): any | undefined {
    const stmt = db.prepare('SELECT * FROM fuel_stations WHERE latitude = ? AND longitude = ?');
    return stmt.get(latitude, longitude);
  },

  getFavorites(): any[] {
    const stmt = db.prepare('SELECT * FROM fuel_stations WHERE is_favorite = 1 ORDER BY name');
    return stmt.all();
  },

  getMostUsed(limit: number = 10): any[] {
    const stmt = db.prepare(`
      SELECT 
        fs.*,
        COUNT(ft.id) as usage_count,
        MAX(ft.date) as last_used
      FROM fuel_stations fs
      INNER JOIN fuel_transactions ft ON fs.id = ft.station_id
      GROUP BY fs.id
      ORDER BY usage_count DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  },

  create(data: {
    name: string;
    brand?: string;
    address?: string;
    latitude: number;
    longitude: number;
    is_favorite?: boolean;
  }): any {
    const stmt = db.prepare(`
      INSERT INTO fuel_stations (name, brand, address, latitude, longitude, is_favorite)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.brand || null,
      data.address || null,
      data.latitude,
      data.longitude,
      data.is_favorite ? 1 : 0
    );

    return this.getById(result.lastInsertRowid as number)!;
  },

  upsert(data: {
    name: string;
    brand?: string;
    address?: string;
    latitude: number;
    longitude: number;
    is_favorite?: boolean;
  }): any {
    const existing = this.getByCoordinates(data.latitude, data.longitude);

    if (existing) {
      // Update existing station
      const stmt = db.prepare(`
        UPDATE fuel_stations 
        SET name = ?, brand = ?, address = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(data.name, data.brand || null, data.address || null, existing.id);
      return this.getById(existing.id);
    }

    return this.create(data);
  },

  toggleFavorite(id: number): boolean {
    const stmt = db.prepare(`
      UPDATE fuel_stations 
      SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  },

  delete(id: number): boolean {
    const stmt = db.prepare('DELETE FROM fuel_stations WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};

// Clients operations
export const clientsDb = {
  getAll(): Client[] {
    const stmt = db.prepare('SELECT * FROM clients ORDER BY name');
    return stmt.all() as Client[];
  },

  getById(id: number): Client | undefined {
    const stmt = db.prepare('SELECT * FROM clients WHERE id = ?');
    return stmt.get(id) as Client | undefined;
  },

  getByNip(nip: string): Client | undefined {
    const stmt = db.prepare('SELECT * FROM clients WHERE nip = ?');
    return stmt.get(nip) as Client | undefined;
  },

  search(query: string): Client[] {
    const q = `%${query.trim()}%`;
    const stmt = db.prepare(`
      SELECT * FROM clients
      WHERE name LIKE ? OR nip LIKE ?
      ORDER BY name
      LIMIT 50
    `);
    return stmt.all(q, q) as Client[];
  },

  create(data: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Client {
    const stmt = db.prepare(`
      INSERT INTO clients (name, nip, address, city, postal_code, email, phone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    const result = stmt.run(
      data.name,
      data.nip,
      data.address ?? null,
      data.city ?? null,
      data.postal_code ?? null,
      data.email ?? null,
      data.phone ?? null
    );
    return this.getById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>): Client | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.nip !== undefined) { fields.push('nip = ?'); values.push(data.nip); }
    if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address ?? null); }
    if (data.city !== undefined) { fields.push('city = ?'); values.push(data.city ?? null); }
    if (data.postal_code !== undefined) { fields.push('postal_code = ?'); values.push(data.postal_code ?? null); }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email ?? null); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone ?? null); }

    if (fields.length === 0) return this.getById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE clients
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);
    return this.getById(id);
  },

  delete(id: number): boolean {
    const stmt = db.prepare('DELETE FROM clients WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};

// Invoices operations (raw table access; business logic lives in services)
export const invoicesDb = {
  getAll(): Invoice[] {
    const stmt = db.prepare('SELECT * FROM invoices ORDER BY issue_date DESC, id DESC');
    return stmt.all() as Invoice[];
  },

  getById(id: number): Invoice | undefined {
    const stmt = db.prepare('SELECT * FROM invoices WHERE id = ?');
    return stmt.get(id) as Invoice | undefined;
  },

  getByNumber(invoice_number: string): Invoice | undefined {
    const stmt = db.prepare('SELECT * FROM invoices WHERE invoice_number = ?');
    return stmt.get(invoice_number) as Invoice | undefined;
  },

  create(data: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>): Invoice {
    const stmt = db.prepare(`
      INSERT INTO invoices (
        invoice_number, issue_date, sale_date, client_id, status, payment_method,
        payment_deadline, currency, exchange_rate, notes,
        subtotal_grosze, tax_grosze, total_grosze, xml_path, pdf_path,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    const result = stmt.run(
      data.invoice_number,
      data.issue_date,
      data.sale_date,
      data.client_id,
      data.status,
      data.payment_method,
      data.payment_deadline ?? null,
      data.currency,
      data.exchange_rate ?? null,
      data.notes ?? null,
      data.subtotal_grosze,
      data.tax_grosze,
      data.total_grosze,
      data.xml_path ?? null,
      data.pdf_path ?? null
    );
    return this.getById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: Partial<Omit<Invoice, 'id' | 'created_at' | 'updated_at'>>): Invoice | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    const setField = (key: string, value: any) => { fields.push(`${key} = ?`); values.push(value); };

    if (data.invoice_number !== undefined) setField('invoice_number', data.invoice_number);
    if (data.issue_date !== undefined) setField('issue_date', data.issue_date);
    if (data.sale_date !== undefined) setField('sale_date', data.sale_date);
    if (data.client_id !== undefined) setField('client_id', data.client_id);
    if (data.status !== undefined) setField('status', data.status as InvoiceStatus);
    if (data.payment_method !== undefined) setField('payment_method', data.payment_method as PaymentMethod);
    if (data.payment_deadline !== undefined) setField('payment_deadline', data.payment_deadline ?? null);
    if (data.currency !== undefined) setField('currency', data.currency);
    if (data.exchange_rate !== undefined) setField('exchange_rate', data.exchange_rate ?? null);
    if (data.notes !== undefined) setField('notes', data.notes ?? null);
    if (data.subtotal_grosze !== undefined) setField('subtotal_grosze', data.subtotal_grosze);
    if (data.tax_grosze !== undefined) setField('tax_grosze', data.tax_grosze);
    if (data.total_grosze !== undefined) setField('total_grosze', data.total_grosze);
    if (data.xml_path !== undefined) setField('xml_path', data.xml_path ?? null);
    if (data.pdf_path !== undefined) setField('pdf_path', data.pdf_path ?? null);

    if (fields.length === 0) return this.getById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE invoices
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);
    return this.getById(id);
  },

  delete(id: number): boolean {
    const stmt = db.prepare('DELETE FROM invoices WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};

export const invoiceItemsDb = {
  getByInvoiceId(invoiceId: number): InvoiceItem[] {
    const stmt = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC');
    const rows = stmt.all(invoiceId) as any[];
    return rows.map((r) => ({
      ...r,
      vat_rate: r.vat_rate === 'ZW' || r.vat_rate === 'NP' ? r.vat_rate : Number(r.vat_rate),
    })) as InvoiceItem[];
  },

  bulkCreate(invoiceId: number, items: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'>[]): InvoiceItem[] {
    const insert = db.prepare(`
      INSERT INTO invoice_items (
        invoice_id, name, quantity, unit,
        unit_price_grosze, vat_rate,
        net_grosze, vat_grosze, gross_grosze,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const tx = db.transaction((rows: typeof items) => {
      for (const it of rows) {
        insert.run(
          invoiceId,
          it.name,
          it.quantity,
          it.unit,
          it.unit_price_grosze,
          it.vat_rate,
          it.net_grosze,
          it.vat_grosze,
          it.gross_grosze
        );
      }
    });

    tx(items);
    return this.getByInvoiceId(invoiceId);
  },

  deleteByInvoiceId(invoiceId: number): void {
    const stmt = db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?');
    stmt.run(invoiceId);
  }
};

export const invoiceSequencesDb = {
  get(year: number, month: number): InvoiceSequence | undefined {
    const stmt = db.prepare('SELECT * FROM invoice_sequences WHERE year = ? AND month = ?');
    return stmt.get(year, month) as InvoiceSequence | undefined;
  },

  upsert(year: number, month: number, last_number: number): InvoiceSequence {
    const stmt = db.prepare(`
      INSERT INTO invoice_sequences (year, month, last_number, created_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(year, month) DO UPDATE SET
        last_number = excluded.last_number,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(year, month, last_number);
    return this.get(year, month)!;
  }
};

export default db;

