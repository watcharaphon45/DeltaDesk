'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit3, Trash2, X } from 'lucide-react';
import { useTerminalStore } from '@/store/useTerminalStore';
import { useFuturesStore } from '@/store/useFuturesStore';
import { calcRoePercent, calcUnrealizedPnl } from '@/lib/futures/math';
import { formatPrice, formatTimeShort, getPricePrecision } from '@/lib/format';
import type { CloseReason } from '@/types/futures';

const REASON_LABEL: Record<CloseReason, { text: string; cls: string }> = {
  manual: { text: 'ปิดมือ', cls: 'text-terminal-muted bg-terminal-bg' },
  tp: { text: 'ชน TP', cls: 'text-terminal-bull bg-terminal-bull/15' },
  sl: { text: 'ชน SL', cls: 'text-terminal-bear bg-terminal-bear/15' },
  liquidated: { text: 'พอร์ตแตก', cls: 'text-terminal-gold bg-terminal-gold/15' },
};

export function FuturesBottomPanel() {
  const setActiveSymbol = useTerminalStore((s) => s.setActiveSymbol);

  const positions = useFuturesStore((s) => s.positions);
  const pendingOrders = useFuturesStore((s) => s.pendingOrders);
  const tradeHistory = useFuturesStore((s) => s.tradeHistory);
  const markPrices = useFuturesStore((s) => s.markPrices);
  const showBottomBar = useFuturesStore((s) => s.showBottomBar);
  const toggleBottomBar = useFuturesStore((s) => s.toggleBottomBar);
  const closePosition = useFuturesStore((s) => s.closePosition);
  const updatePositionTpSl = useFuturesStore((s) => s.updatePositionTpSl);
  const cancelPendingOrder = useFuturesStore((s) => s.cancelPendingOrder);
  const cancelAllPendingOrders = useFuturesStore((s) => s.cancelAllPendingOrders);
  const clearHistory = useFuturesStore((s) => s.clearHistory);

  const [tab, setTab] = useState<'positions' | 'orders' | 'history'>('positions');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tpDraft, setTpDraft] = useState('');
  const [slDraft, setSlDraft] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const totalRealized = tradeHistory.reduce((s, t) => s + t.realizedPnl, 0);
  const winCount = tradeHistory.filter((t) => t.realizedPnl > 0).length;
  const winRate =
    tradeHistory.length > 0 ? (winCount / tradeHistory.length) * 100 : 0;

  const startEditTpSl = (id: string, tp: number | null, sl: number | null) => {
    setEditingId(id);
    setTpDraft(tp !== null ? String(tp) : '');
    setSlDraft(sl !== null ? String(sl) : '');
    setEditError(null);
  };

  const saveEditTpSl = (id: string) => {
    const tp = tpDraft.trim() ? Number(tpDraft) : null;
    const sl = slDraft.trim() ? Number(slDraft) : null;
    const res = updatePositionTpSl(id, tp, sl);
    if (!res.ok) {
      setEditError(res.error ?? 'ค่า TP/SL ไม่ถูกต้อง');
      return;
    }
    setEditingId(null);
    setEditError(null);
  };

  return (
    <section
      className={`bg-terminal-surface border-t border-terminal-border flex flex-col shrink-0 select-none transition-all ${
        showBottomBar ? 'h-52' : 'h-8'
      }`}
    >
      {/* Header Tabs */}
      <div className="h-8 px-3 border-b border-terminal-border flex items-center justify-between gap-2 shrink-0 bg-terminal-bg/60">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setTab('positions');
              if (!showBottomBar) toggleBottomBar();
            }}
            className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap ${
              tab === 'positions'
                ? 'bg-terminal-elevated text-terminal-text'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            สถานะเปิดอยู่ ({positions.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('orders');
              if (!showBottomBar) toggleBottomBar();
            }}
            className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap ${
              tab === 'orders'
                ? 'bg-terminal-elevated text-terminal-text'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            คำสั่งรอ ({pendingOrders.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('history');
              if (!showBottomBar) toggleBottomBar();
            }}
            className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap ${
              tab === 'history'
                ? 'bg-terminal-elevated text-terminal-text'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            ประวัติเทรด ({tradeHistory.length})
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono tabular-nums">
          <span className="hidden sm:inline text-terminal-muted">
            Win Rate:{' '}
            <span className="text-terminal-text">{winRate.toFixed(1)}%</span>
          </span>
          <span className="hidden md:inline text-terminal-muted">
            กำไรสะสม:{' '}
            <span
              className={
                totalRealized >= 0 ? 'text-terminal-bull' : 'text-terminal-bear'
              }
            >
              {totalRealized >= 0 ? '+' : ''}
              {totalRealized.toFixed(2)} USDT
            </span>
          </span>
          <button
            type="button"
            onClick={toggleBottomBar}
            title={showBottomBar ? 'พับแถบด้านล่าง' : 'ขยายแถบด้านล่าง'}
            className="p-1 rounded text-terminal-muted hover:text-terminal-text hover:bg-terminal-elevated"
          >
            {showBottomBar ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      {showBottomBar && (
        <div className="flex-1 overflow-auto">
          {editError && (
            <div className="px-3 py-1 bg-terminal-bear/15 text-terminal-bear text-[11px] border-b border-terminal-bear/30">
              {editError}
            </div>
          )}

          {/* TAB 1: OPEN POSITIONS */}
          {tab === 'positions' && (
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="sticky top-0 bg-terminal-surface text-terminal-muted border-b border-terminal-border">
                <tr>
                  <th className="py-1.5 px-3 font-medium">เหรียญ / ฝั่ง</th>
                  <th className="py-1.5 px-2 font-medium text-right">ขนาด</th>
                  <th className="py-1.5 px-2 font-medium text-right">ราคาเข้า</th>
                  <th className="py-1.5 px-2 font-medium text-right">Mark</th>
                  <th className="py-1.5 px-2 font-medium text-right">Liq. Price</th>
                  <th className="py-1.5 px-2 font-medium text-center">TP / SL</th>
                  <th className="py-1.5 px-2 font-medium text-right">uPnL (ROE%)</th>
                  <th className="py-1.5 px-3 font-medium text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border/40 font-mono tabular-nums">
                {positions.map((pos) => {
                  const mark = markPrices[pos.symbol] || pos.entryPrice;
                  const prec = getPricePrecision(pos.entryPrice);
                  const uPnl = calcUnrealizedPnl(
                    pos.side,
                    pos.entryPrice,
                    mark,
                    pos.quantity
                  );
                  const roe = calcRoePercent(uPnl, pos.margin);
                  const notional = pos.quantity * mark;

                  return (
                    <tr key={pos.id} className="hover:bg-terminal-elevated/40">
                      <td className="py-1.5 px-3 font-sans">
                        <button
                          type="button"
                          onClick={() => setActiveSymbol(pos.symbol)}
                          className="font-semibold text-terminal-text hover:text-terminal-blue"
                        >
                          {pos.symbol.replace('USDT', '')}/USDT
                        </button>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className={`text-[9px] px-1 rounded font-semibold uppercase ${
                              pos.side === 'long'
                                ? 'bg-terminal-bull/15 text-terminal-bull'
                                : 'bg-terminal-bear/15 text-terminal-bear'
                            }`}
                          >
                            {pos.side} {pos.leverage}x
                          </span>
                          <span className="text-[9px] text-terminal-muted capitalize">
                            {pos.marginMode}
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <div className="text-terminal-text">
                          {notional.toFixed(2)} USDT
                        </div>
                        <div className="text-[10px] text-terminal-muted">
                          {pos.quantity.toFixed(4)} ({pos.margin.toFixed(1)}M)
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-right text-terminal-text">
                        {formatPrice(pos.entryPrice, prec)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-terminal-text">
                        {formatPrice(mark, prec)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-terminal-gold">
                        {pos.liquidationPrice > 0
                          ? formatPrice(pos.liquidationPrice, prec)
                          : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {editingId === pos.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="any"
                              value={tpDraft}
                              onChange={(e) => setTpDraft(e.target.value)}
                              placeholder="TP"
                              className="w-16 bg-terminal-bg border border-terminal-bull/60 rounded px-1 py-0.5 text-[10px] text-terminal-text"
                            />
                            <input
                              type="number"
                              step="any"
                              value={slDraft}
                              onChange={(e) => setSlDraft(e.target.value)}
                              placeholder="SL"
                              className="w-16 bg-terminal-bg border border-terminal-bear/60 rounded px-1 py-0.5 text-[10px] text-terminal-text"
                            />
                            <button
                              type="button"
                              onClick={() => saveEditTpSl(pos.id)}
                              className="px-1.5 py-0.5 rounded bg-terminal-blue text-white text-[10px] font-sans"
                            >
                              บันทึก
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-0.5 text-terminal-muted hover:text-terminal-text"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              startEditTpSl(pos.id, pos.tpPrice, pos.slPrice)
                            }
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-terminal-bg hover:bg-terminal-elevated border border-terminal-border text-[10px]"
                          >
                            <span className="text-terminal-bull">
                              {pos.tpPrice ? formatPrice(pos.tpPrice, prec) : '—'}
                            </span>
                            <span className="text-terminal-muted">/</span>
                            <span className="text-terminal-bear">
                              {pos.slPrice ? formatPrice(pos.slPrice, prec) : '—'}
                            </span>
                            <Edit3 className="w-2.5 h-2.5 text-terminal-muted ml-0.5" />
                          </button>
                        )}
                      </td>
                      <td
                        className={`py-1.5 px-2 text-right font-semibold ${
                          uPnl >= 0 ? 'text-terminal-bull' : 'text-terminal-bear'
                        }`}
                      >
                        <div>
                          {uPnl >= 0 ? '+' : ''}
                          {uPnl.toFixed(2)} USDT
                        </div>
                        <div className="text-[10px]">
                          ({roe >= 0 ? '+' : ''}
                          {roe.toFixed(2)}%)
                        </div>
                      </td>
                      <td className="py-1.5 px-3 text-right font-sans">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => closePosition(pos.id, mark, 0.5, 'manual')}
                            className="px-1.5 py-1 rounded bg-terminal-bg hover:bg-terminal-elevated border border-terminal-border text-[10px] text-terminal-text"
                          >
                            ปิด 50%
                          </button>
                          <button
                            type="button"
                            onClick={() => closePosition(pos.id, mark, 1, 'manual')}
                            className="px-2 py-1 rounded bg-terminal-bear/20 hover:bg-terminal-bear/30 border border-terminal-bear/40 text-[10px] text-terminal-bear font-medium"
                          >
                            ปิดทั้งหมด
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {positions.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-xs text-terminal-muted font-sans"
                    >
                      ยังไม่มีสถานะ Futures ที่เปิดอยู่ — เลือก Long หรือ Short ที่แผงด้านขวาเพื่อเริ่มทดสอบเทรด
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* TAB 2: PENDING LIMIT ORDERS */}
          {tab === 'orders' && (
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="sticky top-0 bg-terminal-surface text-terminal-muted border-b border-terminal-border">
                <tr>
                  <th className="py-1.5 px-3 font-medium">เวลา</th>
                  <th className="py-1.5 px-2 font-medium">เหรียญ / ฝั่ง</th>
                  <th className="py-1.5 px-2 font-medium text-right">ราคาตั้งรอ</th>
                  <th className="py-1.5 px-2 font-medium text-right">Margin</th>
                  <th className="py-1.5 px-2 font-medium text-right">ขนาดรวม</th>
                  <th className="py-1.5 px-2 font-medium text-center">TP / SL</th>
                  <th className="py-1.5 px-3 font-medium text-right">
                    {pendingOrders.length > 0 && (
                      <button
                        type="button"
                        onClick={cancelAllPendingOrders}
                        className="text-[10px] text-terminal-bear hover:underline"
                      >
                        ยกเลิกทั้งหมด
                      </button>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border/40 font-mono tabular-nums">
                {pendingOrders.map((ord) => {
                  const prec = getPricePrecision(ord.limitPrice);
                  return (
                    <tr key={ord.id} className="hover:bg-terminal-elevated/40">
                      <td className="py-1.5 px-3 text-terminal-muted">
                        {formatTimeShort(ord.createdAt)}
                      </td>
                      <td className="py-1.5 px-2 font-sans">
                        <button
                          type="button"
                          onClick={() => setActiveSymbol(ord.symbol)}
                          className="font-semibold text-terminal-text hover:text-terminal-blue mr-1.5"
                        >
                          {ord.symbol.replace('USDT', '')}/USDT
                        </button>
                        <span
                          className={`text-[9px] px-1 rounded uppercase font-semibold ${
                            ord.side === 'long'
                              ? 'bg-terminal-bull/15 text-terminal-bull'
                              : 'bg-terminal-bear/15 text-terminal-bear'
                          }`}
                        >
                          {ord.side} {ord.leverage}x
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right text-terminal-blue">
                        {formatPrice(ord.limitPrice, prec)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-terminal-text">
                        {ord.margin.toFixed(2)} USDT
                      </td>
                      <td className="py-1.5 px-2 text-right text-terminal-text">
                        {(ord.margin * ord.leverage).toFixed(2)} USDT
                      </td>
                      <td className="py-1.5 px-2 text-center text-[10px]">
                        <span className="text-terminal-bull">
                          {ord.tpPrice ? formatPrice(ord.tpPrice, prec) : '—'}
                        </span>
                        <span className="text-terminal-muted"> / </span>
                        <span className="text-terminal-bear">
                          {ord.slPrice ? formatPrice(ord.slPrice, prec) : '—'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right font-sans">
                        <button
                          type="button"
                          onClick={() => cancelPendingOrder(ord.id)}
                          className="px-2 py-0.5 rounded bg-terminal-bg hover:bg-terminal-elevated border border-terminal-border text-[10px] text-terminal-bear"
                        >
                          ยกเลิก
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {pendingOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-xs text-terminal-muted font-sans"
                    >
                      ไม่มีคำสั่ง Limit ที่รอจับคู่
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* TAB 3: TRADE HISTORY */}
          {tab === 'history' && (
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="sticky top-0 bg-terminal-surface text-terminal-muted border-b border-terminal-border">
                <tr>
                  <th className="py-1.5 px-3 font-medium">เวลาปิด</th>
                  <th className="py-1.5 px-2 font-medium">เหรียญ / ฝั่ง</th>
                  <th className="py-1.5 px-2 font-medium text-right">ราคาเข้า → ออก</th>
                  <th className="py-1.5 px-2 font-medium text-center">สถานะ</th>
                  <th className="py-1.5 px-2 font-medium text-right">ค่าธรรมเนียม</th>
                  <th className="py-1.5 px-3 font-medium text-right">
                    <span className="mr-2">กำไรสุทธิ (ROE%)</span>
                    {tradeHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={clearHistory}
                        title="ล้างประวัติ"
                        className="inline-flex items-center text-terminal-muted hover:text-terminal-bear"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border/40 font-mono tabular-nums">
                {tradeHistory.map((tr) => {
                  const prec = getPricePrecision(tr.entryPrice);
                  const badge = REASON_LABEL[tr.closeReason];
                  return (
                    <tr key={tr.id} className="hover:bg-terminal-elevated/40">
                      <td className="py-1.5 px-3 text-terminal-muted">
                        {formatTimeShort(tr.closedAt)}
                      </td>
                      <td className="py-1.5 px-2 font-sans">
                        <span className="font-semibold text-terminal-text mr-1.5">
                          {tr.symbol.replace('USDT', '')}/USDT
                        </span>
                        <span
                          className={`text-[9px] px-1 rounded uppercase font-semibold ${
                            tr.side === 'long'
                              ? 'bg-terminal-bull/15 text-terminal-bull'
                              : 'bg-terminal-bear/15 text-terminal-bear'
                          }`}
                        >
                          {tr.side} {tr.leverage}x
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right text-terminal-text">
                        {formatPrice(tr.entryPrice, prec)} →{' '}
                        {formatPrice(tr.exitPrice, prec)}
                      </td>
                      <td className="py-1.5 px-2 text-center font-sans">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${badge.cls}`}>
                          {badge.text}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right text-terminal-muted">
                        -{tr.fees.toFixed(2)}
                      </td>
                      <td
                        className={`py-1.5 px-3 text-right font-semibold ${
                          tr.realizedPnl >= 0
                            ? 'text-terminal-bull'
                            : 'text-terminal-bear'
                        }`}
                      >
                        {tr.realizedPnl >= 0 ? '+' : ''}
                        {tr.realizedPnl.toFixed(2)} USDT ({tr.roePercent >= 0 ? '+' : ''}
                        {tr.roePercent.toFixed(1)}%)
                      </td>
                    </tr>
                  );
                })}

                {tradeHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-xs text-terminal-muted font-sans"
                    >
                      ยังไม่มีประวัติการปิดสถานะ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
