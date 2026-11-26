import type { KLineData } from 'klinecharts';
import type {
  AutoAnalysisConfig,
  AutoAnalysisSummary,
  AutoFibResult,
  AutoSensitivity,
  AutoTrendlineResult,
  SrZoneLevel,
} from '@/types/market';

interface SensitivityParams {
  pivotSpan: number;
  lookback: number;
  maxLevels: number;
  clusterAtrMult: number;
}

const SENSITIVITY_MAP: Record<AutoSensitivity, SensitivityParams> = {
  short: { pivotSpan: 4, lookback: 180, maxLevels: 2, clusterAtrMult: 0.55 },
  medium: { pivotSpan: 8, lookback: 320, maxLevels: 2, clusterAtrMult: 0.75 },
  long: { pivotSpan: 14, lookback: 500, maxLevels: 3, clusterAtrMult: 1.0 },
};

interface PivotPoint {
  idx: number;
  timestamp: number;
  price: number;
  volume: number;
  kind: 'high' | 'low';
}

export interface AutoAnalysisOutput {
  srZones: SrZoneLevel[];
  trendlines: AutoTrendlineResult[];
  fib: AutoFibResult | null;
  lastTimestamp: number;
  summary: AutoAnalysisSummary;
}

function computeAtr(bars: KLineData[], period = 14): number {
  if (bars.length < 2) return 0;
  const start = Math.max(1, bars.length - period);
  let trSum = 0;
  let count = 0;
  for (let i = start; i < bars.length; i++) {
    const cur = bars[i];
    const prevClose = bars[i - 1].close;
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prevClose),
      Math.abs(cur.low - prevClose)
    );
    trSum += tr;
    count += 1;
  }
  const atr = count > 0 ? trSum / count : 0;
  if (atr > 0) return atr;

  let minL = Infinity;
  let maxH = -Infinity;
  for (const b of bars) {
    if (b.low < minL) minL = b.low;
    if (b.high > maxH) maxH = b.high;
  }
  const fallback = (maxH - minL) / 25;
  return fallback > 0 ? fallback : bars[bars.length - 1].close * 0.005;
}

function detectPivots(bars: KLineData[], span: number): {
  highs: PivotPoint[];
  lows: PivotPoint[];
} {
  const highs: PivotPoint[] = [];
  const lows: PivotPoint[] = [];
  if (bars.length < span * 2 + 1) return { highs, lows };

  for (let i = span; i <= bars.length - 1 - span; i++) {
    const cur = bars[i];
    let isHigh = true;
    let strictlyHigher = false;
    let isLow = true;
    let strictlyLower = false;

    for (let j = i - span; j <= i + span; j++) {
      if (j === i) continue;
      if (bars[j].high > cur.high) {
        isHigh = false;
      } else if (bars[j].high < cur.high) {
        strictlyHigher = true;
      }
      if (bars[j].low < cur.low) {
        isLow = false;
      } else if (bars[j].low > cur.low) {
        strictlyLower = true;
      }
      if (!isHigh && !isLow) break;
    }

    if (isHigh && strictlyHigher) {
      highs.push({
        idx: i,
        timestamp: cur.timestamp,
        price: cur.high,
        volume: cur.volume ?? 0,
        kind: 'high',
      });
    }
    if (isLow && strictlyLower) {
      lows.push({
        idx: i,
        timestamp: cur.timestamp,
        price: cur.low,
        volume: cur.volume ?? 0,
        kind: 'low',
      });
    }
  }

  return { highs, lows };
}

