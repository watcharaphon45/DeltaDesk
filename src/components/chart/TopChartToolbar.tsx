'use client';

import React from 'react';
import {
  Camera,
  CandlestickChart,
  LineChart,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { useTerminalStore } from '@/store/useTerminalStore';
import { TIMEFRAMES } from '@/constants/markets';
import { AutoAnalysisPopover } from './AutoAnalysisPopover';
import type { CandleStyleType } from '@/types/market';

const CANDLE_TYPES: Array<{ value: CandleStyleType; label: string }> = [
  { value: 'candle_solid', label: 'แท่งเทียนทึบ' },
  { value: 'candle_stroke', label: 'แท่งเทียนโปร่ง' },
  { value: 'ohlc', label: 'OHLC Bars' },
  { value: 'area', label: 'Area' },
];

export function TopChartToolbar() {
  const timeframe = useTerminalStore((s) => s.timeframe);
  const candleType = useTerminalStore((s) => s.candleType);
  const indicatorCount = useTerminalStore((s) => s.activeIndicators.length);
  const setTimeframe = useTerminalStore((s) => s.setTimeframe);
  const setCandleType = useTerminalStore((s) => s.setCandleType);
  const setIndicatorsModalOpen = useTerminalStore((s) => s.setIndicatorsModalOpen);
  const triggerResetChart = useTerminalStore((s) => s.triggerResetChart);
  const triggerScreenshot = useTerminalStore((s) => s.triggerScreenshot);

  return (
    <div className="h-9 bg-terminal-surface border-b border-terminal-border px-2.5 flex items-center justify-between gap-2 shrink-0 select-none overflow-x-auto">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => setTimeframe(tf.value)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                timeframe === tf.value
                  ? 'bg-terminal-blue/20 text-terminal-blue'
                  : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-elevated'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-terminal-border" />

        <div className="flex items-center gap-1">
          {candleType === 'area' ? (
            <LineChart className="w-3.5 h-3.5 text-terminal-muted" />
          ) : (
            <CandlestickChart className="w-3.5 h-3.5 text-terminal-muted" />
          )}
          <select
            value={candleType}
            onChange={(e) => setCandleType(e.target.value as CandleStyleType)}
            className="bg-transparent text-[11px] text-terminal-text focus:outline-none cursor-pointer"
          >
            {CANDLE_TYPES.map((ct) => (
              <option
                key={ct.value}
                value={ct.value}
                className="bg-terminal-surface text-terminal-text"
              >
                {ct.label}
              </option>
            ))}
          </select>
        </div>

        <div className="h-4 w-px bg-terminal-border" />

        <button
          type="button"
          onClick={() => setIndicatorsModalOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium text-terminal-text hover:bg-terminal-elevated border border-transparent hover:border-terminal-border transition-colors"
        >
          <Sliders className="w-3.5 h-3.5 text-terminal-blue" />
          <span>Indicators</span>
          <span className="px-1 rounded bg-terminal-elevated text-[10px] text-terminal-muted font-mono">
            {indicatorCount}
          </span>
        </button>

        <div className="h-4 w-px bg-terminal-border" />

        <AutoAnalysisPopover />
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={triggerResetChart}
          title="รีเซ็ตมุมมองกราฟกลับไปแท่งล่าสุด"
          className="p-1.5 rounded text-terminal-muted hover:text-terminal-text hover:bg-terminal-elevated transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={triggerScreenshot}
          title="บันทึกรูปภาพกราฟ (PNG)"
          className="p-1.5 rounded text-terminal-muted hover:text-terminal-text hover:bg-terminal-elevated transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
