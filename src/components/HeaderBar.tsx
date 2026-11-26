'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Activity, ChevronDown, Search, Star, Wallet } from 'lucide-react';
import { useTerminalStore } from '@/store/useTerminalStore';
import { useFuturesStore } from '@/store/useFuturesStore';
import { SUPPORTED_SYMBOLS } from '@/constants/markets';
import {
  formatCompactVolume,
  formatPercent,
  formatPrice,
  getPricePrecision,
} from '@/lib/format';
import type { WatchlistTicker } from '@/types/market';

function LiveHeaderStats() {
  const livePrice = useTerminalStore((s) => s.livePrice);
  const priceChangePercent = useTerminalStore((s) => s.priceChangePercent);
  const high24h = useTerminalStore((s) => s.high24h);
  const low24h = useTerminalStore((s) => s.low24h);
  const volume24h = useTerminalStore((s) => s.volume24h);

  const precision = getPricePrecision(livePrice);
  const isUp = priceChangePercent >= 0;

  return (
    <div className="flex items-center gap-4 ml-1 overflow-hidden">
      <div className="flex flex-col">
        <span
          className={`font-mono tabular-nums text-sm font-semibold leading-tight ${
            isUp ? 'text-terminal-bull' : 'text-terminal-bear'
          }`}
        >
          {formatPrice(livePrice, precision)}
        </span>
        <span
          className={`font-mono tabular-nums text-[10px] leading-tight ${
            isUp ? 'text-terminal-bull' : 'text-terminal-bear'
          }`}
        >
          {formatPercent(priceChangePercent)} (24h)
        </span>
      </div>

      <div className="hidden md:flex items-center gap-4 text-[11px]">
        <div>
          <div className="text-terminal-muted text-[10px]">24h High</div>
          <div className="font-mono tabular-nums text-terminal-text">
            {formatPrice(high24h, precision)}
          </div>
        </div>
        <div>
          <div className="text-terminal-muted text-[10px]">24h Low</div>
          <div className="font-mono tabular-nums text-terminal-text">
            {formatPrice(low24h, precision)}
          </div>
        </div>
        <div>
          <div className="text-terminal-muted text-[10px]">24h Volume</div>
          <div className="font-mono tabular-nums text-terminal-text">
            {formatCompactVolume(volume24h)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeaderBar() {
  const activeSymbol = useTerminalStore((s) => s.activeSymbol);
  const wsStatus = useTerminalStore((s) => s.wsStatus);
  const watchlist = useTerminalStore((s) => s.watchlist);
  const favorites = useTerminalStore((s) => s.favorites);
  const setActiveSymbol = useTerminalStore((s) => s.setActiveSymbol);
  const toggleFavorite = useTerminalStore((s) => s.toggleFavorite);
  const setWatchlist = useTerminalStore((s) => s.setWatchlist);

  const showOrderPanel = useFuturesStore((s) => s.showOrderPanel);
  const openPosCount = useFuturesStore((s) => s.positions.length);
  const toggleOrderPanel = useFuturesStore((s) => s.toggleOrderPanel);

  const [symbolMenuOpen, setSymbolMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'fav'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSymbolMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const openDropdown = () => {
    const next = !symbolMenuOpen;
    setSymbolMenuOpen(next);
    if (next) {
      fetch('/api/tickers', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { watchlist?: WatchlistTicker[] } | null) => {
          if (data?.watchlist) setWatchlist(data.watchlist);
        })
        .catch(() => {});
    }
  };

  const meta = SUPPORTED_SYMBOLS.find((s) => s.symbol === activeSymbol) ?? {
    symbol: activeSymbol,
    base: activeSymbol.replace('USDT', ''),
    quote: 'USDT' as const,
    name: activeSymbol,
  };

  const filteredSymbols = watchlist.filter((w) => {
    if (tab === 'fav' && !favorites.includes(w.symbol)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.symbol.toLowerCase().includes(q) ||
      w.name.toLowerCase().includes(q)
    );
  });

  const statusColor =
    wsStatus === 'connected'
      ? 'bg-terminal-bull'
      : wsStatus === 'connecting' || wsStatus === 'reconnecting'
        ? 'bg-terminal-gold animate-pulse'
        : 'bg-terminal-bear';

  return (
    <header className="h-12 bg-terminal-surface border-b border-terminal-border px-3 flex items-center justify-between gap-3 shrink-0 select-none">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 pr-2 border-r border-terminal-border">
          <div className="w-7 h-7 rounded bg-terminal-blue/15 border border-terminal-blue/40 flex items-center justify-center text-terminal-blue">
            <Activity className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-terminal-text hidden sm:inline">
            Delta<span className="text-terminal-blue">Desk</span>
          </span>
        </div>

        {/* Symbol Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={openDropdown}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-terminal-elevated hover:bg-terminal-border/60 border border-terminal-border transition-colors"
          >
            <span className="font-semibold text-sm text-terminal-text">
              {meta.base}
              <span className="text-terminal-muted font-normal">/USDT</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-terminal-muted" />
          </button>

          {symbolMenuOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-80 bg-terminal-surface border border-terminal-border rounded-lg shadow-2xl z-50 overflow-hidden">
              <div className="p-2 border-b border-terminal-border space-y-2">
                <div className="flex items-center gap-1 bg-terminal-bg rounded p-0.5 border border-terminal-border">
                  <button
                    type="button"
                    onClick={() => setTab('all')}
                    className={`flex-1 py-1 rounded text-[11px] font-medium ${
                      tab === 'all'
                        ? 'bg-terminal-elevated text-terminal-text'
                        : 'text-terminal-muted hover:text-terminal-text'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('fav')}
                    className={`flex-1 py-1 rounded text-[11px] font-medium flex items-center justify-center gap-1 ${
                      tab === 'fav'
                        ? 'bg-terminal-elevated text-terminal-gold'
                        : 'text-terminal-muted hover:text-terminal-text'
                    }`}
                  >
                    <Star className="w-3 h-3 fill-current" />
                    ติดดาว
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-terminal-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาเหรียญ (เช่น BTC, ETH, SOL)..."
                    className="w-full bg-terminal-bg border border-terminal-border rounded pl-8 pr-2.5 py-1.5 text-xs text-terminal-text placeholder:text-terminal-muted focus:outline-none focus:border-terminal-blue"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-terminal-border/40">
                {filteredSymbols.map((item) => {
                  const isFav = favorites.includes(item.symbol);
                  const up = item.priceChangePercent >= 0;
                  return (
                    <div
                      key={item.symbol}
                      onClick={() => {
                        setActiveSymbol(item.symbol);
                        setSymbolMenuOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-terminal-elevated text-xs ${
                        item.symbol === activeSymbol ? 'bg-terminal-blue/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.symbol);
                          }}
                          className="text-terminal-muted hover:text-terminal-gold"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              isFav ? 'fill-terminal-gold text-terminal-gold' : ''
                            }`}
                          />
                        </button>
                        <div>
                          <div className="font-medium text-terminal-text">
                            {item.base}/USDT
                          </div>
                          <div className="text-[10px] text-terminal-muted">
                            {item.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right tabular-nums font-mono">
                        <div className="text-terminal-text">
                          {formatPrice(item.lastPrice)}
                        </div>
                        <div
                          className={`text-[10px] ${
                            up ? 'text-terminal-bull' : 'text-terminal-bear'
                          }`}
                        >
                          {formatPercent(item.priceChangePercent)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredSymbols.length === 0 && (
                  <div className="p-4 text-center text-xs text-terminal-muted">
                    ไม่พบเหรียญที่ค้นหา
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <LiveHeaderStats />
      </div>

      {/* Right: Futures Toggle + Binance WS Status */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={toggleOrderPanel}
          title="เปิด/ปิดแผงจำลองเทรด Futures"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-medium transition-colors ${
            showOrderPanel
              ? 'bg-terminal-blue/15 border-terminal-blue/50 text-terminal-blue'
              : 'bg-terminal-bg border-terminal-border text-terminal-text hover:bg-terminal-elevated'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Futures ทดสอบเทรด</span>
          {openPosCount > 0 && (
            <span className="px-1 rounded bg-terminal-bull/20 text-terminal-bull font-mono text-[10px]">
              {openPosCount}
            </span>
          )}
        </button>

        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-terminal-bg border border-terminal-border text-[11px] text-terminal-muted"
          title={`Binance WebSocket: ${wsStatus}`}
        >
          <span className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="hidden md:inline">Binance</span>
          <span className="capitalize hidden sm:inline">{wsStatus}</span>
        </div>
      </div>
    </header>
  );
}
