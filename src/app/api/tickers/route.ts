import { NextResponse } from 'next/server';
import { SUPPORTED_SYMBOLS } from '@/constants/markets';
import type { WatchlistTicker } from '@/types/market';

async function fetchJson<T>(url: string, timeoutMs = 6000): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET() {
  const symbolsParam = encodeURIComponent(
    JSON.stringify(SUPPORTED_SYMBOLS.map((s) => s.symbol))
  );

  type RawTicker = {
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
    highPrice: string;
    lowPrice: string;
    quoteVolume: string;
  };

  const list =
    (await fetchJson<RawTicker[]>(
      `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${symbolsParam}`
    )) ??
    (await fetchJson<RawTicker[]>(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`
    ));

  const symbolMap = new Map(SUPPORTED_SYMBOLS.map((s) => [s.symbol, s]));
  const watchlist: WatchlistTicker[] = (list ?? [])
    .map((item) => {
      const meta = symbolMap.get(item.symbol);
      if (!meta) return null;
      return {
        symbol: item.symbol,
        base: meta.base,
        name: meta.name,
        lastPrice: Number(item.lastPrice),
        priceChangePercent: Number(item.priceChangePercent),
        high24h: Number(item.highPrice),
        low24h: Number(item.lowPrice),
        volume24h: Number(item.quoteVolume),
      };
    })
    .filter((v): v is WatchlistTicker => v !== null);

  return NextResponse.json({ watchlist });
}
