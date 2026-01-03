import { NextRequest, NextResponse } from 'next/server';
import { fuelTransactionsDb } from '@/lib/db';
import { handleApiError } from '@/lib/utils/api-error';
import { z } from 'zod';

// Validation schema
const createTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  fuel_type: z.enum(['Pb95', 'Pb98', 'ON', 'LPG']),
  liters: z.number().positive('Liters must be positive'),
  price_per_liter: z.number().positive('Price per liter must be positive'),
  total_amount: z.number().positive('Total amount must be positive')
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');

    if (month) {
      // Validate month format
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json(
          { error: 'Month must be in YYYY-MM format' },
          { status: 400 }
        );
      }

      const transactions = fuelTransactionsDb.getByMonth(month);
      return NextResponse.json(transactions);
    }

    // Return all transactions if no month specified
    const transactions = fuelTransactionsDb.getAll();
    return NextResponse.json(transactions);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch fuel transactions');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = createTransactionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Create transaction
    const transaction = fuelTransactionsDb.create(data);

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create fuel transaction');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const deleted = fuelTransactionsDb.delete(parseInt(id, 10));

    if (!deleted) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to delete fuel transaction');
  }
}

export const dynamic = 'force-dynamic';

