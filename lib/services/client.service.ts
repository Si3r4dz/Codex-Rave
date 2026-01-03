import db, { clientsDb } from '@/lib/db';
import type { Client, CreateClientInput } from '@/types';

export class ClientService {
  normalizeNip(nip: string): string {
    const normalized = nip.replace(/[^\d]/g, '');
    if (!/^\d{10}$/.test(normalized)) {
      throw new Error('Invalid NIP format (must be 10 digits)');
    }
    return normalized;
  }

  async createClient(input: CreateClientInput): Promise<Client> {
    const nip = this.normalizeNip(input.nip);
    return clientsDb.create({
      name: input.name.trim(),
      nip,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
    });
  }

  async getClient(id: number): Promise<Client | undefined> {
    return clientsDb.getById(id);
  }

  async getAllClients(filters?: {
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: Client[]; total: number }> {
    const q = filters?.q?.trim();
    const limit = Math.min(Math.max(filters?.limit ?? 100, 1), 200);
    const offset = Math.max(filters?.offset ?? 0, 0);

    const where: string[] = [];
    const params: any[] = [];

    if (q) {
      where.push('(name LIKE ? OR nip LIKE ? OR email LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalRow = db
      .prepare(`SELECT COUNT(*) as count FROM clients ${whereSql}`)
      .get(...params) as { count: number };

    const rows = db
      .prepare(`SELECT * FROM clients ${whereSql} ORDER BY name ASC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as Client[];

    return { rows, total: totalRow.count };
  }

  async searchClients(query: string): Promise<Client[]> {
    const q = query.trim();
    if (!q) return clientsDb.getAll();
    return clientsDb.search(q);
  }

  async updateClient(id: number, input: Partial<CreateClientInput>): Promise<Client | undefined> {
    const data: any = { ...input };
    if (input.nip !== undefined) {
      data.nip = input.nip ? this.normalizeNip(input.nip) : input.nip;
    }
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.address !== undefined) data.address = input.address?.trim() || null;
    if (input.city !== undefined) data.city = input.city?.trim() || null;
    if (input.postal_code !== undefined) data.postal_code = input.postal_code?.trim() || null;
    if (input.email !== undefined) data.email = input.email?.trim() || null;
    if (input.phone !== undefined) data.phone = input.phone?.trim() || null;

    return clientsDb.update(id, data);
  }

  async deleteClient(id: number): Promise<void> {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE client_id = ?');
    const result = stmt.get(id) as { count: number };
    if (result.count > 0) {
      throw new Error('Client has existing invoices and cannot be deleted');
    }

    const deleted = clientsDb.delete(id);
    if (!deleted) {
      throw new Error('Client not found');
    }
  }
}


