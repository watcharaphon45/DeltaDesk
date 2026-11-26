import type { MarginMode, PositionSide } from '@/types/futures';

export const TAKER_FEE_RATE = 0.0004; // 0.04%
export const MAKER_FEE_RATE = 0.0002; // 0.02%
export const DEFAULT_WALLET_BALANCE = 10000;

export function getMaintenanceMarginRate(leverage: number): number {
  return Math.min(0.004, (1 / Math.max(1, leverage)) * 0.5);
}

export function calcUnrealizedPnl(
  side: PositionSide,
  entryPrice: number,
  markPrice: number,
  quantity: number
): number {
  if (!Number.isFinite(markPrice) || markPrice <= 0) return 0;
  return side === 'long'
    ? (markPrice - entryPrice) * quantity
    : (entryPrice - markPrice) * quantity;
}

export function calcRoePercent(pnl: number, margin: number): number {
  return margin > 0 ? (pnl / margin) * 100 : 0;
}

export function calcLiquidationPrice(params: {
  side: PositionSide;
  marginMode: MarginMode;
  entryPrice: number;
  leverage: number;
  margin: number;
  quantity: number;
  extraCrossBuffer?: number;
}): number {
  const { side, marginMode, entryPrice, leverage, margin, quantity, extraCrossBuffer } = params;
  if (entryPrice <= 0 || quantity <= 0 || leverage <= 0) return 0;

  const mmr = getMaintenanceMarginRate(leverage);

  if (marginMode === 'isolated') {
    if (side === 'long') {
      return Math.max(0, entryPrice * (1 - 1 / leverage + mmr));
    }
    return entryPrice * (1 + 1 / leverage - mmr);
  }

  const effectiveMargin = margin + Math.max(0, extraCrossBuffer ?? 0);
  if (side === 'long') {
    return Math.max(
      0,
      entryPrice - (effectiveMargin - entryPrice * quantity * mmr) / quantity
    );
  }
  return entryPrice + (effectiveMargin - entryPrice * quantity * mmr) / quantity;
}

export function validateTpSl(
  side: PositionSide,
  refPrice: number,
  tpPrice: number | null,
  slPrice: number | null
): string | null {
  if (side === 'long') {
    if (tpPrice !== null && tpPrice <= refPrice) {
      return 'ราคา Take Profit ของฝั่ง Long ต้องสูงกว่าราคาเข้า';
    }
    if (slPrice !== null && slPrice >= refPrice) {
      return 'ราคา Stop Loss ของฝั่ง Long ต้องต่ำกว่าราคาเข้า';
    }
  } else {
    if (tpPrice !== null && tpPrice >= refPrice) {
      return 'ราคา Take Profit ของฝั่ง Short ต้องต่ำกว่าราคาเข้า';
    }
    if (slPrice !== null && slPrice <= refPrice) {
      return 'ราคา Stop Loss ของฝั่ง Short ต้องสูงกว่าราคาเข้า';
    }
  }
  return null;
}