function computeSrZones(
  bars: KLineData[],
  pivots: PivotPoint[],
  atr: number,
  params: SensitivityParams
): SrZoneLevel[] {
  if (pivots.length === 0 || atr <= 0) return [];
  const sorted = [...pivots].sort((a, b) => a.price - b.price);

  interface Cluster {
    prices: number[];
    center: number;
    totalWeight: number;
    earliestIdx: number;
  }

  const clusters: Cluster[] = [];
  const maxDist = atr * params.clusterAtrMult;

  for (const p of sorted) {
    const weight = Math.max(p.volume, 1);
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(p.price - last.center) <= maxDist) {
      const nextWeight = last.totalWeight + weight;
      last.center = (last.center * last.totalWeight + p.price * weight) / nextWeight;
      last.totalWeight = nextWeight;
      last.prices.push(p.price);
      if (p.idx < last.earliestIdx) last.earliestIdx = p.idx;
    } else {
      clusters.push({
        prices: [p.price],
        center: p.price,
        totalWeight: weight,
        earliestIdx: p.idx,
      });
    }
  }

  const totalBarVol = bars.reduce((acc, b) => acc + (b.volume ?? 0), 0);
  const avgBarVol = Math.max(totalBarVol / bars.length, 1);
  const lastClose = bars[bars.length - 1].close;

  interface ScoredZone {
    centerPrice: number;
    zoneHigh: number;
    zoneLow: number;
    touches: number;
    strength: number;
    score: number;
    startTimestamp: number;
  }

  const scored: ScoredZone[] = [];
  const touchBand = atr * 0.12;

  for (const cl of clusters) {
    let touches = 0;
    let lastTouchIdx = -999;
    let clusterVol = 0;

    for (let i = cl.earliestIdx; i < bars.length; i++) {
      const b = bars[i];
      if (b.low - touchBand <= cl.center && b.high + touchBand >= cl.center) {
        if (i - lastTouchIdx >= params.pivotSpan) {
          touches += 1;
          lastTouchIdx = i;
        }
        clusterVol += b.volume ?? 0;
      }
    }

    if (touches < 2 && cl.prices.length < 2) continue;
    const effectiveTouches = Math.max(touches, cl.prices.length);

    let variance = 0;
    for (const pr of cl.prices) {
      variance += (pr - cl.center) ** 2;
    }
    const stdSpread = Math.sqrt(variance / cl.prices.length);
    const halfBand = Math.min(Math.max(stdSpread, 0.12 * atr), 0.35 * atr);

    const recency = Math.max(0, lastTouchIdx) / bars.length;
    const rawScore =
      effectiveTouches * 2.2 +
      Math.log1p(clusterVol / avgBarVol) * 1.2 +
      recency * 1.5;
    const distPenalty = 1 + Math.abs(lastClose - cl.center) / (atr * 8);

    scored.push({
      centerPrice: cl.center,
      zoneHigh: cl.center + halfBand,
      zoneLow: cl.center - halfBand,
      touches: effectiveTouches,
      strength: Math.min(5, Math.max(1, Math.round(effectiveTouches))),
      score: rawScore / distPenalty,
      startTimestamp: bars[cl.earliestIdx].timestamp,
    });
  }

  const pickNonOverlapping = (
    candidates: ScoredZone[],
    role: 'support' | 'resistance'
  ): SrZoneLevel[] => {
    const orderedByScore = [...candidates].sort((a, b) => b.score - a.score);
    const picked: ScoredZone[] = [];
    const minSep = atr * 0.8;

    for (const c of orderedByScore) {
      if (picked.some((p) => Math.abs(p.centerPrice - c.centerPrice) < minSep)) {
        continue;
      }
      picked.push(c);
      if (picked.length >= params.maxLevels) break;
    }

    picked.sort((a, b) =>
      role === 'support'
        ? b.centerPrice - a.centerPrice
        : a.centerPrice - b.centerPrice
    );

    return picked.map((z, idx) => ({
      role,
      label: `${role === 'support' ? 'S' : 'R'}${idx + 1}`,
      centerPrice: z.centerPrice,
      zoneHigh: z.zoneHigh,
      zoneLow: z.zoneLow,
      touches: z.touches,
      strength: z.strength,
      startTimestamp: z.startTimestamp,
    }));
  };

  const supports = pickNonOverlapping(
    scored.filter((z) => z.centerPrice < lastClose),
    'support'
  );
  const resistances = pickNonOverlapping(
    scored.filter((z) => z.centerPrice >= lastClose),
    'resistance'
  );

  return [...resistances, ...supports];
}

function computeTrendlines(
  bars: KLineData[],
  highs: PivotPoint[],
  lows: PivotPoint[],
  atr: number,
  span: number
): AutoTrendlineResult[] {
  const results: AutoTrendlineResult[] = [];
  const n = bars.length;
  if (n < span * 2 + 5 || atr <= 0) return results;

  const lastClose = bars[n - 1].close;
  const lastTs = bars[n - 1].timestamp;
  const minP2Idx = Math.floor(n * 0.35);
  const touchStep = Math.max(3, Math.floor(span / 2));

  let bestUp: { score: number; res: AutoTrendlineResult } | null = null;
  for (let i = 0; i < lows.length; i++) {
    const p1 = lows[i];
    for (let j = i + 1; j < lows.length; j++) {
      const p2 = lows[j];
      if (p2.idx < minP2Idx || p2.idx - p1.idx < span) continue;
      if (p2.price <= p1.price) continue;

      const slope = (p2.price - p1.price) / (p2.idx - p1.idx);
      const endPrice = p1.price + slope * (n - 1 - p1.idx);
      if (lastClose < endPrice - 0.3 * atr) continue;

      let violations = 0;
      let touches = 0;
      let lastTouch = -999;

      for (let k = p1.idx; k < n; k++) {
        const lineP = p1.price + slope * (k - p1.idx);
        const bodyLow = Math.min(bars[k].open, bars[k].close);
        if (bodyLow < lineP - 0.25 * atr) {
          violations += 1;
          if (violations > 1) break;
        }
        if (Math.abs(bars[k].low - lineP) <= 0.28 * atr && k - lastTouch >= touchStep) {
          touches += 1;
          lastTouch = k;
        }
      }

      if (violations > 1) continue;
      const score = touches * 3 + ((p2.idx - p1.idx) / n) * 2;
      if (!bestUp || score > bestUp.score) {
        bestUp = {
          score,
          res: {
            kind: 'uptrend',
            p1: { timestamp: p1.timestamp, price: p1.price },
            p2: { timestamp: p2.timestamp, price: p2.price },
            projectedEnd: { timestamp: lastTs, price: endPrice },
            touches: Math.max(touches, 2),
          },
        };
      }
    }
  }
  if (bestUp) results.push(bestUp.res);

  let bestDown: { score: number; res: AutoTrendlineResult } | null = null;
  for (let i = 0; i < highs.length; i++) {
    const p1 = highs[i];
    for (let j = i + 1; j < highs.length; j++) {
      const p2 = highs[j];
      if (p2.idx < minP2Idx || p2.idx - p1.idx < span) continue;
      if (p2.price >= p1.price) continue;

      const slope = (p2.price - p1.price) / (p2.idx - p1.idx);
      const endPrice = p1.price + slope * (n - 1 - p1.idx);
      if (lastClose > endPrice + 0.3 * atr) continue;

      let violations = 0;
      let touches = 0;
      let lastTouch = -999;

      for (let k = p1.idx; k < n; k++) {
        const lineP = p1.price + slope * (k - p1.idx);
        const bodyHigh = Math.max(bars[k].open, bars[k].close);
        if (bodyHigh > lineP + 0.25 * atr) {
          violations += 1;
          if (violations > 1) break;
        }
        if (Math.abs(bars[k].high - lineP) <= 0.28 * atr && k - lastTouch >= touchStep) {
          touches += 1;
          lastTouch = k;
        }
      }

      if (violations > 1) continue;
      const score = touches * 3 + ((p2.idx - p1.idx) / n) * 2;
      if (!bestDown || score > bestDown.score) {
        bestDown = {
          score,
          res: {
            kind: 'downtrend',
            p1: { timestamp: p1.timestamp, price: p1.price },
            p2: { timestamp: p2.timestamp, price: p2.price },
            projectedEnd: { timestamp: lastTs, price: endPrice },
            touches: Math.max(touches, 2),
          },
        };
      }
    }
  }
  if (bestDown) results.push(bestDown.res);

  return results;
}

