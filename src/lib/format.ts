export function getPricePrecision(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 2;
  if (price >= 1000) return 2;
  if (price >= 10) return 3;
  if (price >= 0.5) return 4;
  if (price >= 0.01) return 5;
  if (price >= 0.0001) return 6;
  return 8;
}

export function getVolumePrecision(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 2;
  if (price >= 1000) return 4;
  if (price >= 10) return 3;
  if (price >= 1) return 2;
  return 0;
}

const SYMBOL_PRECISION_DEFAULTS: Record<string, { pricePrecision: number; volumePrecision: number }> = {
  BTCUSDT: { pricePrecision: 2, volumePrecision: 4 },
  ETHUSDT: { pricePrecision: 2, volumePrecision: 4 },
  BNBUSDT: { pricePrecision: 2, volumePrecision: 4 },
  SOLUSDT: { pricePrecision: 2, volumePrecision: 4 },
  LTCUSDT: { pricePrecision: 2, volumePrecision: 4 },
  AVAXUSDT: { pricePrecision: 2, volumePrecision: 4 },
  LINKUSDT: { pricePrecision: 3, volumePrecision: 2 },
  DOTUSDT: { pricePrecision: 3, volumePrecision: 2 },
  NEARUSDT: { pricePrecision: 3, volumePrecision: 2 },
  APTUSDT: { pricePrecision: 3, volumePrecision: 2 },
  SUIUSDT: { pricePrecision: 3, volumePrecision: 2 },
  TONUSDT: { pricePrecision: 3, volumePrecision: 2 },
  XRPUSDT: { pricePrecision: 4, volumePrecision: 1 },
  ADAUSDT: { pricePrecision: 4, volumePrecision: 1 },
  TRXUSDT: { pricePrecision: 4, volumePrecision: 1 },
  ARBUSDT: { pricePrecision: 4, volumePrecision: 1 },
  OPUSDT: { pricePrecision: 4, volumePrecision: 1 },
  DOGEUSDT: { pricePrecision: 5, volumePrecision: 0 },
  PEPEUSDT: { pricePrecision: 8, volumePrecision: 0 },
  SHIBUSDT: { pricePrecision: 8, volumePrecision: 0 },
};

export function getSymbolPrecisions(
  symbol: string,
  hintPrice?: number
): { pricePrecision: number; volumePrecision: number } {
  if (hintPrice && Number.isFinite(hintPrice) && hintPrice > 0) {
    return {
      pricePrecision: getPricePrecision(hintPrice),
      volumePrecision: getVolumePrecision(hintPrice),
    };
  }
  return SYMBOL_PRECISION_DEFAULTS[symbol.toUpperCase()] ?? {
    pricePrecision: 2,
    volumePrecision: 2,
  };
}

export function formatPrice(price: number, precision?: number): string {
  if (!Number.isFinite(price) || price === 0) return '—';
  const dec = precision ?? getPricePrecision(price);
  return price.toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

export function formatAmount(amount: number): string {
  if (!Number.isFinite(amount)) return '0';
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 10_000) return `${(amount / 1_000).toFixed(2)}K`;
  if (amount >= 100) return amount.toFixed(2);
  if (amount >= 1) return amount.toFixed(4);
  return amount.toFixed(5);
}

export function formatCompactVolume(vol: number): string {
  if (!Number.isFinite(vol) || vol <= 0) return '—';
  if (vol >= 1_000_000_000) return `$${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
}

export function formatPercent(pct: number): string {
  if (!Number.isFinite(pct)) return '0.00%';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatTimeShort(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
