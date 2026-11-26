import type { ActiveIndicatorConfig, Timeframe } from '@/types/market';

export interface SymbolMeta {
  symbol: string;
  base: string;
  quote: 'USDT';
  name: string;
}

export const SUPPORTED_SYMBOLS: SymbolMeta[] = [
  { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', name: 'Bitcoin' },
  { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', name: 'Ethereum' },
  { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT', name: 'Solana' },
  { symbol: 'BNBUSDT', base: 'BNB', quote: 'USDT', name: 'BNB' },
  { symbol: 'XRPUSDT', base: 'XRP', quote: 'USDT', name: 'XRP' },
  { symbol: 'DOGEUSDT', base: 'DOGE', quote: 'USDT', name: 'Dogecoin' },
  { symbol: 'ADAUSDT', base: 'ADA', quote: 'USDT', name: 'Cardano' },
  { symbol: 'AVAXUSDT', base: 'AVAX', quote: 'USDT', name: 'Avalanche' },
  { symbol: 'LINKUSDT', base: 'LINK', quote: 'USDT', name: 'Chainlink' },
  { symbol: 'SUIUSDT', base: 'SUI', quote: 'USDT', name: 'Sui' },
  { symbol: 'TONUSDT', base: 'TON', quote: 'USDT', name: 'Toncoin' },
  { symbol: 'DOTUSDT', base: 'DOT', quote: 'USDT', name: 'Polkadot' },
  { symbol: 'NEARUSDT', base: 'NEAR', quote: 'USDT', name: 'NEAR Protocol' },
  { symbol: 'LTCUSDT', base: 'LTC', quote: 'USDT', name: 'Litecoin' },
  { symbol: 'TRXUSDT', base: 'TRX', quote: 'USDT', name: 'TRON' },
  { symbol: 'APTUSDT', base: 'APT', quote: 'USDT', name: 'Aptos' },
  { symbol: 'ARBUSDT', base: 'ARB', quote: 'USDT', name: 'Arbitrum' },
  { symbol: 'OPUSDT', base: 'OP', quote: 'USDT', name: 'Optimism' },
  { symbol: 'PEPEUSDT', base: 'PEPE', quote: 'USDT', name: 'Pepe' },
  { symbol: 'SHIBUSDT', base: 'SHIB', quote: 'USDT', name: 'Shiba Inu' },
];

export interface TimeframeMeta {
  value: Timeframe;
  label: string;
  span: number;
  type: 'minute' | 'hour' | 'day' | 'week';
}

export const TIMEFRAMES: TimeframeMeta[] = [
  { value: '1m', label: '1m', span: 1, type: 'minute' },
  { value: '5m', label: '5m', span: 5, type: 'minute' },
  { value: '15m', label: '15m', span: 15, type: 'minute' },
  { value: '1h', label: '1H', span: 1, type: 'hour' },
  { value: '4h', label: '4H', span: 4, type: 'hour' },
  { value: '1d', label: '1D', span: 1, type: 'day' },
  { value: '1w', label: '1W', span: 1, type: 'week' },
];

export interface IndicatorCatalogItem {
  name: string;
  label: string;
  category: 'main' | 'sub';
  defaultParams: number[];
  description: string;
}

export const INDICATORS_CATALOG: IndicatorCatalogItem[] = [
  {
    name: 'EMA',
    label: 'EMA (Exponential Moving Average)',
    category: 'main',
    defaultParams: [9, 21, 50],
    description: 'เส้นค่าเฉลี่ยเคลื่อนที่แบบให้น้ำหนักราคาล่าสุด',
  },
  {
    name: 'MA',
    label: 'MA (Simple Moving Average)',
    category: 'main',
    defaultParams: [7, 25, 99],
    description: 'เส้นค่าเฉลี่ยเคลื่อนที่อย่างง่าย',
  },
  {
    name: 'BOLL',
    label: 'BOLL (Bollinger Bands)',
    category: 'main',
    defaultParams: [20, 2],
    description: 'แถบความผันผวน Upper / Mid / Lower',
  },
  {
    name: 'SAR',
    label: 'SAR (Parabolic SAR)',
    category: 'main',
    defaultParams: [2, 2, 20],
    description: 'จุดกลับตัวของแนวโน้ม Stop & Reverse',
  },
  {
    name: 'VOL',
    label: 'VOL (Volume)',
    category: 'sub',
    defaultParams: [5, 10],
    description: 'ปริมาณการซื้อขายต่อแท่งเทียน',
  },
  {
    name: 'RSI',
    label: 'RSI (Relative Strength Index)',
    category: 'sub',
    defaultParams: [14],
    description: 'ดัชนีวัดภาวะ Overbought / Oversold',
  },
  {
    name: 'MACD',
    label: 'MACD',
    category: 'sub',
    defaultParams: [12, 26, 9],
    description: 'Moving Average Convergence Divergence',
  },
  {
    name: 'KDJ',
    label: 'KDJ (Stochastic)',
    category: 'sub',
    defaultParams: [9, 3, 3],
    description: 'Stochastic Oscillator พร้อมเส้น J',
  },
  {
    name: 'WR',
    label: 'WR (Williams %R)',
    category: 'sub',
    defaultParams: [6, 10, 14],
    description: 'Williams Percent Range',
  },
  {
    name: 'CCI',
    label: 'CCI (Commodity Channel Index)',
    category: 'sub',
    defaultParams: [13],
    description: 'วัดความเบี่ยงเบนของราคาจากค่าเฉลี่ย',
  },
  {
    name: 'ATR',
    label: 'ATR (Average True Range)',
    category: 'sub',
    defaultParams: [14],
    description: 'วัดความผันผวนของราคาเฉลี่ย',
  },
  {
    name: 'OBV',
    label: 'OBV (On-Balance Volume)',
    category: 'sub',
    defaultParams: [30],
    description: 'ปริมาณซื้อขายสะสมตามทิศทางราคา',
  },
];

export const DEFAULT_INDICATORS: ActiveIndicatorConfig[] = [
  {
    id: 'ind_ema_main',
    name: 'EMA',
    paneId: 'candle_pane',
    isStack: true,
    calcParams: [9, 21, 50],
  },
  {
    id: 'ind_vol_sub',
    name: 'VOL',
    paneId: 'pane_vol',
    isStack: false,
    calcParams: [5, 10],
  },
];

export interface DrawingToolItem {
  id: string;
  overlayName: string;
  label: string;
  group: 'lines' | 'channels' | 'fib' | 'annotation';
}

export const DRAWING_TOOLS: DrawingToolItem[] = [
  { id: 'segment', overlayName: 'segment', label: 'Trend Line (เส้นแนวโน้ม)', group: 'lines' },
  { id: 'rayLine', overlayName: 'rayLine', label: 'Ray (เส้นรังสี)', group: 'lines' },
  { id: 'straightLine', overlayName: 'straightLine', label: 'Extended Line (เส้นตรงยาว)', group: 'lines' },
  { id: 'horizontalStraightLine', overlayName: 'horizontalStraightLine', label: 'Horizontal Line (แนวรับ/ต้าน)', group: 'lines' },
  { id: 'horizontalRayLine', overlayName: 'horizontalRayLine', label: 'Horizontal Ray (แนวนอนข้างเดียว)', group: 'lines' },
  { id: 'verticalStraightLine', overlayName: 'verticalStraightLine', label: 'Vertical Line (เส้นแนวตั้ง)', group: 'lines' },
  { id: 'priceLine', overlayName: 'priceLine', label: 'Price Line (เส้นราคา)', group: 'lines' },
  { id: 'parallelStraightLine', overlayName: 'parallelStraightLine', label: 'Parallel Channel (ช่องคู่ขนาน)', group: 'channels' },
  { id: 'priceChannelLine', overlayName: 'priceChannelLine', label: 'Price Channel (กรอบราคา)', group: 'channels' },
  { id: 'fibonacciLine', overlayName: 'fibonacciLine', label: 'Fibonacci Retracement', group: 'fib' },
  { id: 'simpleAnnotation', overlayName: 'simpleAnnotation', label: 'Text Note (ปักหมุดข้อความ)', group: 'annotation' },
];
