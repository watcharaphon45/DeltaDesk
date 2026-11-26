'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { useTerminalStore } from '@/store/useTerminalStore';
import { formatPrice, getPricePrecision } from '@/lib/format';
import type { AutoSensitivity } from '@/types/market';

const SENSITIVITY_OPTIONS: Array<{ value: AutoSensitivity; label: string }> = [
  { value: 'short', label: 'สั้น (Scalp)' },
  { value: 'medium', label: 'กลาง (Swing)' },
  { value: 'long', label: 'ยาว (Major)' },
];

const FEATURE_ITEMS = [
  {
    key: 'autoSR' as const,
    label: 'Auto Support & Resistance',
    desc: 'แนวรับ–แนวต้านอัตโนมัติ + โซน Supply/Demand',
    dotColor: 'bg-terminal-bull',
  },
  {
    key: 'autoTrendlines' as const,
    label: 'Auto Trendlines',
    desc: 'เส้นแนวโน้มขาขึ้น / ขาลง พร้อมฉายเส้นล่วงหน้า',
    dotColor: 'bg-emerald-400',
  },
  {
    key: 'autoFib' as const,
    label: 'Auto Fibonacci',
    desc: 'กางสัดส่วน Fibo อัตโนมัติ + โซน Golden Pocket',
    dotColor: 'bg-terminal-gold',
  },
];

function AutoSummaryReadout() {
  const autoSummary = useTerminalStore((s) => s.autoSummary);
  const livePrice = useTerminalStore((s) => s.livePrice);
  const precision = getPricePrecision(livePrice || autoSummary?.nearestResistance?.centerPrice || 0);

  return (
    <div className="px-3.5 py-2.5 bg-terminal-bg/80 border-t border-terminal-border">
      <div className="text-[10px] text-terminal-muted mb-1.5">
        ค่าสำคัญที่คำนวณได้ตอนนี้
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono tabular-nums">
        <div className="flex justify-between">
          <span className="text-terminal-bear">แนวต้าน R1:</span>
          <span className="text-terminal-text">
            {autoSummary?.nearestResistance
              ? formatPrice(autoSummary.nearestResistance.centerPrice, precision)
              : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-terminal-bull">แนวรับ S1:</span>
          <span className="text-terminal-text">
            {autoSummary?.nearestSupport
              ? formatPrice(autoSummary.nearestSupport.centerPrice, precision)
              : '—'}
          </span>
        </div>
        <div className="flex justify-between col-span-2">
          <span className="text-terminal-gold">Fibo 61.8%:</span>
          <span className="text-terminal-text">
            {autoSummary?.fib618
              ? formatPrice(autoSummary.fib618, precision)
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AutoAnalysisPopover() {
  const autoAnalysis = useTerminalStore((s) => s.autoAnalysis);
  const toggleAutoFeature = useTerminalStore((s) => s.toggleAutoFeature);
  const setAllAutoFeatures = useTerminalStore((s) => s.setAllAutoFeatures);
  const setAutoSensitivity = useTerminalStore((s) => s.setAutoSensitivity);

  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const activeCount = [
    autoAnalysis.autoSR,
    autoAnalysis.autoTrendlines,
    autoAnalysis.autoFib,
  ].filter(Boolean).length;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="เปิด/ปิดระบบวิเคราะห์และตีเส้นกราฟอัตโนมัติ (ฟรี 100%)"
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
          activeCount > 0
            ? 'bg-terminal-gold/15 border-terminal-gold/40 text-terminal-gold hover:bg-terminal-gold/20'
            : 'border-transparent text-terminal-text hover:bg-terminal-elevated hover:border-terminal-border'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Auto ตีเส้น</span>
        <span className="px-1 rounded bg-terminal-bg/80 text-[10px] font-mono">
          {activeCount}/3
        </span>
      </button>

      {open && (
        <div className="fixed sm:absolute left-2 sm:left-0 top-24 sm:top-full mt-1.5 w-[calc(100vw-1rem)] sm:w-80 bg-terminal-surface border border-terminal-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-terminal-border flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-terminal-text flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-terminal-gold" />
                <span>Auto Technical Suite</span>
              </div>
              <div className="text-[10px] text-terminal-muted">
                คำนวณเชิงปริมาณจากแท่งเทียนจริง (ฟรี 100%)
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAllAutoFeatures(true)}
                className="px-1.5 py-0.5 rounded bg-terminal-elevated hover:bg-terminal-border text-[10px] text-terminal-text"
              >
                เปิดครบ
              </button>
              <button
                type="button"
                onClick={() => setAllAutoFeatures(false)}
                className="px-1.5 py-0.5 rounded bg-terminal-bg hover:bg-terminal-border text-[10px] text-terminal-muted"
              >
                ปิดหมด
              </button>
            </div>
          </div>

          <div className="px-3.5 py-2.5 border-b border-terminal-border/60">
            <div className="text-[10px] text-terminal-muted mb-1.5">
              ความไวของการหาจุดกลับตัว (Sensitivity)
            </div>
            <div className="grid grid-cols-3 gap-1 bg-terminal-bg p-0.5 rounded border border-terminal-border">
              {SENSITIVITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAutoSensitivity(opt.value)}
                  className={`py-1 rounded text-[10px] font-medium transition-colors ${
                    autoAnalysis.sensitivity === opt.value
                      ? 'bg-terminal-blue text-white'
                      : 'text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2 space-y-1">
            {FEATURE_ITEMS.map((item) => {
              const enabled = autoAnalysis[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleAutoFeature(item.key)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors flex items-start justify-between gap-2 ${
                    enabled
                      ? 'bg-terminal-elevated/80 border-terminal-border'
                      : 'bg-transparent border-transparent hover:bg-terminal-bg/60'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${item.dotColor}`}
                    />
                    <div>
                      <div className="text-xs font-medium text-terminal-text">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-terminal-muted">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                      enabled
                        ? 'bg-terminal-blue border-terminal-blue text-white'
                        : 'border-terminal-border bg-terminal-bg'
                    }`}
                  >
                    {enabled && <Check className="w-3 h-3" />}
                  </div>
                </button>
              );
            })}
          </div>

          <AutoSummaryReadout />
        </div>
      )}
    </div>
  );
}
