# DeltaDesk — Pure Charting Crypto Terminal

เว็บแอปพลิเคชันกราฟราคาคริปโตเคอร์เรนซีแบบ Real-time เน้นความเร็วและความลื่นไหลระดับ 60fps

## ฟีเจอร์หลัก
- **กราฟเทคนิคอลความเร็วสูง (`KlineCharts` v10):** แท่งเทียน Real-time จาก Binance WebSocket, โหลดข้อมูลย้อนหลังอัตโนมัติเมื่อเลื่อนกราฟไปทางซ้าย, รองรับ Timeframe `1m` – `1W`, รูปแบบกราฟ (Solid, Hollow, OHLC, Area) และบันทึกรูปภาพเป็น PNG
- **เครื่องมือตีเส้นครบชุด (Drawing Tools):** Trend Line, Ray, Extended Line, Horizontal/Vertical Line, Price Line, Parallel/Price Channel, Fibonacci Retracement, Text Note พร้อมโหมดแม่เหล็ก (Magnet), ล็อกเส้น, ซ่อนเส้น และบันทึกเส้นลง `localStorage` แยกตามเหรียญ
- **Auto Technical Analysis Suite (ฟรี 100%):** ระบบคำนวณเชิงปริมาณและตีเส้นอัตโนมัติ ได้แก่ Auto Support & Resistance (โซน Supply/Demand), Auto Trendlines และ Auto Fibonacci (+ Golden Pocket) ปรับความไวได้ 3 ระดับ (`Short / Medium / Long`)
- **Futures Paper Trading Simulator:** ระบบทดสอบเทรด USDⓈ-M Perpetual Futures เงินจำลอง (`10,000 USDT`), ปรับ `Isolated / Cross` และ Leverage `1x–125x`, รองรับ `Market / Limit`, ตั้งและแก้ไข `TP / SL`, แสดงเส้นสถานะบนกราฟอัตโนมัติ, คำนวณ `uPnL / ROE% / Liquidation Price / Fees` และเก็บประวัติเทรดพร้อม Win Rate
- **Technical Indicators:** จัดการ Indicators ทั้งแบบซ้อนบนกราฟหลัก (EMA, MA, BOLL, SAR) และหน้าต่างแยกด้านล่าง (VOL, RSI, MACD, KDJ, WR, CCI, ATR, OBV) พร้อมแก้ไขพารามิเตอร์ได้
- **เมนูค้นหาเหรียญ & ติดดาว:** สลับดู 20 คู่เหรียญยอดนิยมจากแถบด้านบนได้ทันที

## Tech Stack
- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Charting Engine:** KlineCharts v10
- **Styling:** Tailwind CSS v3 + Lucide Icons
- **State Management:** Zustand (Atomic Selectors)

## วิธีรันโปรเจกต์
```bash
npm install
npm run dev
```
จากนั้นเปิดเบราว์เซอร์ไปที่ `http://localhost:3000`
