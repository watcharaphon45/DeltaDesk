import { NextRequest, NextResponse } from 'next/server';
import { normalizeBinanceKlines } from '@/lib/exchanges/adapters';
import type { Timeframe } from '@/types/market';

const VALID_TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<Response> {
  return fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'application/json' },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
  const intervalParam = (searchParams.get('interval') || '15m') as Timeframe;
  const limit = Math.min(Number(searchParams.get('limit') || 500), 1000);
  const endTime = searchParams.get('endTime');

  const interval: Timeframe = VALID_TIMEFRAMES.includes(intervalParam)
    ? intervalParam
    : '15m';

  try {
    const qs = new URLSearchParams({
      symbol,
      interval,
      limit: String(limit),
    });
    if (endTime) qs.set('endTime', endTime);

    const primaryUrl = `https://data-api.binance.vision/api/v3/klines?${qs.toString()}`;
    const fallbackUrl = `https://api.binance.com/api/v3/klines?${qs.toString()}`;

    let res = await fetchWithTimeout(primaryUrl).catch(() => null);
    if (!res || !res.ok) {
      res = await fetchWithTimeout(fallbackUrl);
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `Binance klines error: ${res.status}`, bars: [] },
        { status: 502 }
      );
    }

    const raw = (await res.json()) as unknown[];
    return NextResponse.json({ bars: normalizeBinanceKlines(raw) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch klines', bars: [] },
      { status: 500 }
    );
  }
}
