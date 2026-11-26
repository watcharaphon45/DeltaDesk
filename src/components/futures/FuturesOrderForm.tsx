'use client';

import React, { useState } from 'react';
import { PlusCircle, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';
import { useTerminalStore } from '@/store/useTerminalStore';
import { useFuturesStore } from '@/store/useFuturesStore';
import {
  TAKER_FEE_RATE,
  calcLiquidationPrice,
  calcUnrealizedPnl,
} from '@/lib/futures/math';
import { formatPrice, getPricePrecision } from '@/lib/format';
import type { FuturesOrderType, MarginMode, PositionSide } from '@/types/futures';

const QUICK_LEVERAGES = [5, 10, 20, 50, 100];
const QUICK_PCTS = [10, 25, 50, 75, 100];

export function FuturesOrderForm() {
  const activeSymbol = useTerminalStore((s) => s.activeSymbol);
  const livePrice = useTerminalStore((s) => s.livePrice);

  const walletBalance = useFuturesStore((s) => s.walletBalance);
  const positions = useFuturesStore((s) => s.positions);
  const pendingOrders = useFuturesStore((s) => s.pendingOrders);
  const markPrices = useFuturesStore((s) => s.markPrices);
  const placeOrder = useFuturesStore((s) => s.placeOrder);
  const topUpDemoFunds = useFuturesStore((s) => s.topUpDemoFunds);
  const resetAccount = useFuturesStore((s) => s.resetAccount);

  const [marginMode, setMarginMode] = useState<MarginMode>('isolated');
  const [leverage, setLeverage] = useState<number>(10);
  const [orderType, setOrderType] = useState<FuturesOrderType>('market');
  const [limitPriceInput, setLimitPriceInput] = useState<string>('');
  const [marginInput, setMarginInput] = useState<string>('100');
  const [tpInput, setTpInput] = useState<string>('');
  const [slInput, setSlInput] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  const base = activeSymbol.replace('USDT', '');
  const currentPrice = markPrices[activeSymbol] || livePrice || 0;
  const precision = getPricePrecision(currentPrice);

  // Total Equity = walletBalance + locked pending margin + sum(pos.margin + uPnL)
  const pendingLocked = pendingOrders.reduce((s, o) => s + o.margin, 0);
  const positionsEquity = positions.reduce((s, p) => {
    const mp = markPrices[p.symbol] || p.entryPrice;
    return s + p.margin + calcUnrealizedPnl(p.side, p.entryPrice, mp, p.quantity);
  }, 0);
  const totalEquity = walletBalance + pendingLocked + positionsEquity;

  const parsedMargin = Number(marginInput) || 0;
  const refPrice =
    orderType === 'market' ? currentPrice : Number(limitPriceInput) || currentPrice;
  const notionalSize = parsedMargin * leverage;
  const estQty = refPrice > 0 ? notionalSize / refPrice : 0;
  const estFee = notionalSize * TAKER_FEE_RATE;

  const estLiqLong =
    refPrice > 0 && estQty > 0
      ? calcLiquidationPrice({
          side: 'long',
          marginMode,
          entryPrice: refPrice,
          leverage,
          margin: parsedMargin,
          quantity: estQty,
          extraCrossBuffer: marginMode === 'cross' ? Math.max(0, walletBalance - parsedMargin) : 0,
        })
      : 0;

  const estLiqShort =
    refPrice > 0 && estQty > 0
      ? calcLiquidationPrice({
          side: 'short',
          marginMode,
          entryPrice: refPrice,
          leverage,
          margin: parsedMargin,
          quantity: estQty,
          extraCrossBuffer: marginMode === 'cross' ? Math.max(0, walletBalance - parsedMargin) : 0,
        })
      : 0;

  const showToast = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((cur) => (cur?.text === text ? null : cur));
    }, 3200);
  };

  const handlePercentClick = (pct: number) => {
    // Leave tiny buffer for open fee when clicking 100%
    const feeFactor = 1 + leverage * TAKER_FEE_RATE;
    const maxUsable = Math.max(0, (walletBalance * 0.999) / feeFactor);
    const val = pct === 100 ? maxUsable : (walletBalance * pct) / 100;
    setMarginInput(val.toFixed(2));
  };

  const handleSubmit = (side: PositionSide) => {
    const tp = tpInput.trim() ? Number(tpInput) : null;
    const sl = slInput.trim() ? Number(slInput) : null;
    if (tp !== null && (!Number.isFinite(tp) || tp <= 0)) {
      showToast('err', 'ราคา Take Profit ไม่ถูกต้อง');
      return;
    }
    if (sl !== null && (!Number.isFinite(sl) || sl <= 0)) {
      showToast('err', 'ราคา Stop Loss ไม่ถูกต้อง');
      return;
    }

    const res = placeOrder({
      symbol: activeSymbol,
      side,
      orderType,
      marginMode,
      leverage,
      margin: parsedMargin,
      currentPrice,
      limitPrice: orderType === 'limit' ? Number(limitPriceInput) : undefined,
      tpPrice: tp,
      slPrice: sl,
    });

    if (!res.ok) {
      showToast('err', res.error ?? 'ส่งคำสั่งไม่สำเร็จ');
      return;
    }

    showToast(
      'ok',
      `${orderType === 'market' ? 'เปิดสถานะ' : 'ตั้งรอ'} ${side.toUpperCase()} ${base} ${leverage}x สำเร็จ`
    );
  };

  return (
    <aside className="w-full lg:w-72 bg-terminal-surface border-t lg:border-t-0 lg:border-l border-terminal-border flex flex-col shrink-0 select-none overflow-y-auto">
      {/* Demo Wallet Header */}
      <div className="p-3 border-b border-terminal-border bg-terminal-bg/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-terminal-text">
            Futures Paper Wallet
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => topUpDemoFunds(10000)}
              title="เติมเงินจำลองเพิ่ม +10,000 USDT"
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-terminal-elevated hover:bg-terminal-border text-[10px] text-terminal-bull"
            >
              <PlusCircle className="w-3 h-3" />
              <span>+10K</span>
            </button>
            <button
              type="button"
              onClick={resetAccount}
              title="รีเซ็ตพอร์ตกลับเป็น 10,000 USDT"
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-terminal-elevated hover:bg-terminal-border text-[10px] text-terminal-muted hover:text-terminal-text"
            >
              <RotateCcw className="w-3 h-3" />
              <span>รีเซ็ต</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
          <div className="bg-terminal-bg border border-terminal-border rounded p-1.5">
            <div className="text-[9px] text-terminal-muted font-sans">เงินว่าง (Avail)</div>
            <div className="text-terminal-text font-semibold">
              {walletBalance.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              <span className="text-[9px] text-terminal-muted">USDT</span>
            </div>
          </div>
          <div className="bg-terminal-bg border border-terminal-border rounded p-1.5">
            <div className="text-[9px] text-terminal-muted font-sans">พอร์ตรวม (Equity)</div>
            <div className="text-terminal-gold font-semibold">
              {totalEquity.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              <span className="text-[9px] text-terminal-muted">USDT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Form Body */}
      <div className="p-3 space-y-3 flex-1">
        {/* Margin Mode */}
        <div className="grid grid-cols-2 gap-1 bg-terminal-bg p-0.5 rounded border border-terminal-border text-[11px]">
          {(['isolated', 'cross'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMarginMode(mode)}
              className={`py-1 rounded font-medium capitalize transition-colors ${
                marginMode === mode
                  ? 'bg-terminal-elevated text-terminal-text'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Leverage Control */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-terminal-muted">ตัวคูณ (Leverage)</span>
            <span className="font-mono font-semibold text-terminal-gold">
              {leverage}x
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={125}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full accent-terminal-blue cursor-pointer h-1.5 bg-terminal-bg rounded-lg"
          />
          <div className="grid grid-cols-5 gap-1 mt-1.5">
            {QUICK_LEVERAGES.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setLeverage(lv)}
                className={`py-0.5 rounded text-[10px] font-mono border ${
                  leverage === lv
                    ? 'bg-terminal-blue/20 border-terminal-blue/60 text-terminal-blue'
                    : 'bg-terminal-bg border-terminal-border text-terminal-muted hover:text-terminal-text'
                }`}
              >
                {lv}x
              </button>
            ))}
          </div>
        </div>

        {/* Order Type Tabs */}
        <div className="flex border-b border-terminal-border text-xs">
          {(['market', 'limit'] as const).map((ot) => (
            <button
              key={ot}
              type="button"
              onClick={() => {
                setOrderType(ot);
                if (ot === 'limit' && !limitPriceInput && currentPrice > 0) {
                  setLimitPriceInput(currentPrice.toFixed(precision));
                }
              }}
              className={`flex-1 py-1.5 font-medium border-b-2 transition-colors capitalize ${
                orderType === ot
                  ? 'border-terminal-blue text-terminal-text'
                  : 'border-transparent text-terminal-muted hover:text-terminal-text'
              }`}
            >
              {ot === 'market' ? 'Market (ทันที)' : 'Limit (ตั้งรอ)'}
            </button>
          ))}
        </div>

        {/* Limit Price */}
        {orderType === 'limit' && (
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-terminal-muted">ราคาตั้งรับ (USDT)</span>
              <button
                type="button"
                onClick={() => {
                  if (currentPrice > 0) {
                    setLimitPriceInput(currentPrice.toFixed(precision));
                  }
                }}
                className="text-[10px] text-terminal-blue hover:underline"
              >
                ราคาล่าสุด
              </button>
            </div>
            <input
              type="number"
              step="any"
              value={limitPriceInput}
              onChange={(e) => setLimitPriceInput(e.target.value)}
              placeholder={currentPrice > 0 ? currentPrice.toFixed(precision) : '0.00'}
              className="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-1.5 text-xs font-mono tabular-nums text-terminal-text focus:outline-none focus:border-terminal-blue"
            />
          </div>
        )}

        {/* Margin Input */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-terminal-muted">เงินต้น Margin (USDT)</span>
            <span className="text-[10px] font-mono text-terminal-muted">
              Max: {walletBalance.toFixed(2)}
            </span>
          </div>
          <input
            type="number"
            min="0"
            step="any"
            value={marginInput}
            onChange={(e) => setMarginInput(e.target.value)}
            className="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-1.5 text-xs font-mono tabular-nums text-terminal-text focus:outline-none focus:border-terminal-blue"
          />
          <div className="grid grid-cols-5 gap-1 mt-1.5">
            {QUICK_PCTS.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentClick(pct)}
                className="py-0.5 rounded text-[10px] font-mono bg-terminal-bg hover:bg-terminal-elevated border border-terminal-border text-terminal-muted hover:text-terminal-text"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* TP / SL Inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-terminal-bull mb-1">
              Take Profit (TP)
            </label>
            <input
              type="number"
              step="any"
              value={tpInput}
              onChange={(e) => setTpInput(e.target.value)}
              placeholder="ไม่บังคับ"
              className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-[11px] font-mono tabular-nums text-terminal-text placeholder:text-terminal-muted/60 focus:outline-none focus:border-terminal-bull"
            />
          </div>
          <div>
            <label className="block text-[10px] text-terminal-bear mb-1">
              Stop Loss (SL)
            </label>
            <input
              type="number"
              step="any"
              value={slInput}
              onChange={(e) => setSlInput(e.target.value)}
              placeholder="ไม่บังคับ"
              className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-[11px] font-mono tabular-nums text-terminal-text placeholder:text-terminal-muted/60 focus:outline-none focus:border-terminal-bear"
            />
          </div>
        </div>

        {/* Order Preview */}
        <div className="bg-terminal-bg/80 border border-terminal-border rounded p-2 space-y-1 text-[10px] font-mono tabular-nums">
          <div className="flex justify-between">
            <span className="text-terminal-muted font-sans">ขนาดสถานะรวม:</span>
            <span className="text-terminal-text">
              {notionalSize.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-muted font-sans">จำนวนเหรียญ ({base}):</span>
            <span className="text-terminal-text">{estQty.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-muted font-sans">ค่าธรรมเนียม (Est.):</span>
            <span className="text-terminal-muted">{estFee.toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-terminal-border/60">
            <span className="text-terminal-muted font-sans">Liq. ประมาณการ:</span>
            <span>
              <span className="text-terminal-bull">
                {estLiqLong > 0 ? formatPrice(estLiqLong, precision) : '—'}
              </span>
              <span className="text-terminal-muted"> / </span>
              <span className="text-terminal-bear">
                {estLiqShort > 0 ? formatPrice(estLiqShort, precision) : '—'}
              </span>
            </span>
          </div>
        </div>

        {/* Feedback Toast */}
        {feedback && (
          <div
            className={`px-2.5 py-1.5 rounded text-[11px] border ${
              feedback.type === 'ok'
                ? 'bg-terminal-bull/15 border-terminal-bull/40 text-terminal-bull'
                : 'bg-terminal-bear/15 border-terminal-bear/40 text-terminal-bear'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Long / Short Submit Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleSubmit('long')}
            className="py-2 rounded-lg bg-terminal-bull hover:bg-terminal-bull/90 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Long / ขึ้น</span>
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('short')}
            className="py-2 rounded-lg bg-terminal-bear hover:bg-terminal-bear/90 text-white font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Short / ลง</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
