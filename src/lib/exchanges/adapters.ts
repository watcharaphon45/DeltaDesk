import type { CandleBar } from '@/types/market';

export function splitSymbol(symbol: string): { base: string; quote: string } {
  const upper = symbol.toUpperCase();
  if (upper.endsWith('USDT')) {
    return { base: upper.slice(0, -4), quote: 'USDT' };
  }
  return { base: upper, quote: 'USDT' };
}

export function normalizeBinanceKlines(raw: unknown[]): CandleBar[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as [number, string, string, string, string, string, number, string];
    return {
      timestamp: Number(r[0]),
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
      volume: Number(r[5]),
      turnover: Number(r[7]),
    };
  });
}
