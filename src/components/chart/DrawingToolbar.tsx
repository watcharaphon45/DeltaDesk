'use client';

import React from 'react';
import {
  MousePointer2,
  TrendingUp,
  MoveUpRight,
  Minus,
  SeparatorHorizontal,
  SeparatorVertical,
  DollarSign,
  Columns2,
  AlignJustify,
  SlidersHorizontal,
  Type,
  Magnet,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { useTerminalStore } from '@/store/useTerminalStore';
import { DRAWING_TOOLS } from '@/constants/markets';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  segment: <TrendingUp className="w-4 h-4" />,
  rayLine: <MoveUpRight className="w-4 h-4" />,
  straightLine: <Minus className="w-4 h-4 -rotate-45" />,
  horizontalStraightLine: <SeparatorHorizontal className="w-4 h-4" />,
  horizontalRayLine: <Minus className="w-4 h-4" />,
  verticalStraightLine: <SeparatorVertical className="w-4 h-4" />,
  priceLine: <DollarSign className="w-4 h-4" />,
  parallelStraightLine: <Columns2 className="w-4 h-4 rotate-45" />,
  priceChannelLine: <AlignJustify className="w-4 h-4 -rotate-45" />,
  fibonacciLine: <SlidersHorizontal className="w-4 h-4" />,
  simpleAnnotation: <Type className="w-4 h-4" />,
};

export function DrawingToolbar() {
  const activeDrawingTool = useTerminalStore((s) => s.activeDrawingTool);
  const magnetMode = useTerminalStore((s) => s.magnetMode);
  const drawingsLocked = useTerminalStore((s) => s.drawingsLocked);
  const drawingsHidden = useTerminalStore((s) => s.drawingsHidden);
  const setActiveDrawingTool = useTerminalStore((s) => s.setActiveDrawingTool);
  const cycleMagnetMode = useTerminalStore((s) => s.cycleMagnetMode);
  const toggleDrawingsLocked = useTerminalStore((s) => s.toggleDrawingsLocked);
  const toggleDrawingsHidden = useTerminalStore((s) => s.toggleDrawingsHidden);
  const triggerClearDrawings = useTerminalStore((s) => s.triggerClearDrawings);

  return (
    <aside className="w-11 bg-terminal-surface border-r border-terminal-border flex flex-col items-center py-2 gap-1 shrink-0 select-none overflow-y-auto">
      <button
        type="button"
        onClick={() => setActiveDrawingTool(null)}
        title="Cursor (ยกเลิกเครื่องมือวาด)"
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          activeDrawingTool === null
            ? 'bg-terminal-blue/20 text-terminal-blue border border-terminal-blue/50'
            : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-elevated'
        }`}
      >
        <MousePointer2 className="w-4 h-4" />
      </button>

      <div className="w-6 h-px bg-terminal-border my-1" />

      {DRAWING_TOOLS.map((tool) => {
        const active = activeDrawingTool === tool.overlayName;
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() =>
              setActiveDrawingTool(active ? null : tool.overlayName)
            }
            title={tool.label}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              active
                ? 'bg-terminal-blue/20 text-terminal-blue border border-terminal-blue/50'
                : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-elevated'
            }`}
          >
            {TOOL_ICONS[tool.id]}
          </button>
        );
      })}

      <div className="w-6 h-px bg-terminal-border my-1" />

      <button
        type="button"
        onClick={cycleMagnetMode}
        title={`โหมดแม่เหล็ก: ${
          magnetMode === 'normal'
            ? 'ปิด'
            : magnetMode === 'weak_magnet'
              ? 'ดูดอ่อน (Weak Magnet)'
              : 'ดูดแรง (Strong Magnet)'
        }`}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors relative ${
          magnetMode !== 'normal'
            ? 'bg-terminal-gold/15 text-terminal-gold'
            : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-elevated'
        }`}
      >
        <Magnet className="w-4 h-4" />
        {magnetMode === 'strong_magnet' && (
          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-terminal-gold" />
        )}
      </button>

      <button
        type="button"
        onClick={toggleDrawingsLocked}
        title={drawingsLocked ? 'ปลดล็อกเส้นที่วาด' : 'ล็อกเส้นที่วาดทั้งหมด'}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          drawingsLocked
            ? 'bg-terminal-gold/15 text-terminal-gold'
            : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-elevated'
        }`}
      >
        {drawingsLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
      </button>

      <button
        type="button"
        onClick={toggleDrawingsHidden}
        title={drawingsHidden ? 'แสดงเส้นที่วาด' : 'ซ่อนเส้นที่วาดชั่วคราว'}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          drawingsHidden
            ? 'bg-terminal-blue/15 text-terminal-blue'
            : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-elevated'
        }`}
      >
        {drawingsHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>

      <button
        type="button"
        onClick={triggerClearDrawings}
        title="ลบเส้นที่วาดทั้งหมดในเหรียญนี้"
        className="w-8 h-8 rounded flex items-center justify-center text-terminal-muted hover:text-terminal-bear hover:bg-terminal-bear/10 transition-colors mt-auto"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </aside>
  );
}
