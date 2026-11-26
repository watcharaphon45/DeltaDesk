import { create } from 'zustand';
import {
  DEFAULT_INDICATORS,
  SUPPORTED_SYMBOLS,
} from '@/constants/markets';
import {
  loadAutoAnalysis,
  loadFavorites,
  loadIndicators,
  loadPreferences,
  saveAutoAnalysis,
  saveFavorites,
  saveIndicators,
  savePreferences,
} from '@/lib/storage';
import type {
  ActiveIndicatorConfig,
  AutoAnalysisConfig,
  AutoAnalysisSummary,
  AutoSensitivity,
  CandleStyleType,
  Timeframe,
  WatchlistTicker,
  WsConnectionStatus,
} from '@/types/market';

const DEFAULT_AUTO_ANALYSIS: AutoAnalysisConfig = {
  autoSR: true,
  autoTrendlines: true,
  autoFib: false,
  sensitivity: 'medium',
};

interface TerminalState {
  activeSymbol: string;
  timeframe: Timeframe;
  candleType: CandleStyleType;
  wsStatus: WsConnectionStatus;

  // Live header / ticker for active pair
  livePrice: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;

  // Drawing tools state
  activeDrawingTool: string | null; // null = cursor
  magnetMode: 'normal' | 'weak_magnet' | 'strong_magnet';
  drawingsLocked: boolean;
  drawingsHidden: boolean;
  clearDrawingsSignal: number;
  resetChartSignal: number;
  screenshotSignal: number;

  // Indicators
  activeIndicators: ActiveIndicatorConfig[];
  indicatorsModalOpen: boolean;

  // Auto Technical Analysis
  autoAnalysis: AutoAnalysisConfig;
  autoSummary: AutoAnalysisSummary | null;

  // Symbol selector list & favorites
  watchlist: WatchlistTicker[];
  favorites: string[];

  // Actions
  hydrateFromStorage: () => void;
  setActiveSymbol: (symbol: string) => void;
  setTimeframe: (tf: Timeframe) => void;
  setCandleType: (type: CandleStyleType) => void;
  setWsStatus: (status: WsConnectionStatus) => void;
  updateLivePrice: (price: number) => void;
  updateActiveTickerStats: (stats: {
    lastPrice: number;
    priceChangePercent?: number;
    high24h?: number;
    low24h?: number;
    volume24h?: number;
  }) => void;
  setActiveDrawingTool: (tool: string | null) => void;
  cycleMagnetMode: () => void;
  toggleDrawingsLocked: () => void;
  toggleDrawingsHidden: () => void;
  triggerClearDrawings: () => void;
  triggerResetChart: () => void;
  triggerScreenshot: () => void;
  setIndicatorsModalOpen: (open: boolean) => void;
  addIndicator: (ind: ActiveIndicatorConfig) => void;
  removeIndicator: (id: string) => void;
  updateIndicatorParams: (id: string, params: number[]) => void;
  resetDefaultIndicators: () => void;
  setWatchlist: (items: WatchlistTicker[]) => void;
  toggleFavorite: (symbol: string) => void;
  toggleAutoFeature: (key: 'autoSR' | 'autoTrendlines' | 'autoFib') => void;
  setAllAutoFeatures: (enabled: boolean) => void;
  setAutoSensitivity: (sensitivity: AutoSensitivity) => void;
  setAutoSummary: (summary: AutoAnalysisSummary | null) => void;
}

const INITIAL_WATCHLIST: WatchlistTicker[] = SUPPORTED_SYMBOLS.map((s) => ({
  symbol: s.symbol,
  base: s.base,
  name: s.name,
  lastPrice: 0,
  priceChangePercent: 0,
  high24h: 0,
  low24h: 0,
  volume24h: 0,
}));

