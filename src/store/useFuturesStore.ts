import { create } from 'zustand';
import {
  DEFAULT_WALLET_BALANCE,
  MAKER_FEE_RATE,
  TAKER_FEE_RATE,
  calcLiquidationPrice,
  calcRoePercent,
  calcUnrealizedPnl,
  validateTpSl,
} from '@/lib/futures/math';
import type {
  CloseReason,
  FuturesClosedTrade,
  FuturesOrderType,
  FuturesPendingOrder,
  FuturesPosition,
  MarginMode,
  PositionSide,
} from '@/types/futures';

const STORAGE_KEY = 'deltadesk:futures_state_v1';

interface PersistedFuturesState {
  walletBalance: number;
  positions: FuturesPosition[];
  pendingOrders: FuturesPendingOrder[];
  tradeHistory: FuturesClosedTrade[];
  showOrderPanel: boolean;
  showBottomBar: boolean;
}

function loadPersisted(): Partial<PersistedFuturesState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedFuturesState>;
  } catch {
    return {};
  }
}

function savePersisted(state: PersistedFuturesState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function persistFromStore(s: FuturesState): void {
  savePersisted({
    walletBalance: s.walletBalance,
    positions: s.positions,
    pendingOrders: s.pendingOrders,
    tradeHistory: s.tradeHistory,
    showOrderPanel: s.showOrderPanel,
    showBottomBar: s.showBottomBar,
  });
}

export interface PlaceOrderInput {
  symbol: string;
  side: PositionSide;
  orderType: FuturesOrderType;
  marginMode: MarginMode;
  leverage: number;
  margin: number;
  currentPrice: number;
  limitPrice?: number;
  tpPrice: number | null;
  slPrice: number | null;
}

interface FuturesState {
  walletBalance: number;
  positions: FuturesPosition[];
  pendingOrders: FuturesPendingOrder[];
  tradeHistory: FuturesClosedTrade[];
  markPrices: Record<string, number>;
  overlayRevision: number;
  showOrderPanel: boolean;
  showBottomBar: boolean;

  hydrateFutures: () => void;
  placeOrder: (input: PlaceOrderInput) => { ok: boolean; error?: string };
  closePosition: (
    id: string,
    exitPrice: number,
    ratio?: number,
    reason?: CloseReason
  ) => void;
  updatePositionTpSl: (
    id: string,
    tpPrice: number | null,
    slPrice: number | null
  ) => { ok: boolean; error?: string };
  cancelPendingOrder: (id: string) => void;
  cancelAllPendingOrders: () => void;
  checkTriggersOnTick: (symbol: string, currentPrice: number) => void;
  updateMarkPrice: (symbol: string, price: number) => void;
  seedMarkPrices: (items: Array<{ symbol: string; lastPrice: number }>) => void;
  resetAccount: () => void;
  topUpDemoFunds: (amount?: number) => void;
  clearHistory: () => void;
  toggleOrderPanel: () => void;
  toggleBottomBar: () => void;
}

function computeClosedTrade(
  pos: FuturesPosition,
  exitPrice: number,
  ratio: number,
  reason: CloseReason,
  walletBalance: number
): { trade: FuturesClosedTrade; nextWalletBalance: number; remaining: FuturesPosition | null } {
  const safeRatio = Math.min(1, Math.max(0.01, ratio));
  const closedMargin = pos.margin * safeRatio;
  const closedQty = pos.quantity * safeRatio;
  const allocatedOpenFee = pos.openFee * safeRatio;

  const grossPnl = calcUnrealizedPnl(pos.side, pos.entryPrice, exitPrice, closedQty);
  const closeFeeRate = reason === 'tp' ? MAKER_FEE_RATE : TAKER_FEE_RATE;
  const closeFee = reason === 'liquidated' ? 0 : closedQty * exitPrice * closeFeeRate;

  let nextWalletBalance = walletBalance;
  let realizedPnl = 0;

  if (reason === 'liquidated') {
    if (pos.marginMode === 'cross') {
      const excessLoss = Math.max(0, -grossPnl - closedMargin);
      nextWalletBalance = Math.max(0, walletBalance - excessLoss);
    }
    realizedPnl = -closedMargin - allocatedOpenFee;
  } else {
    const payout = Math.max(0, closedMargin + grossPnl - closeFee);
    nextWalletBalance = walletBalance + payout;
    realizedPnl = grossPnl - allocatedOpenFee - closeFee;
  }

  const roePercent = calcRoePercent(realizedPnl, closedMargin);
  const trade: FuturesClosedTrade = {
    id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    symbol: pos.symbol,
    side: pos.side,
    marginMode: pos.marginMode,
    leverage: pos.leverage,
    margin: closedMargin,
    quantity: closedQty,
    entryPrice: pos.entryPrice,
    exitPrice,
    grossPnl,
    fees: allocatedOpenFee + closeFee,
    realizedPnl,
    roePercent,
    closeReason: reason,
    openedAt: pos.openedAt,
    closedAt: Date.now(),
  };

  let remaining: FuturesPosition | null = null;
  if (safeRatio < 0.999) {
    remaining = {
      ...pos,
      margin: pos.margin - closedMargin,
      quantity: pos.quantity - closedQty,
      openFee: pos.openFee - allocatedOpenFee,
    };
  }

  return { trade, nextWalletBalance, remaining };
}

export const useFuturesStore = create<FuturesState>((set, get) => ({
  walletBalance: DEFAULT_WALLET_BALANCE,
  positions: [],
  pendingOrders: [],
  tradeHistory: [],
  markPrices: {},
  overlayRevision: 0,
  showOrderPanel: true,
  showBottomBar: true,

  hydrateFutures: () => {
    const saved = loadPersisted();
    set({
      walletBalance:
        typeof saved.walletBalance === 'number'
          ? saved.walletBalance
          : DEFAULT_WALLET_BALANCE,
      positions: Array.isArray(saved.positions) ? saved.positions : [],
      pendingOrders: Array.isArray(saved.pendingOrders) ? saved.pendingOrders : [],
      tradeHistory: Array.isArray(saved.tradeHistory) ? saved.tradeHistory : [],
      showOrderPanel: saved.showOrderPanel ?? true,
      showBottomBar: saved.showBottomBar ?? true,
      overlayRevision: get().overlayRevision + 1,
    });
  },

  placeOrder: (input) => {
    const symbol = input.symbol.toUpperCase();
    const { side, orderType, marginMode, leverage, margin, currentPrice, tpPrice, slPrice } = input;

    if (!Number.isFinite(margin) || margin <= 0) {
      return { ok: false, error: 'กรุณาระบุจำนวนเงิน Margin ที่มากกว่า 0' };
    }
    if (!Number.isFinite(leverage) || leverage < 1 || leverage > 125) {
      return { ok: false, error: 'Leverage ต้องอยู่ระหว่าง 1x ถึง 125x' };
    }

    const refPrice =
      orderType === 'market' ? currentPrice : Number(input.limitPrice ?? 0);
    if (!Number.isFinite(refPrice) || refPrice <= 0) {
      return { ok: false, error: 'ราคาอ้างอิงไม่ถูกต้อง หรือกำลังรอราคาตลาด' };
    }

    const tpSlError = validateTpSl(side, refPrice, tpPrice, slPrice);
    if (tpSlError) return { ok: false, error: tpSlError };

    const notional = margin * leverage;
    const quantity = notional / refPrice;
    const state = get();

    // Immediate Market Order OR Limit Order that crosses market price right away
    const limitTriggersImmediately =
      orderType === 'limit' &&
      currentPrice > 0 &&
      ((side === 'long' && currentPrice <= refPrice) ||
        (side === 'short' && currentPrice >= refPrice));

    if (orderType === 'market' || limitTriggersImmediately) {
      const fillPrice = orderType === 'market' ? currentPrice : refPrice;
      const fillQty = notional / fillPrice;
      const feeRate = orderType === 'market' ? TAKER_FEE_RATE : MAKER_FEE_RATE;
      const openFee = fillQty * fillPrice * feeRate;

      if (state.walletBalance < margin + openFee) {
        return {
          ok: false,
          error: `ยอดเงินไม่พอ (ต้องใช้ ${(margin + openFee).toFixed(2)} USDT)`,
        };
      }

      const nextBalance = state.walletBalance - margin - openFee;
      const liqPrice = calcLiquidationPrice({
        side,
        marginMode,
        entryPrice: fillPrice,
        leverage,
        margin,
        quantity: fillQty,
        extraCrossBuffer: marginMode === 'cross' ? nextBalance : 0,
      });

      const pos: FuturesPosition = {
        id: `pos_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        symbol,
        side,
        marginMode,
        leverage,
        margin,
        quantity: fillQty,
        entryPrice: fillPrice,
        liquidationPrice: liqPrice,
        tpPrice,
        slPrice,
        openFee,
        openedAt: Date.now(),
      };

      const nextState = {
        ...state,
        walletBalance: nextBalance,
        positions: [pos, ...state.positions],
        overlayRevision: state.overlayRevision + 1,
      };
      set({
        walletBalance: nextState.walletBalance,
        positions: nextState.positions,
        overlayRevision: nextState.overlayRevision,
      });
      persistFromStore(nextState);
      return { ok: true };
    }

    // Pending Limit Order
    if (state.walletBalance < margin) {
      return {
        ok: false,
        error: `ยอดเงินไม่พอสำหรับ Margin ${margin.toFixed(2)} USDT`,
      };
    }

    const order: FuturesPendingOrder = {
      id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      symbol,
      side,
      marginMode,
      leverage,
      margin,
      quantity,
      limitPrice: refPrice,
      tpPrice,
      slPrice,
      createdAt: Date.now(),
    };

    const nextState = {
      ...state,
      walletBalance: state.walletBalance - margin,
      pendingOrders: [order, ...state.pendingOrders],
      overlayRevision: state.overlayRevision + 1,
    };
    set({
      walletBalance: nextState.walletBalance,
      pendingOrders: nextState.pendingOrders,
      overlayRevision: nextState.overlayRevision,
    });
    persistFromStore(nextState);
    return { ok: true };
  },

  closePosition: (id, exitPrice, ratio = 1, reason = 'manual') => {
    const state = get();
    const target = state.positions.find((p) => p.id === id);
    if (!target || !Number.isFinite(exitPrice) || exitPrice <= 0) return;

    const { trade, nextWalletBalance, remaining } = computeClosedTrade(
      target,
      exitPrice,
      ratio,
      reason,
      state.walletBalance
    );

    const nextPositions = remaining
      ? state.positions.map((p) => (p.id === id ? remaining : p))
      : state.positions.filter((p) => p.id !== id);
    const nextHistory = [trade, ...state.tradeHistory].slice(0, 100);

    const nextState = {
      ...state,
      walletBalance: nextWalletBalance,
      positions: nextPositions,
      tradeHistory: nextHistory,
      overlayRevision: state.overlayRevision + 1,
    };
    set({
      walletBalance: nextState.walletBalance,
      positions: nextState.positions,
      tradeHistory: nextState.tradeHistory,
      overlayRevision: nextState.overlayRevision,
    });
    persistFromStore(nextState);
  },

  updatePositionTpSl: (id, tpPrice, slPrice) => {
    const state = get();
    const target = state.positions.find((p) => p.id === id);
    if (!target) return { ok: false, error: 'ไม่พบสถานะที่ต้องการแก้ไข' };

    const mark = state.markPrices[target.symbol] || target.entryPrice;
    const err = validateTpSl(target.side, mark, tpPrice, slPrice);
    if (err) return { ok: false, error: err };

    const nextPositions = state.positions.map((p) =>
      p.id === id ? { ...p, tpPrice, slPrice } : p
    );
    const nextState = {
      ...state,
      positions: nextPositions,
      overlayRevision: state.overlayRevision + 1,
    };
    set({
      positions: nextState.positions,
      overlayRevision: nextState.overlayRevision,
    });
    persistFromStore(nextState);
    return { ok: true };
  },

  cancelPendingOrder: (id) => {
    const state = get();
    const ord = state.pendingOrders.find((o) => o.id === id);
    if (!ord) return;

    const nextState = {
      ...state,
      walletBalance: state.walletBalance + ord.margin,
      pendingOrders: state.pendingOrders.filter((o) => o.id !== id),
      overlayRevision: state.overlayRevision + 1,
    };
    set({
      walletBalance: nextState.walletBalance,
      pendingOrders: nextState.pendingOrders,
      overlayRevision: nextState.overlayRevision,
    });
    persistFromStore(nextState);
  },

  cancelAllPendingOrders: () => {
    const state = get();
    if (state.pendingOrders.length === 0) return;
    const refunded = state.pendingOrders.reduce((sum, o) => sum + o.margin, 0);
    const nextState = {
      ...state,
      walletBalance: state.walletBalance + refunded,
      pendingOrders: [],
      overlayRevision: state.overlayRevision + 1,
    };
    set({
      walletBalance: nextState.walletBalance,
      pendingOrders: nextState.pendingOrders,
      overlayRevision: nextState.overlayRevision,
    });
    persistFromStore(nextState);
  },

  checkTriggersOnTick: (symbol, currentPrice) => {
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) return;
    const state = get();
    const upper = symbol.toUpperCase();

    const hasPending = state.pendingOrders.some((o) => o.symbol === upper);
    const hasPos = state.positions.some((p) => p.symbol === upper);
    if (!hasPending && !hasPos) return; // Zero-allocation fast path

    let changed = false;
    let nextWallet = state.walletBalance;
    let nextPositions = [...state.positions];
    const nextPending: FuturesPendingOrder[] = [];
    const newTrades: FuturesClosedTrade[] = [];

    // 1. Check pending limit order fills
    for (const ord of state.pendingOrders) {
      if (ord.symbol !== upper) {
        nextPending.push(ord);
        continue;
      }
      const triggered =
        ord.side === 'long'
          ? currentPrice <= ord.limitPrice
          : currentPrice >= ord.limitPrice;
      if (!triggered) {
        nextPending.push(ord);
        continue;
      }

      changed = true;
      const openFee = ord.quantity * ord.limitPrice * MAKER_FEE_RATE;
      nextWallet = Math.max(0, nextWallet - openFee);
      const liqPrice = calcLiquidationPrice({
        side: ord.side,
        marginMode: ord.marginMode,
        entryPrice: ord.limitPrice,
        leverage: ord.leverage,
        margin: ord.margin,
        quantity: ord.quantity,
        extraCrossBuffer: ord.marginMode === 'cross' ? nextWallet : 0,
      });

      nextPositions.unshift({
        id: `pos_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        symbol: ord.symbol,
        side: ord.side,
        marginMode: ord.marginMode,
        leverage: ord.leverage,
        margin: ord.margin,
        quantity: ord.quantity,
        entryPrice: ord.limitPrice,
        liquidationPrice: liqPrice,
        tpPrice: ord.tpPrice,
        slPrice: ord.slPrice,
        openFee,
        openedAt: Date.now(),
      });
    }

    // 2. Check open positions for Liquidation, TP, SL
    const survivingPositions: FuturesPosition[] = [];
    for (const pos of nextPositions) {
      if (pos.symbol !== upper) {
        survivingPositions.push(pos);
        continue;
      }

      let hitReason: CloseReason | null = null;
      let exitPrice = currentPrice;

      if (pos.liquidationPrice > 0) {
        const liquidated =
          pos.side === 'long'
            ? currentPrice <= pos.liquidationPrice
            : currentPrice >= pos.liquidationPrice;
        if (liquidated) {
          hitReason = 'liquidated';
          exitPrice = pos.liquidationPrice;
        }
      }

      if (!hitReason && pos.slPrice !== null) {
        const hitSl =
          pos.side === 'long'
            ? currentPrice <= pos.slPrice
            : currentPrice >= pos.slPrice;
        if (hitSl) {
          hitReason = 'sl';
          exitPrice = pos.slPrice;
        }
      }

      if (!hitReason && pos.tpPrice !== null) {
        const hitTp =
          pos.side === 'long'
            ? currentPrice >= pos.tpPrice
            : currentPrice <= pos.tpPrice;
        if (hitTp) {
          hitReason = 'tp';
          exitPrice = pos.tpPrice;
        }
      }

      if (!hitReason) {
        survivingPositions.push(pos);
        continue;
      }

      changed = true;
      const closed = computeClosedTrade(pos, exitPrice, 1, hitReason, nextWallet);
      nextWallet = closed.nextWalletBalance;
      newTrades.push(closed.trade);
    }

    if (!changed) return;

    const nextHistory = [...newTrades, ...state.tradeHistory].slice(0, 100);
    const nextState = {
      ...state,
      walletBalance: nextWallet,
      positions: survivingPositions,
      pendingOrders: nextPending,
      tradeHistory: nextHistory,
      overlayRevision: state.overlayRevision + 1,
    };
    set({
      walletBalance: nextState.walletBalance,
      positions: nextState.positions,
      pendingOrders: nextState.pendingOrders,
      tradeHistory: nextState.tradeHistory,
      overlayRevision: nextState.overlayRevision,
    });
    persistFromStore(nextState);
  },

  updateMarkPrice: (symbol, price) => {
    if (!Number.isFinite(price) || price <= 0) return;
    const upper = symbol.toUpperCase();
    const cur = get().markPrices[upper];
    if (cur === price) return;
    set((s) => ({
      markPrices: { ...s.markPrices, [upper]: price },
    }));
  },

  seedMarkPrices: (items) => {
    if (items.length === 0) return;
    const next = { ...get().markPrices };
    for (const item of items) {
      if (item.lastPrice > 0) {
        next[item.symbol.toUpperCase()] = item.lastPrice;
      }
    }
    set({ markPrices: next });
  },

  resetAccount: () => {
    const state = get();
    const nextState = {
      ...state,
      walletBalance: DEFAULT_WALLET_BALANCE,
      positions: [],
      pendingOrders: [],
      tradeHistory: [],
      overlayRevision: state.overlayRevision + 1,
    };
    set({
      walletBalance: nextState.walletBalance,
      positions: nextState.positions,
      pendingOrders: nextState.pendingOrders,
      tradeHistory: nextState.tradeHistory,
      overlayRevision: nextState.overlayRevision,
    });
    persistFromStore(nextState);
  },

  topUpDemoFunds: (amount = 10000) => {
    const state = get();
    const nextState = {
      ...state,
      walletBalance: state.walletBalance + amount,
    };
    set({ walletBalance: nextState.walletBalance });
    persistFromStore(nextState);
  },

  clearHistory: () => {
    const state = get();
    const nextState = { ...state, tradeHistory: [] };
    set({ tradeHistory: [] });
    persistFromStore(nextState);
  },

  toggleOrderPanel: () => {
    const state = get();
    const next = !state.showOrderPanel;
    const nextState = { ...state, showOrderPanel: next };
    set({ showOrderPanel: next });
    persistFromStore(nextState);
  },

  toggleBottomBar: () => {
    const state = get();
    const next = !state.showBottomBar;
    const nextState = { ...state, showBottomBar: next };
    set({ showBottomBar: next });
    persistFromStore(nextState);
  },
}));
