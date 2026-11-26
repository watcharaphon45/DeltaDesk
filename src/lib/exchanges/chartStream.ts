import type { CandleBar, Timeframe, WsConnectionStatus } from '@/types/market';

export interface TickerStatsUpdate {
  lastPrice: number;
  priceChangePercent?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
}

export interface ChartStreamOptions {
  symbol: string;
  timeframe: Timeframe;
  onBar: (bar: CandleBar) => void;
  onTickerStats?: (stats: TickerStatsUpdate) => void;
  onStatus?: (status: WsConnectionStatus) => void;
}

export function subscribeChartStream(opts: ChartStreamOptions): () => void {
  let closed = false;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  let bufferedStats: TickerStatsUpdate | null = null;

  const flushTimer = setInterval(() => {
    if (closed || !bufferedStats) return;
    opts.onTickerStats?.(bufferedStats);
    bufferedStats = null;
  }, 300);

  const cleanupSocket = () => {
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      ws = null;
    }
  };

  const connect = () => {
    if (closed) return;
    opts.onStatus?.(attempt === 0 ? 'connecting' : 'reconnecting');

    const lowerSym = opts.symbol.toLowerCase();
    const klineStream = `${lowerSym}@kline_${opts.timeframe}`;
    const miniTickerStream = `${lowerSym}@miniTicker`;
    const baseWs =
      attempt % 2 === 0
        ? 'wss://data-stream.binance.vision/stream'
        : 'wss://stream.binance.com:9443/stream';

    ws = new WebSocket(`${baseWs}?streams=${klineStream}/${miniTickerStream}`);

    ws.onopen = () => {
      attempt = 0;
      opts.onStatus?.('connected');
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as {
          stream?: string;
          data?: Record<string, unknown>;
        };
        if (!msg.stream || !msg.data) return;

        if (msg.stream === klineStream) {
          const k = (msg.data as {
            k?: {
              t: number;
              o: string;
              h: string;
              l: string;
              c: string;
              v: string;
              q: string;
            };
          }).k;
          if (!k) return;

          const close = Number(k.c);
          opts.onBar({
            timestamp: Number(k.t),
            open: Number(k.o),
            high: Number(k.h),
            low: Number(k.l),
            close,
            volume: Number(k.v),
            turnover: Number(k.q),
          });

          bufferedStats = {
            ...(bufferedStats ?? {}),
            lastPrice: close,
          };
        } else if (msg.stream === miniTickerStream) {
          const d = msg.data as {
            c?: string;
            o?: string;
            h?: string;
            l?: string;
            q?: string;
          };
          const close = Number(d.c);
          const open = Number(d.o);
          if (Number.isFinite(close) && close > 0) {
            const pct = open > 0 ? ((close - open) / open) * 100 : undefined;
            bufferedStats = {
              lastPrice: close,
              priceChangePercent: pct,
              high24h: Number(d.h),
              low24h: Number(d.l),
              volume24h: Number(d.q),
            };
          }
        }
      } catch {
        // ignore malformed packet
      }
    };

    ws.onerror = () => {
      // handled by onclose
    };

    ws.onclose = () => {
      cleanupSocket();
      if (closed) {
        opts.onStatus?.('disconnected');
        return;
      }
      attempt += 1;
      opts.onStatus?.('reconnecting');
      const delay = Math.min(1000 * 2 ** Math.min(attempt, 4), 10000);
      reconnectTimer = setTimeout(connect, delay);
    };
  };

  connect();

  return () => {
    closed = true;
    clearInterval(flushTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    cleanupSocket();
  };
}
