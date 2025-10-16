import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function handleApiError(error: unknown, defaultMessage: string) {
  console.error(defaultMessage, error);
  
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Validation error', details: error.issues },
      { status: 400 }
    );
  }
  
  if (error instanceof Error) {
    return NextResponse.json(
      { error: defaultMessage, message: error.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json(
    { error: defaultMessage },
    { status: 500 }
  );
}

