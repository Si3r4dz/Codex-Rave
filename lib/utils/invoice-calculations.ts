import type { VatRate } from '@/types';

function divRound(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error('Division by zero');
  if (numerator < 0n) {
    // Not expected in our domain (amounts are non-negative), but keep it correct.
    return -divRound(-numerator, denominator);
  }
  return (numerator + denominator / 2n) / denominator;
}

export function normalizeQuantity(quantity: string): string {
  const q = quantity.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,3})?$/.test(q)) {
    throw new Error('Invalid quantity format');
  }
  const [intPart, fracPartRaw] = q.split('.');
  const fracPart = (fracPartRaw ?? '').padEnd(3, '0').slice(0, 3);
  // Remove leading zeros safely (keep at least one digit)
  const intNorm = String(Number(intPart));
  const fracNorm = fracPart.replace(/0+$/, '');
  return fracNorm ? `${intNorm}.${fracNorm}` : intNorm;
}

export function quantityToMilli(quantity: string): bigint {
  const q = quantity.trim().replace(',', '.');
  const [intPart, fracPartRaw] = q.split('.');
  const fracPart = (fracPartRaw ?? '').padEnd(3, '0').slice(0, 3);
  const intMilli = BigInt(intPart || '0') * 1000n;
  const fracMilli = BigInt(fracPart || '0');
  return intMilli + fracMilli;
}

export function plnToGrosze(value: string | number): number {
  const str = (typeof value === 'number' ? value.toString() : value).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    throw new Error('Invalid money format');
  }
  const [intPart, fracRaw] = str.split('.');
  const frac = (fracRaw ?? '').padEnd(2, '0').slice(0, 2);
  const grosze = BigInt(intPart || '0') * 100n + BigInt(frac || '0');
  if (grosze > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Amount too large');
  }
  return Number(grosze);
}

export function groszeToPlnString(grosze: number): string {
  const sign = grosze < 0 ? '-' : '';
  const abs = Math.abs(grosze);
  const zl = Math.floor(abs / 100);
  const gr = String(abs % 100).padStart(2, '0');
  return `${sign}${zl}.${gr}`;
}

export function vatRateToNumber(rate: VatRate): number {
  if (rate === 'ZW' || rate === 'NP') return 0;
  return rate;
}

export function calculateLineAmounts(input: {
  quantity: string;
  unit_price_grosze: number;
  vat_rate: VatRate;
}): { net_grosze: number; vat_grosze: number; gross_grosze: number } {
  if (!Number.isInteger(input.unit_price_grosze) || input.unit_price_grosze < 0) {
    throw new Error('unit_price_grosze must be a non-negative integer');
  }

  const qtyMilli = quantityToMilli(input.quantity);
  if (qtyMilli <= 0n) throw new Error('Quantity must be greater than 0');

  // net_grosze = round(unit_price_grosze * quantity)
  const net = divRound(BigInt(input.unit_price_grosze) * qtyMilli, 1000n);
  const vatRate = BigInt(vatRateToNumber(input.vat_rate));
  const vat = vatRate === 0n ? 0n : divRound(net * vatRate, 100n);
  const gross = net + vat;

  const toNumberSafe = (v: bigint) => {
    if (v > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Amount too large');
    return Number(v);
  };

  return {
    net_grosze: toNumberSafe(net),
    vat_grosze: toNumberSafe(vat),
    gross_grosze: toNumberSafe(gross),
  };
}

export function calculateInvoiceTotals(items: Array<{ net_grosze: number; vat_grosze: number; gross_grosze: number }>): {
  subtotal_grosze: number;
  tax_grosze: number;
  total_grosze: number;
} {
  const subtotal = items.reduce((sum, it) => sum + it.net_grosze, 0);
  const tax = items.reduce((sum, it) => sum + it.vat_grosze, 0);
  const total = items.reduce((sum, it) => sum + it.gross_grosze, 0);
  return { subtotal_grosze: subtotal, tax_grosze: tax, total_grosze: total };
}


