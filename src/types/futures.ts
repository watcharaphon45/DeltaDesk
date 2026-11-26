export type PositionSide = 'long' | 'short';
export type MarginMode = 'isolated' | 'cross';
export type FuturesOrderType = 'market' | 'limit';
export type CloseReason = 'manual' | 'tp' | 'sl' | 'liquidated';

export interface FuturesPosition {
  id: string;
  symbol: string;
  side: PositionSide;
  marginMode: MarginMode;
  leverage: number;
  margin: number;
  quantity: number;
  entryPrice: number;
  liquidationPrice: number;
  tpPrice: number | null;
  slPrice: number | null;
  openFee: number;
  openedAt: number;
}

export interface FuturesPendingOrder {
  id: string;
  symbol: string;
  side: PositionSide;
  marginMode: MarginMode;
  leverage: number;
  margin: number;
  quantity: number;
  limitPrice: number;
  tpPrice: number | null;
  slPrice: number | null;
  createdAt: number;
}

export interface FuturesClosedTrade {
  id: string;
  symbol: string;
  side: PositionSide;
  marginMode: MarginMode;
  leverage: number;
  margin: number;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  grossPnl: number;
  fees: number;
  realizedPnl: number;
  roePercent: number;
  closeReason: CloseReason;
  openedAt: number;
  closedAt: number;
}
