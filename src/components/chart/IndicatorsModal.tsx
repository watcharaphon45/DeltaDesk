'use client';

import React, { useState } from 'react';
import { Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useTerminalStore } from '@/store/useTerminalStore';
import { INDICATORS_CATALOG } from '@/constants/markets';

export function IndicatorsModal() {
  const indicatorsModalOpen = useTerminalStore((s) => s.indicatorsModalOpen);
  const activeIndicators = useTerminalStore((s) => s.activeIndicators);
  const setIndicatorsModalOpen = useTerminalStore((s) => s.setIndicatorsModalOpen);
  const addIndicator = useTerminalStore((s) => s.addIndicator);
  const removeIndicator = useTerminalStore((s) => s.removeIndicator);
  const updateIndicatorParams = useTerminalStore((s) => s.updateIndicatorParams);
  const resetDefaultIndicators = useTerminalStore((s) => s.resetDefaultIndicators);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [paramDraft, setParamDraft] = useState('');

  if (!indicatorsModalOpen) return null;

  const mainCatalog = INDICATORS_CATALOG.filter((i) => i.category === 'main');
  const subCatalog = INDICATORS_CATALOG.filter((i) => i.category === 'sub');

  const handleAdd = (item: (typeof INDICATORS_CATALOG)[number]) => {
    const id = `ind_${item.name.toLowerCase()}_${Date.now()}`;
    const paneId =
      item.category === 'main' ? 'candle_pane' : `pane_${item.name.toLowerCase()}_${Date.now()}`;
    addIndicator({
      id,
      name: item.name,
      paneId,
      isStack: item.category === 'main',
      calcParams: [...item.defaultParams],
    });
  };

  const startEdit = (id: string, params: number[]) => {
    setEditingId(id);
    setParamDraft(params.join(', '));
  };

  const saveEdit = (id: string) => {
    const parsed = paramDraft
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (parsed.length > 0) {
      updateIndicatorParams(id, parsed);
    }
    setEditingId(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={() => setIndicatorsModalOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-terminal-surface border border-terminal-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-terminal-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-terminal-text">
              จัดการ Technical Indicators
            </h2>
            <p className="text-[11px] text-terminal-muted">
              เลือกเพิ่มหรือปรับพารามิเตอร์เส้นค่าเฉลี่ยและออสซิลเลเตอร์บนกราฟ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetDefaultIndicators}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] bg-terminal-bg border border-terminal-border text-terminal-muted hover:text-terminal-text"
            >
              <RotateCcw className="w-3 h-3" />
              ค่าเริ่มต้น
            </button>
            <button
              type="button"
              onClick={() => setIndicatorsModalOpen(false)}
              className="p-1 rounded text-terminal-muted hover:text-terminal-text hover:bg-terminal-elevated"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-terminal-text mb-2">
              กำลังเปิดใช้งาน ({activeIndicators.length})
            </h3>
            {activeIndicators.length === 0 ? (
              <div className="text-xs text-terminal-muted bg-terminal-bg border border-terminal-border rounded p-3">
                ยังไม่มี Indicator ที่เปิดอยู่ — เลือกเพิ่มจากรายการด้านล่างได้เลย
              </div>
            ) : (
              <div className="space-y-1.5">
                {activeIndicators.map((ind) => (
                  <div
                    key={ind.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-terminal-bg border border-terminal-border text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-terminal-text">
                        {ind.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-terminal-elevated text-terminal-muted">
                        {ind.paneId === 'candle_pane' ? 'บนกราฟหลัก' : 'หน้าต่างแยก'}
                      </span>
                      {editingId === ind.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={paramDraft}
                            onChange={(e) => setParamDraft(e.target.value)}
                            className="w-36 bg-terminal-surface border border-terminal-blue rounded px-2 py-0.5 text-[11px] font-mono text-terminal-text focus:outline-none"
                            placeholder="เช่น 9, 21, 50"
                          />
                          <button
                            type="button"
                            onClick={() => saveEdit(ind.id)}
                            className="px-2 py-0.5 rounded bg-terminal-blue text-white text-[10px]"
                          >
                            บันทึก
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(ind.id, ind.calcParams)}
                          className="font-mono text-[11px] text-terminal-blue hover:underline"
                          title="คลิกเพื่อแก้ไขพารามิเตอร์"
                        >
                          ({ind.calcParams.join(', ')})
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeIndicator(ind.id)}
                      className="text-terminal-muted hover:text-terminal-bear p-1"
                      title="ลบ Indicator นี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold text-terminal-text mb-2">
              Overlay Indicators (แสดงทับบนกราฟแท่งเทียน)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mainCatalog.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleAdd(item)}
                  className="text-left p-2.5 rounded bg-terminal-bg hover:bg-terminal-elevated border border-terminal-border transition-colors flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-semibold text-terminal-text">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-terminal-muted mt-0.5">
                      {item.description}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-terminal-blue shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-terminal-text mb-2">
              Oscillators & Volume (แสดงหน้าต่างแยกด้านล่าง)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subCatalog.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleAdd(item)}
                  className="text-left p-2.5 rounded bg-terminal-bg hover:bg-terminal-elevated border border-terminal-border transition-colors flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-semibold text-terminal-text">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-terminal-muted mt-0.5">
                      {item.description}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-terminal-blue shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