export const useTerminalStore = create<TerminalState>((set, get) => ({
  activeSymbol: 'BTCUSDT',
  timeframe: '15m',
  candleType: 'candle_solid',
  wsStatus: 'connecting',

  livePrice: 0,
  priceChangePercent: 0,
  high24h: 0,
  low24h: 0,
  volume24h: 0,

  activeDrawingTool: null,
  magnetMode: 'weak_magnet',
  drawingsLocked: false,
  drawingsHidden: false,
  clearDrawingsSignal: 0,
  resetChartSignal: 0,
  screenshotSignal: 0,

  activeIndicators: DEFAULT_INDICATORS,
  indicatorsModalOpen: false,
  autoAnalysis: DEFAULT_AUTO_ANALYSIS,
  autoSummary: null,

  watchlist: INITIAL_WATCHLIST,
  favorites: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'],

  hydrateFromStorage: () => {
    const prefs = loadPreferences();
    const favs = loadFavorites();
    const inds = loadIndicators(DEFAULT_INDICATORS);
    const autoCfg = loadAutoAnalysis(DEFAULT_AUTO_ANALYSIS);
    set({
      activeSymbol: prefs.activeSymbol || 'BTCUSDT',
      timeframe: prefs.timeframe || '15m',
      favorites: favs,
      activeIndicators: inds,
      autoAnalysis: autoCfg,
    });
  },

  setActiveSymbol: (symbol) => {
    const upper = symbol.toUpperCase();
    const existing = get().watchlist.find((w) => w.symbol === upper);
    savePreferences({ activeSymbol: upper });
    set({
      activeSymbol: upper,
      livePrice: existing?.lastPrice || 0,
      priceChangePercent: existing?.priceChangePercent || 0,
      high24h: existing?.high24h || 0,
      low24h: existing?.low24h || 0,
      volume24h: existing?.volume24h || 0,
    });
  },

  setTimeframe: (timeframe) => {
    savePreferences({ timeframe });
    set({ timeframe });
  },

  setCandleType: (candleType) => set({ candleType }),

  setWsStatus: (wsStatus) => set({ wsStatus }),

  updateLivePrice: (price) => {
    if (!Number.isFinite(price) || price <= 0) return;
    if (get().livePrice === price) return;
    set({ livePrice: price });
  },

  updateActiveTickerStats: (stats) => {
    if (!Number.isFinite(stats.lastPrice) || stats.lastPrice <= 0) return;
    set((s) => ({
      livePrice: stats.lastPrice,
      priceChangePercent: stats.priceChangePercent ?? s.priceChangePercent,
      high24h: stats.high24h ?? s.high24h,
      low24h: stats.low24h ?? s.low24h,
      volume24h: stats.volume24h ?? s.volume24h,
    }));
  },

  setActiveDrawingTool: (activeDrawingTool) => set({ activeDrawingTool }),

  cycleMagnetMode: () =>
    set((s) => ({
      magnetMode:
        s.magnetMode === 'normal'
          ? 'weak_magnet'
          : s.magnetMode === 'weak_magnet'
            ? 'strong_magnet'
            : 'normal',
    })),

  toggleDrawingsLocked: () => set((s) => ({ drawingsLocked: !s.drawingsLocked })),
  toggleDrawingsHidden: () => set((s) => ({ drawingsHidden: !s.drawingsHidden })),
  triggerClearDrawings: () => set((s) => ({ clearDrawingsSignal: s.clearDrawingsSignal + 1 })),
  triggerResetChart: () => set((s) => ({ resetChartSignal: s.resetChartSignal + 1 })),
  triggerScreenshot: () => set((s) => ({ screenshotSignal: s.screenshotSignal + 1 })),

  setIndicatorsModalOpen: (indicatorsModalOpen) => set({ indicatorsModalOpen }),

  addIndicator: (ind) => {
    const next = [...get().activeIndicators, ind];
    saveIndicators(next);
    set({ activeIndicators: next });
  },

  removeIndicator: (id) => {
    const next = get().activeIndicators.filter((i) => i.id !== id);
    saveIndicators(next);
    set({ activeIndicators: next });
  },

  updateIndicatorParams: (id, params) => {
    const next = get().activeIndicators.map((i) =>
      i.id === id ? { ...i, calcParams: params } : i
    );
    saveIndicators(next);
    set({ activeIndicators: next });
  },

  resetDefaultIndicators: () => {
    saveIndicators(DEFAULT_INDICATORS);
    set({ activeIndicators: DEFAULT_INDICATORS });
  },

  setWatchlist: (items) => {
    if (items.length === 0) return;
    const map = new Map(items.map((i) => [i.symbol, i]));
    const merged = get().watchlist.map((w) => map.get(w.symbol) ?? w);
    const active = merged.find((w) => w.symbol === get().activeSymbol);
    set({
      watchlist: merged,
      ...(active && active.lastPrice > 0
        ? {
            livePrice: get().livePrice || active.lastPrice,
            priceChangePercent: active.priceChangePercent,
            high24h: active.high24h,
            low24h: active.low24h,
            volume24h: active.volume24h,
          }
        : {}),
    });
  },

  toggleFavorite: (symbol) => {
    const upper = symbol.toUpperCase();
    const cur = get().favorites;
    const next = cur.includes(upper)
      ? cur.filter((s) => s !== upper)
      : [...cur, upper];
    saveFavorites(next);
    set({ favorites: next });
  },

  toggleAutoFeature: (key) => {
    const cur = get().autoAnalysis;
    const next: AutoAnalysisConfig = { ...cur, [key]: !cur[key] };
    saveAutoAnalysis(next);
    set({ autoAnalysis: next });
  },

  setAllAutoFeatures: (enabled) => {
    const cur = get().autoAnalysis;
    const next: AutoAnalysisConfig = {
      ...cur,
      autoSR: enabled,
      autoTrendlines: enabled,
      autoFib: enabled,
    };
    saveAutoAnalysis(next);
    set({ autoAnalysis: next });
  },

  setAutoSensitivity: (sensitivity) => {
    const cur = get().autoAnalysis;
    const next: AutoAnalysisConfig = { ...cur, sensitivity };
    saveAutoAnalysis(next);
    set({ autoAnalysis: next });
  },

  setAutoSummary: (autoSummary) => set({ autoSummary }),
}));
