export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export type CandleStyleType =
  | 'candle_solid'
  | 'candle_stroke'
  | 'ohlc'
  | 'area';

export interface CandleBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover?: number;
  [key: string]: unknown;
}

export interface WatchlistTicker {
  symbol: string; // e.g., 'BTCUSDT'
  base: string; // e.g., 'BTC'
  name: string;
  lastPrice: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number; // Quote volume in USDT
}

export interface ActiveIndicatorConfig {
  id: string;
  name: string;
  paneId: string; // 'candle_pane' for overlay, or custom pane id
  isStack: boolean;
  calcParams: number[];
}

export interface SavedOverlayPoint {
  timestamp?: number;
  value?: number;
  dataIndex?: number;
}

export interface SavedOverlay {
  id?: string;
  name: string;
  points: SavedOverlayPoint[];
  extendData?: unknown;
  lock?: boolean;
}

export type WsConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export type AutoSensitivity = 'short' | 'medium' | 'long';

export interface AutoAnalysisConfig {
  autoSR: boolean;
  autoTrendlines: boolean;
  autoFib: boolean;
  sensitivity: AutoSensitivity;
}

export interface SrZoneLevel {
  role: 'support' | 'resistance';
  label: string;
  centerPrice: number;
  zoneHigh: number;
  zoneLow: number;
  touches: number;
  strength: number;
  startTimestamp: number;
}

export interface AutoTrendlineResult {
  kind: 'uptrend' | 'downtrend';
  p1: { timestamp: number; price: number };
  p2: { timestamp: number; price: number };
  projectedEnd: { timestamp: number; price: number };
  touches: number;
}

export interface AutoFibResult {
  direction: 'bullish' | 'bearish';
  swingHigh: { timestamp: number; price: number };
  swingLow: { timestamp: number; price: number };
  goldenPocketHigh: number;
  goldenPocketLow: number;
  fib618: number;
}

export interface AutoAnalysisSummary {
  nearestResistance: SrZoneLevel | null;
  nearestSupport: SrZoneLevel | null;
  fib618: number | null;
  fibDirection: 'bullish' | 'bearish' | null;
  hasUptrend: boolean;
  hasDowntrend: boolean;
}
