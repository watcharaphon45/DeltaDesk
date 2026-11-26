import { getOverlayClass, registerOverlay } from 'klinecharts';
import { formatPrice } from '@/lib/format';
import type { AutoFibResult, SrZoneLevel } from '@/types/market';

interface SrZoneExtendData extends SrZoneLevel {
  pricePrecision: number;
}

interface TrendlineExtendData {
  kind: 'uptrend' | 'downtrend';
  touches: number;
}

interface FibExtendData extends AutoFibResult {
  pricePrecision: number;
}

interface FuturesLineExtendData {
  label: string;
  priceText: string;
  color: string;
  dashed: boolean;
}

export function registerAutoOverlays(): void {
  if (!getOverlayClass('autoSrZone')) {
    registerOverlay<SrZoneExtendData>({
      name: 'autoSrZone',
      totalStep: 2,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      createPointFigures: ({ coordinates, bounding, overlay, yAxis }) => {
        const data = overlay.extendData;
        if (!data || coordinates.length === 0) return [];

        const isSupport = data.role === 'support';
        const yTop = yAxis
          ? yAxis.convertToPixel(data.zoneHigh)
          : coordinates[0].y;
        const yBot = yAxis
          ? yAxis.convertToPixel(data.zoneLow)
          : (coordinates[1]?.y ?? coordinates[0].y);
        const yCenter = yAxis
          ? yAxis.convertToPixel(data.centerPrice)
          : (yTop + yBot) / 2;

        const startX = Math.max(
          8,
          Math.min(coordinates[0].x, bounding.width * 0.65)
        );
        const zoneColor = isSupport
          ? 'rgba(14, 203, 129, 0.09)'
          : 'rgba(246, 70, 93, 0.09)';
        const lineColor = isSupport ? '#0ecb81' : '#f6465d';

        return [
          {
            type: 'rect',
            ignoreEvent: true,
            attrs: {
              x: startX,
              y: Math.min(yTop, yBot),
              width: Math.max(0, bounding.width - startX),
              height: Math.max(3, Math.abs(yBot - yTop)),
            },
            styles: {
              style: 'fill',
              color: zoneColor,
            },
          },
          {
            type: 'line',
            ignoreEvent: true,
            attrs: {
              coordinates: [
                { x: startX, y: yCenter },
                { x: bounding.width, y: yCenter },
              ],
            },
            styles: {
              style: data.touches >= 3 ? 'solid' : 'dashed',
              size: data.touches >= 4 ? 1.75 : 1.25,
              color: lineColor,
              dashedValue: [4, 4],
            },
          },
          {
            type: 'text',
            ignoreEvent: true,
            attrs: {
              x: Math.max(10, startX + 4),
              y: yCenter - 3,
              text: `${data.label} ${formatPrice(data.centerPrice, data.pricePrecision)} (${data.touches}x)`,
              align: 'left',
              baseline: 'bottom',
            },
            styles: {
              color: lineColor,
              size: 10,
              backgroundColor: 'rgba(11, 14, 20, 0.8)',
              paddingLeft: 4,
              paddingRight: 4,
              paddingTop: 1,
              paddingBottom: 1,
              borderRadius: 2,
            },
          },
        ];
      },
    });
  }

  if (!getOverlayClass('autoTrendline')) {
    registerOverlay<TrendlineExtendData>({
      name: 'autoTrendline',
      totalStep: 3,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      createPointFigures: ({ coordinates, overlay }) => {
        if (coordinates.length < 3) return [];
        const data = overlay.extendData;
        const isUp = data?.kind !== 'downtrend';
        const color = isUp ? '#10b981' : '#fb7185';

        const pStart = coordinates[0];
        const pEnd = coordinates[2];
        const dx = pEnd.x - pStart.x;
        const dy = pEnd.y - pStart.y;
        const len = Math.hypot(dx, dy) || 1;
        const rayEnd = {
          x: pEnd.x + (dx / len) * 60,
          y: pEnd.y + (dy / len) * 60,
        };

        const midX = (pStart.x + pEnd.x) / 2;
        const midY = (pStart.y + pEnd.y) / 2;

        return [
          {
            type: 'line',
            ignoreEvent: true,
            attrs: {
              coordinates: [pStart, pEnd],
            },
            styles: {
              style: 'solid',
              size: 2,
              color,
            },
          },
          {
            type: 'line',
            ignoreEvent: true,
            attrs: {
              coordinates: [pEnd, rayEnd],
            },
            styles: {
              style: 'dashed',
              size: 1.5,
              color,
              dashedValue: [4, 4],
            },
          },
          {
            type: 'text',
            ignoreEvent: true,
            attrs: {
              x: midX,
              y: midY - 6,
              text: isUp
                ? `▲ Uptrend (${data?.touches ?? 2}x)`
                : `▼ Downtrend (${data?.touches ?? 2}x)`,
              align: 'center',
              baseline: 'bottom',
            },
            styles: {
              color,
              size: 10,
              backgroundColor: 'rgba(11, 14, 20, 0.8)',
              paddingLeft: 4,
              paddingRight: 4,
              paddingTop: 1,
              paddingBottom: 1,
              borderRadius: 2,
            },
          },
        ];
      },
    });
  }

  if (!getOverlayClass('autoFibonacci')) {
    registerOverlay<FibExtendData>({
      name: 'autoFibonacci',
      totalStep: 2,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      createPointFigures: ({ coordinates, bounding, overlay, yAxis }) => {
        const data = overlay.extendData;
        if (!data || coordinates.length < 2 || !yAxis) return [];

        const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const range = data.swingHigh.price - data.swingLow.price;
        if (range <= 0) return [];

        const startX = Math.max(0, Math.min(coordinates[0].x, coordinates[1].x));
        const endX = Math.max(startX + 40, bounding.width - 10);

        const gpTopY = yAxis.convertToPixel(data.goldenPocketHigh);
        const gpBotY = yAxis.convertToPixel(data.goldenPocketLow);

        const figures: Array<{
          type: string;
          ignoreEvent: boolean;
          attrs: unknown;
          styles?: unknown;
        }> = [
          {
            type: 'rect',
            ignoreEvent: true,
            attrs: {
              x: startX,
              y: Math.min(gpTopY, gpBotY),
              width: Math.max(0, endX - startX),
              height: Math.max(2, Math.abs(gpBotY - gpTopY)),
            },
            styles: {
              style: 'fill',
              color: 'rgba(240, 185, 11, 0.08)',
            },
          },
        ];

        for (const r of ratios) {
          const price =
            data.direction === 'bullish'
              ? data.swingHigh.price - r * range
              : data.swingLow.price + r * range;
          const y = yAxis.convertToPixel(price);
          const isKey = r === 0.5 || r === 0.618;

          figures.push({
            type: 'line',
            ignoreEvent: true,
            attrs: {
              coordinates: [
                { x: startX, y },
                { x: endX, y },
              ],
            },
            styles: {
              style: isKey ? 'solid' : 'dashed',
              size: isKey ? 1.25 : 1,
              color: isKey ? '#f0b90b' : 'rgba(148, 163, 184, 0.45)',
              dashedValue: [3, 3],
            },
          });

          figures.push({
            type: 'text',
            ignoreEvent: true,
            attrs: {
              x: endX - 4,
              y: y - 2,
              text: `${r} (${formatPrice(price, data.pricePrecision)})`,
              align: 'right',
              baseline: 'bottom',
            },
            styles: {
              color: isKey ? '#f0b90b' : '#94a3b8',
              size: 10,
              backgroundColor: 'rgba(11, 14, 20, 0.72)',
              paddingLeft: 3,
              paddingRight: 3,
              borderRadius: 2,
            },
          });
        }

        return figures;
      },
    });
  }

  if (!getOverlayClass('futuresLevelLine')) {
    registerOverlay<FuturesLineExtendData>({
      name: 'futuresLevelLine',
      totalStep: 1,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      createPointFigures: ({ coordinates, bounding, overlay, yAxis }) => {
        const data = overlay.extendData;
        if (!data || overlay.points.length === 0) return [];
        const priceVal = overlay.points[0].value ?? 0;
        const y = yAxis
          ? yAxis.convertToPixel(priceVal)
          : (coordinates[0]?.y ?? 0);

        return [
          {
            type: 'line',
            ignoreEvent: true,
            attrs: {
              coordinates: [
                { x: 0, y },
                { x: bounding.width, y },
              ],
            },
            styles: {
              style: data.dashed ? 'dashed' : 'solid',
              size: data.dashed ? 1.25 : 1.5,
              color: data.color,
              dashedValue: [5, 4],
            },
          },
          {
            type: 'text',
            ignoreEvent: true,
            attrs: {
              x: bounding.width - 8,
              y: y - 3,
              text: `${data.label} • ${data.priceText}`,
              align: 'right',
              baseline: 'bottom',
            },
            styles: {
              color: '#ffffff',
              size: 10,
              backgroundColor: data.color,
              paddingLeft: 5,
              paddingRight: 5,
              paddingTop: 2,
              paddingBottom: 2,
              borderRadius: 3,
            },
          },
        ];
      },
    });
  }
}
