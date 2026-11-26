'use client';

import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useTerminalStore } from '@/store/useTerminalStore';
import { useFuturesStore } from '@/store/useFuturesStore';
import { formatPrice, getPricePrecision } from '@/lib/format';
import { HeaderBar } from './HeaderBar';
import { FuturesOrderForm } from './futures/FuturesOrderForm';
import { FuturesBottomPanel } from './futures/FuturesBottomPanel';
import type { WatchlistTicker } from '@/types/market';

const ChartWorkspace = dynamic(
  () => import('./chart/ChartWorkspace').then((m) => m.ChartWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-terminal-bg flex items-center justify-center text-xs text-terminal-muted">
        กำลังโหลดกราฟ KlineCharts...
      </div>
    ),
  }
);

function DocumentTitleSync() {
  const activeSymbol = useTerminalStore((s) => s.activeSymbol);
  const livePrice = useTerminalStore((s) => s.livePrice);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 1000 && livePrice > 0) return;
    lastUpdateRef.current = now;

    const base = activeSymbol.replace('USDT', '');
    if (livePrice > 0) {
      const prec = getPricePrecision(livePrice);
      document.title = `$${formatPrice(livePrice, prec)} | ${base}/USDT — DeltaDesk`;
    } else {
      document.title = `${base}/USDT — DeltaDesk`;
    }
  }, [activeSymbol, livePrice]);

  return null;
}

export function TradingTerminal() {
  const activeSymbol = useTerminalStore((s) => s.activeSymbol);
  const hydrateFromStorage = useTerminalStore((s) => s.hydrateFromStorage);
  const setWatchlist = useTerminalStore((s) => s.setWatchlist);

  const showOrderPanel = useFuturesStore((s) => s.showOrderPanel);
  const hydrateFutures = useFuturesStore((s) => s.hydrateFutures);
  const seedMarkPrices = useFuturesStore((s) => s.seedMarkPrices);
  const hasOffChartPositions = useFuturesStore(
    (s) =>
      s.positions.some((p) => p.symbol !== activeSymbol) ||
      s.pendingOrders.some((o) => o.symbol !== activeSymbol)
  );

  useEffect(() => {
    hydrateFromStorage();
    hydrateFutures();
    fetch('/api/tickers', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { watchlist?: WatchlistTicker[] } | null) => {
        if (data?.watchlist) {
          setWatchlist(data.watchlist);
          seedMarkPrices(data.watchlist);
        }
      })
      .catch(() => {});
  }, [hydrateFromStorage, hydrateFutures, seedMarkPrices, setWatchlist]);

  // Only poll off-chart symbols if user actually holds positions/orders on other pairs
  useEffect(() => {
    if (!hasOffChartPositions) return;
    const timer = setInterval(() => {
      fetch('/api/tickers', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { watchlist?: WatchlistTicker[] } | null) => {
          if (!data?.watchlist) return;
          const fs = useFuturesStore.getState();
          fs.seedMarkPrices(data.watchlist);
          for (const item of data.watchlist) {
            if (item.symbol !== activeSymbol && item.lastPrice > 0) {
              fs.checkTriggersOnTick(item.symbol, item.lastPrice);
            }
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [hasOffChartPositions, activeSymbol]);

  return (
    <div className="h-screen w-screen flex flex-col bg-terminal-bg text-terminal-text overflow-hidden">
      <DocumentTitleSync />
      <HeaderBar />
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <main className="flex-1 min-h-0 overflow-hidden">
            <ChartWorkspace />
          </main>
          <FuturesBottomPanel />
        </div>
        {showOrderPanel && <FuturesOrderForm />}
      </div>
    </div>
  );
}