function computeAutoFib(bars: KLineData[]): AutoFibResult | null {
  if (bars.length < 10) return null;
  const searchEnd = bars.length > 20 ? bars.length - 1 : bars.length;

  let highIdx = 0;
  let lowIdx = 0;
  for (let i = 1; i < searchEnd; i++) {
    if (bars[i].high > bars[highIdx].high) highIdx = i;
    if (bars[i].low < bars[lowIdx].low) lowIdx = i;
  }

  const highPrice = bars[highIdx].high;
  const lowPrice = bars[lowIdx].low;
  const range = highPrice - lowPrice;
  if (range <= 0) return null;

  const direction = highIdx > lowIdx ? 'bullish' : 'bearish';
  const fib618 =
    direction === 'bullish'
      ? highPrice - 0.618 * range
      : lowPrice + 0.618 * range;
  const fib500 =
    direction === 'bullish'
      ? highPrice - 0.5 * range
      : lowPrice + 0.5 * range;

  return {
    direction,
    swingHigh: { timestamp: bars[highIdx].timestamp, price: highPrice },
    swingLow: { timestamp: bars[lowIdx].timestamp, price: lowPrice },
    goldenPocketHigh: Math.max(fib500, fib618),
    goldenPocketLow: Math.min(fib500, fib618),
    fib618,
  };
}

export function computeAutoAnalysis(
  bars: KLineData[],
  config: AutoAnalysisConfig
): AutoAnalysisOutput {
  const params = SENSITIVITY_MAP[config.sensitivity];
  const slice = bars.slice(-params.lookback);
  const lastTimestamp = slice.length > 0 ? slice[slice.length - 1].timestamp : 0;

  if (slice.length < params.pivotSpan * 2 + 5) {
    return {
      srZones: [],
      trendlines: [],
      fib: null,
      lastTimestamp,
      summary: {
        nearestResistance: null,
        nearestSupport: null,
        fib618: null,
        fibDirection: null,
        hasUptrend: false,
        hasDowntrend: false,
      },
    };
  }

  const atr = computeAtr(slice, 14);
  const { highs, lows } = detectPivots(slice, params.pivotSpan);

  const srZones = config.autoSR
    ? computeSrZones(slice, [...highs, ...lows], atr, params)
    : [];
  const trendlines = config.autoTrendlines
    ? computeTrendlines(slice, highs, lows, atr, params.pivotSpan)
    : [];
  const fib = config.autoFib ? computeAutoFib(slice) : null;

  const nearestResistance =
    srZones.find((z) => z.role === 'resistance' && z.label === 'R1') ?? null;
  const nearestSupport =
    srZones.find((z) => z.role === 'support' && z.label === 'S1') ?? null;

  return {
    srZones,
    trendlines,
    fib,
    lastTimestamp,
    summary: {
      nearestResistance,
      nearestSupport,
      fib618: fib?.fib618 ?? null,
      fibDirection: fib?.direction ?? null,
      hasUptrend: trendlines.some((t) => t.kind === 'uptrend'),
      hasDowntrend: trendlines.some((t) => t.kind === 'downtrend'),
    },
  };
}
