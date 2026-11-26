'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import {
  init,
  dispose,
  type Chart,
  type DeepPartial,
  type Styles,
  type KLineData,
} from 'klinecharts';
import { useTerminalStore } from '@/store/useTerminalStore';
import { useFuturesStore } from '@/store/useFuturesStore';
import { TIMEFRAMES } from '@/constants/markets';
import { subscribeChartStream } from '@/lib/exchanges/chartStream';
import { formatPrice, getPricePrecision, getSymbolPrecisions } from '@/lib/format';
import { loadDrawings, saveDrawings } from '@/lib/storage';
import { computeAutoAnalysis } from '@/lib/analysis/autoAnalysis';
import { registerAutoOverlays } from './autoOverlays';
import { TopChartToolbar } from './TopChartToolbar';
import { DrawingToolbar } from './DrawingToolbar';
import { IndicatorsModal } from './IndicatorsModal';
import type { SavedOverlay } from '@/types/market';

const CHART_STYLES: DeepPartial<Styles> = {
  grid: {
    show: true,
    horizontal: {
      show: true,
      size: 1,
      color: '#161c28',
      style: 'dashed',
    },
    vertical: {
      show: true,
      size: 1,
      color: '#161c28',
      style: 'dashed',
    },
  },
  candle: {
    type: 'candle_solid',
    bar: {
      upColor: '#0ecb81',
      downColor: '#f6465d',
      noChangeColor: '#7a869a',
      upBorderColor: '#0ecb81',
      downBorderColor: '#f6465d',
      noChangeBorderColor: '#7a869a',
      upWickColor: '#0ecb81',
      downWickColor: '#f6465d',
      noChangeWickColor: '#7a869a',
    },
    priceMark: {
      show: true,
      high: { show: true, color: '#7a869a', textSize: 10 },
      low: { show: true, color: '#7a869a', textSize: 10 },
      last: {
        show: true,
        upColor: '#0ecb81',
        downColor: '#f6465d',
        noChangeColor: '#7a869a',
        line: { show: true, style: 'dashed', size: 1 },
        text: { show: true, size: 11, color: '#ffffff' },
      },
    },
    tooltip: {
      showRule: 'always',
      showType: 'standard',
      rect: {
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 4,
        paddingBottom: 4,
        color: '#11161f',
        borderColor: '#1c2331',
      },
    },
  },
  indicator: {
    lines: [
      { color: '#f0b90b', size: 1.5, style: 'solid' },
      { color: '#38bdf8', size: 1.5, style: 'solid' },
      { color: '#c084fc', size: 1.5, style: 'solid' },
      { color: '#fb923c', size: 1.5, style: 'solid' },
      { color: '#0ecb81', size: 1.5, style: 'solid' },
    ],
  },
  xAxis: {
    show: true,
    axisLine: { show: true, color: '#1c2331', size: 1 },
    tickLine: { show: true, color: '#1c2331', size: 1, length: 4 },
    tickText: { show: true, color: '#7a869a', size: 11 },
  },
  yAxis: {
    show: true,
    axisLine: { show: true, color: '#1c2331', size: 1 },
    tickLine: { show: true, color: '#1c2331', size: 1, length: 4 },
    tickText: { show: true, color: '#7a869a', size: 11 },
  },
  separator: {
    size: 1,
    color: '#1c2331',
    fill: true,
    activeBackgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  crosshair: {
    show: true,
    horizontal: {
      show: true,
      line: { show: true, style: 'dashed', size: 1, color: '#475569' },
      text: {
        show: true,
        color: '#ffffff',
        backgroundColor: '#1e293b',
        size: 11,
      },
    },
    vertical: {
      show: true,
      line: { show: true, style: 'dashed', size: 1, color: '#475569' },
      text: {
        show: true,
        color: '#ffffff',
        backgroundColor: '#1e293b',
        size: 11,
      },
    },
  },
  overlay: {
    line: { color: '#3b82f6', size: 1.5, style: 'solid' },
    point: {
      color: '#3b82f6',
      borderColor: '#ffffff',
      borderSize: 1,
      radius: 4,
      activeColor: '#f0b90b',
      activeBorderColor: '#ffffff',
      activeBorderSize: 1,
      activeRadius: 5,
    },
  },
};

export function ChartWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const unsubStreamRef = useRef<(() => void) | null>(null);
  const restoredSymbolRef = useRef<string | null>(null);
  const prevTriggerRef = useRef<{ symbol: string; timeframe: string } | null>(null);
  const lastBarTsRef = useRef<number>(0);

  // Atomic Zustand selectors (never subscribe to livePrice or watchlist here)
  const activeSymbol = useTerminalStore((s) => s.activeSymbol);
  const timeframe = useTerminalStore((s) => s.timeframe);
  const candleType = useTerminalStore((s) => s.candleType);
  const activeIndicators = useTerminalStore((s) => s.activeIndicators);
  const autoAnalysis = useTerminalStore((s) => s.autoAnalysis);
  const activeDrawingTool = useTerminalStore((s) => s.activeDrawingTool);
  const magnetMode = useTerminalStore((s) => s.magnetMode);
  const drawingsLocked = useTerminalStore((s) => s.drawingsLocked);
  const drawingsHidden = useTerminalStore((s) => s.drawingsHidden);
  const clearDrawingsSignal = useTerminalStore((s) => s.clearDrawingsSignal);
  const resetChartSignal = useTerminalStore((s) => s.resetChartSignal);
  const screenshotSignal = useTerminalStore((s) => s.screenshotSignal);
  const setWsStatus = useTerminalStore((s) => s.setWsStatus);
  const setActiveDrawingTool = useTerminalStore((s) => s.setActiveDrawingTool);
  const setAutoSummary = useTerminalStore((s) => s.setAutoSummary);
  const futuresRevision = useFuturesStore((s) => s.overlayRevision);

  const symbolRef = useRef(activeSymbol);
  const timeframeRef = useRef(timeframe);
  symbolRef.current = activeSymbol;
  timeframeRef.current = timeframe;

  const syncDrawingsToStorage = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const overlays = chart.getOverlays();
    const serialized: SavedOverlay[] = overlays
      .filter(
        (ov) =>
          ov.groupId !== 'auto_analysis' &&
          ov.groupId !== 'futures_lines' &&
          ov.points &&
          ov.points.length > 0
      )
      .map((ov) => ({
        id: ov.id,
        name: ov.name,
        points: ov.points.map((pt) => ({
          timestamp: pt.timestamp,
          value: pt.value,
          dataIndex: pt.dataIndex,
        })),
        extendData: ov.extendData,
        lock: ov.lock,
      }));
    saveDrawings(symbolRef.current, serialized);
  }, []);

  const restoreDrawingsFromStorage = useCallback(
    (symbol: string) => {
      const chart = chartRef.current;
      if (!chart) return;
      chart.removeOverlay({ groupId: 'manual_drawing' });
      const saved = loadDrawings(symbol);
      const hidden = useTerminalStore.getState().drawingsHidden;
      for (const item of saved) {
        chart.createOverlay({
          name: item.name,
          groupId: 'manual_drawing',
          points: item.points,
          extendData: item.extendData,
          lock: item.lock,
          visible: !hidden,
          onPressedMoveEnd: () => syncDrawingsToStorage(),
          onRemoved: () => syncDrawingsToStorage(),
        });
      }
    },
    [syncDrawingsToStorage]
  );

  const applyAutoAnalysis = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.removeOverlay({ groupId: 'auto_analysis' });

    const bars = chart.getDataList();
    const cfg = useTerminalStore.getState().autoAnalysis;

    if (
      bars.length < 25 ||
      (!cfg.autoSR && !cfg.autoTrendlines && !cfg.autoFib)
    ) {
      setAutoSummary(null);
      return;
    }

    const result = computeAutoAnalysis(bars, cfg);
    const lastBar = bars[bars.length - 1];
    const pricePrecision = getPricePrecision(lastBar.close);

    if (result.fib) {
      const earliestTs = Math.min(
        result.fib.swingHigh.timestamp,
        result.fib.swingLow.timestamp
      );
      const latestTs = Math.max(
        result.fib.swingHigh.timestamp,
        result.fib.swingLow.timestamp
      );
      chart.createOverlay({
        name: 'autoFibonacci',
        groupId: 'auto_analysis',
        paneId: 'candle_pane',
        lock: true,
        zLevel: -2,
        points: [
          { timestamp: earliestTs, value: result.fib.swingHigh.price },
          { timestamp: latestTs, value: result.fib.swingLow.price },
        ],
        extendData: { ...result.fib, pricePrecision },
      });
    }

    for (const zone of result.srZones) {
      chart.createOverlay({
        name: 'autoSrZone',
        groupId: 'auto_analysis',
        paneId: 'candle_pane',
        lock: true,
        zLevel: -1,
        points: [
          { timestamp: zone.startTimestamp, value: zone.zoneHigh },
          { timestamp: result.lastTimestamp, value: zone.zoneLow },
        ],
        extendData: { ...zone, pricePrecision },
      });
    }

    for (const tl of result.trendlines) {
      chart.createOverlay({
        name: 'autoTrendline',
        groupId: 'auto_analysis',
        paneId: 'candle_pane',
        lock: true,
        zLevel: -1,
        points: [
          { timestamp: tl.p1.timestamp, value: tl.p1.price },
          { timestamp: tl.p2.timestamp, value: tl.p2.price },
          { timestamp: tl.projectedEnd.timestamp, value: tl.projectedEnd.price },
        ],
        extendData: { kind: tl.kind, touches: tl.touches },
      });
    }

    setAutoSummary(result.summary);
  }, [setAutoSummary]);

  const applyFuturesOverlays = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.removeOverlay({ groupId: 'futures_lines' });

    const bars = chart.getDataList();
    if (bars.length === 0) return;
    const lastBar = bars[bars.length - 1];
    const prec = getPricePrecision(lastBar.close);

    const { positions, pendingOrders } = useFuturesStore.getState();
    const sym = symbolRef.current;

    const addLine = (
      price: number,
      label: string,
      color: string,
      dashed: boolean
    ) => {
      chart.createOverlay({
        name: 'futuresLevelLine',
        groupId: 'futures_lines',
        paneId: 'candle_pane',
        lock: true,
        zLevel: 1,
        points: [{ timestamp: lastBar.timestamp, value: price }],
        extendData: {
          label,
          priceText: formatPrice(price, prec),
          color,
          dashed,
        },
      });
    };

    for (const pos of positions) {
      if (pos.symbol !== sym) continue;
      addLine(
        pos.entryPrice,
        `${pos.side.toUpperCase()} ${pos.leverage}x`,
        pos.side === 'long' ? '#0ecb81' : '#f6465d',
        false
      );
      if (pos.tpPrice !== null) {
        addLine(pos.tpPrice, 'TP', '#10b981', true);
      }
      if (pos.slPrice !== null) {
        addLine(pos.slPrice, 'SL', '#f6465d', true);
      }
      if (pos.liquidationPrice > 0) {
        addLine(pos.liquidationPrice, 'LIQ', '#d97706', true);
      }
    }

    for (const ord of pendingOrders) {
      if (ord.symbol !== sym) continue;
      addLine(
        ord.limitPrice,
        `LIMIT ${ord.side.toUpperCase()} ${ord.leverage}x`,
        '#3b82f6',
        true
      );
    }
  }, []);

  // 1. Initialize KlineCharts v10 once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    registerAutoOverlays();

    const chart = init(el, {
      styles: CHART_STYLES,
    });
    if (!chart) return;
    chartRef.current = chart;

    chart.setDataLoader({
      getBars: async ({ type, timestamp, symbol, period, callback }) => {
        try {
          const tfMeta = TIMEFRAMES.find(
            (t) => t.span === period.span && t.type === period.type
          );
          const interval = tfMeta?.value ?? timeframeRef.current;
          const qs = new URLSearchParams({
            symbol: symbol.ticker,
            interval,
            limit: '500',
          });
          if (type === 'forward' && timestamp != null) {
            qs.set('endTime', String(timestamp - 1));
          }

          const res = await fetch(`/api/klines?${qs.toString()}`, {
            cache: 'no-store',
          });
          if (!res.ok) {
            callback([]);
            return;
          }
          const json = (await res.json()) as { bars?: KLineData[] };
          const bars = json.bars ?? [];

          if (type === 'init' && bars.length > 0) {
            const lastBar = bars[bars.length - 1];
            lastBarTsRef.current = lastBar.timestamp;
            useTerminalStore.getState().updateLivePrice(lastBar.close);
            useFuturesStore.getState().updateMarkPrice(symbol.ticker, lastBar.close);

            if (restoredSymbolRef.current !== symbol.ticker) {
              restoredSymbolRef.current = symbol.ticker;
              setTimeout(() => restoreDrawingsFromStorage(symbol.ticker), 0);
            }
          }

          callback(bars, { forward: bars.length >= 100, backward: false });
          if (bars.length > 0) {
            setTimeout(() => {
              applyAutoAnalysis();
              if (type === 'init') applyFuturesOverlays();
            }, 0);
          }
        } catch {
          callback([]);
        }
      },

      subscribeBar: ({ symbol, period, callback }) => {
        if (unsubStreamRef.current) {
          unsubStreamRef.current();
          unsubStreamRef.current = null;
        }
        const tfMeta = TIMEFRAMES.find(
          (t) => t.span === period.span && t.type === period.type
        );
        const tf = tfMeta?.value ?? timeframeRef.current;

        unsubStreamRef.current = subscribeChartStream({
          symbol: symbol.ticker,
          timeframe: tf,
          onStatus: (status) => setWsStatus(status),
          onBar: (bar) => {
            callback(bar);
            useFuturesStore.getState().checkTriggersOnTick(symbol.ticker, bar.close);
            if (bar.timestamp > lastBarTsRef.current) {
              lastBarTsRef.current = bar.timestamp;
              applyAutoAnalysis();
            }
          },
          onTickerStats: (stats) => {
            useTerminalStore.getState().updateActiveTickerStats(stats);
            useFuturesStore.getState().updateMarkPrice(symbol.ticker, stats.lastPrice);
          },
        });
      },

      unsubscribeBar: () => {
        if (unsubStreamRef.current) {
          unsubStreamRef.current();
          unsubStreamRef.current = null;
        }
      },
    });

    const observer = new ResizeObserver(() => {
      chart.resize();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (unsubStreamRef.current) {
        unsubStreamRef.current();
        unsubStreamRef.current = null;
      }
      dispose(el);
      chartRef.current = null;
      restoredSymbolRef.current = null;
      prevTriggerRef.current = null;
    };
  }, [applyAutoAnalysis, applyFuturesOverlays, restoreDrawingsFromStorage, setWsStatus]);

  // 2. React to Symbol / Timeframe changes (at most one resetData per change)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const tfMeta = TIMEFRAMES.find((t) => t.value === timeframe) ?? TIMEFRAMES[2];
    const state = useTerminalStore.getState();
    const item = state.watchlist.find((w) => w.symbol === activeSymbol);
    const { pricePrecision, volumePrecision } = getSymbolPrecisions(
      activeSymbol,
      state.livePrice || item?.lastPrice
    );

    const prev = prevTriggerRef.current;
    if (prev === null) {
      chart.setPeriod({ span: tfMeta.span, type: tfMeta.type });
      chart.setSymbol({
        ticker: activeSymbol,
        pricePrecision,
        volumePrecision,
      });
    } else if (prev.symbol !== activeSymbol && prev.timeframe !== timeframe) {
      restoredSymbolRef.current = null;
      chart.setPeriod({ span: tfMeta.span, type: tfMeta.type });
      chart.setSymbol({
        ticker: activeSymbol,
        pricePrecision,
        volumePrecision,
      });
    } else if (prev.symbol !== activeSymbol) {
      restoredSymbolRef.current = null;
      chart.setSymbol({
        ticker: activeSymbol,
        pricePrecision,
        volumePrecision,
      });
    } else if (prev.timeframe !== timeframe) {
      chart.setPeriod({ span: tfMeta.span, type: tfMeta.type });
    }

    prevTriggerRef.current = {
      symbol: activeSymbol,
      timeframe,
    };
  }, [activeSymbol, timeframe]);

  // 3. React to Candle Type changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setStyles({
      candle: {
        type: candleType,
      },
    });
  }, [candleType]);

  // 4. Sync Active Indicators with KlineCharts v10
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const existing = chart.getIndicators();
    const desiredIds = new Set(activeIndicators.map((i) => i.id));

    for (const ex of existing) {
      if (!desiredIds.has(ex.id)) {
        chart.removeIndicator({ id: ex.id });
      }
    }

    const existingMap = new Map(chart.getIndicators().map((i) => [i.id, i]));
    for (const ind of activeIndicators) {
      const found = existingMap.get(ind.id);
      if (!found) {
        chart.createIndicator(
          {
            id: ind.id,
            name: ind.name,
            paneId: ind.paneId,
            calcParams: ind.calcParams,
          },
          ind.isStack
        );
      } else if (
        JSON.stringify(found.calcParams) !== JSON.stringify(ind.calcParams)
      ) {
        chart.overrideIndicator({
          id: ind.id,
          name: ind.name,
          paneId: ind.paneId,
          calcParams: ind.calcParams,
        });
      }
    }
  }, [activeIndicators]);

  // 5. Handle Drawing Tool selection
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !activeDrawingTool) return;

    let extendData: unknown = undefined;
    if (activeDrawingTool === 'simpleAnnotation') {
      extendData = 'Note';
    }

    chart.createOverlay({
      name: activeDrawingTool,
      groupId: 'manual_drawing',
      mode: magnetMode,
      lock: drawingsLocked,
      visible: !drawingsHidden,
      ...(extendData ? { extendData } : {}),
      onDrawEnd: () => {
        setActiveDrawingTool(null);
        syncDrawingsToStorage();
      },
      onPressedMoveEnd: () => {
        syncDrawingsToStorage();
      },
      onRemoved: () => {
        syncDrawingsToStorage();
      },
    });
  }, [
    activeDrawingTool,
    magnetMode,
    drawingsLocked,
    drawingsHidden,
    setActiveDrawingTool,
    syncDrawingsToStorage,
  ]);

  // 6. Lock / Hide / Magnet updates on existing manual overlays
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.overrideOverlay({
      groupId: 'manual_drawing',
      lock: drawingsLocked,
      visible: !drawingsHidden,
      mode: magnetMode,
    });
  }, [drawingsLocked, drawingsHidden, magnetMode]);

  // 7. Clear all manual drawings signal
  useEffect(() => {
    if (clearDrawingsSignal === 0) return;
    const chart = chartRef.current;
    if (!chart) return;
    chart.removeOverlay({ groupId: 'manual_drawing' });
    saveDrawings(symbolRef.current, []);
  }, [clearDrawingsSignal]);

  // 7b. Re-apply Auto Technical Analysis whenever user toggles settings
  useEffect(() => {
    applyAutoAnalysis();
  }, [autoAnalysis, applyAutoAnalysis]);

  // 7c. Re-apply Futures position/limit lines when positions/orders change
  useEffect(() => {
    applyFuturesOverlays();
  }, [futuresRevision, activeSymbol, applyFuturesOverlays]);

  // 8. Reset chart view signal
  useEffect(() => {
    if (resetChartSignal === 0) return;
    chartRef.current?.scrollToRealTime(200);
  }, [resetChartSignal]);

  // 9. Screenshot export signal
  useEffect(() => {
    if (screenshotSignal === 0) return;
    const chart = chartRef.current;
    if (!chart) return;
    const dataUrl = chart.getConvertPictureUrl(true, 'png', '#0b0e14');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `DeltaDesk-${symbolRef.current}-${timeframeRef.current}.png`;
    a.click();
  }, [screenshotSignal]);

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-terminal-bg overflow-hidden">
      <TopChartToolbar />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <DrawingToolbar />
        <div className="flex-1 relative min-w-0 min-h-0">
          <div ref={containerRef} className="w-full h-full" />
        </div>
      </div>
      <IndicatorsModal />
    </div>
  );
}
