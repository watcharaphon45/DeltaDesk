import type {
  ActiveIndicatorConfig,
  AutoAnalysisConfig,
  SavedOverlay,
  Timeframe,
} from '@/types/market';

const PREFIX = 'deltadesk:';

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export function loadFavorites(): string[] {
  return safeGet<string[]>('favorites', ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']);
}

export function saveFavorites(favorites: string[]): void {
  safeSet('favorites', favorites);
}

export function loadDrawings(symbol: string): SavedOverlay[] {
  return safeGet<SavedOverlay[]>(`drawings:${symbol}`, []);
}

export function saveDrawings(symbol: string, overlays: SavedOverlay[]): void {
  safeSet(`drawings:${symbol}`, overlays);
}

export function loadIndicators(fallback: ActiveIndicatorConfig[]): ActiveIndicatorConfig[] {
  return safeGet<ActiveIndicatorConfig[]>('v2:indicators', fallback);
}

export function saveIndicators(indicators: ActiveIndicatorConfig[]): void {
  safeSet('v2:indicators', indicators);
}

export interface PersistedPreferences {
  activeSymbol?: string;
  timeframe?: Timeframe;
}

export function loadPreferences(): PersistedPreferences {
  return safeGet<PersistedPreferences>('prefs', {});
}

export function savePreferences(prefs: PersistedPreferences): void {
  const prev = loadPreferences();
  safeSet('prefs', { ...prev, ...prefs });
}

export function loadAutoAnalysis(fallback: AutoAnalysisConfig): AutoAnalysisConfig {
  return safeGet<AutoAnalysisConfig>('v2:auto_analysis', fallback);
}

export function saveAutoAnalysis(cfg: AutoAnalysisConfig): void {
  safeSet('v2:auto_analysis', cfg);
}
