export function formatHours(hours: number): string {
  return `${hours.toFixed(2)}h`;
}

export function formatCurrency(
  amount: number | null,
  currency: string = 'PLN'
): string {
  if (amount === null) return 'N/A';
  
  const currencyMap: Record<string, string> = {
    PLN: 'pl-PL',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
  };
  
  const locale = currencyMap[currency] || 'pl-PL';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function secondsToHours(seconds: number): number {
  return seconds / 3600;
}

