// src/lib/analytics.ts
import type { StockTransaction } from "./types";

export type ProductAggregates = {
  productId: string;
  purchasedQty: number;
  purchasedAmount: number;
  soldQty: number;
  salesAmount: number;
  cogs: number; // FIFO maliyet toplamı
  profit: number; // salesAmount - cogs
};

export type RollingAverages = {
  avgPurchase30?: number;
  avgPurchase60?: number;
  avgPurchase90?: number;
  avgSale30?: number;
  avgSale60?: number;
  avgSale90?: number;
};

export type ProductAnalytics = ProductAggregates & RollingAverages;

// Hareketleri (revert olmayan) filtrele ve tarihe göre artan sırala
export function normalizeMovements(movements: StockTransaction[]): StockTransaction[] {
  return movements
    .filter(m => (m as any).action !== 'revert')
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Günlük (YYYY-MM-DD + customerId) müşteri bazlı FIFO kâr dağıtımı
export function buildDailyFifoByCustomer(
  movements: StockTransaction[]
): Record<string, { // key: `${dateKey}|${customerId}`
  dateKey: string;
  customerId: string;
  soldQty: number;
  salesAmount: number;
  cogs: number;
  profit: number;
}> {
  const sorted = normalizeMovements(movements);
  type Layer = { qty: number; unitCost: number };
  const layersByProduct = new Map<string, Layer[]>();
  const daily: Record<string, any> = {};
  const getKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  for (const m of sorted) {
    const pid = m.stockItemId;
    const d = new Date(m.date);
    const dateKey = getKey(d);
    if (m.transactionType === 'purchase') {
      // Katmana ekle
      const q = Number(m.quantityPurchased||0);
      const unit = m.unitPrice ?? (q>0 && m.amount ? m.amount/q : undefined);
      if (pid && q>0 && typeof unit === 'number' && Number.isFinite(unit)) {
        const layers = layersByProduct.get(pid) || [];
        layers.push({ qty: q, unitCost: unit });
        layersByProduct.set(pid, layers);
      }
      continue;
    }

    if (m.transactionType === 'sale' && pid) {
      const customerId = (m as any).customerId || 'unknown';
      const key = `${dateKey}|${customerId}`;
      const row = (daily[key] ||= { dateKey, customerId, soldQty:0, salesAmount:0, cogs:0, profit:0 });
      const layers = layersByProduct.get(pid) || [];
      const qOut = Number(m.quantitySold||0);
      let remaining = qOut>0 ? qOut : 0;
      let cogsForThis = 0;
      while (remaining>0 && layers.length>0) {
        const layer = layers[0];
        const take = Math.min(layer.qty, remaining);
        cogsForThis += take * layer.unitCost;
        layer.qty -= take;
        remaining -= take;
        if (layer.qty <= 0.0000001) layers.shift();
      }
      const saleAmount = typeof m.amount === 'number' ? m.amount : (m.unitPrice!=null && qOut>0 ? (m.unitPrice*qOut) : 0);
      row.soldQty += qOut>0 ? qOut : 0;
      row.salesAmount += saleAmount;
      row.cogs += cogsForThis;
      layersByProduct.set(pid, layers);
    }
  }

  Object.values(daily).forEach((r:any)=> r.profit = (r.salesAmount||0) - (r.cogs||0));
  return daily as any;
}

// FIFO: Ürün bazında katmanlı maliyet hesapla
export function computeFifoPerProduct(movements: StockTransaction[]): Record<string, ProductAggregates> {
  const sorted = normalizeMovements(movements);
  type Layer = { qty: number; unitCost: number };
  const layersByProduct = new Map<string, Layer[]>();
  const agg: Record<string, ProductAggregates> = {};

  for (const m of sorted) {
    const pid = m.stockItemId;
    if (!agg[pid]) {
      agg[pid] = { productId: pid, purchasedQty: 0, purchasedAmount: 0, soldQty: 0, salesAmount: 0, cogs: 0, profit: 0 };
    }
    const layers = layersByProduct.get(pid) || [];

    if (m.transactionType === 'purchase') {
      const qty = Number(m.quantityPurchased || 0);
      const unit = m.unitPrice ?? (qty > 0 && m.amount ? m.amount / qty : undefined);
      if (qty > 0 && typeof unit === 'number' && Number.isFinite(unit)) {
        layers.push({ qty, unitCost: unit });
        agg[pid].purchasedQty += qty;
        agg[pid].purchasedAmount += unit * qty;
      }
    } else if (m.transactionType === 'sale') {
      const qtyOut = Number(m.quantitySold || 0);
      if (qtyOut > 0) {
        let remaining = qtyOut;
        let cogsForThisSale = 0;
        while (remaining > 0 && layers.length > 0) {
          const layer = layers[0];
          const take = Math.min(layer.qty, remaining);
          cogsForThisSale += take * layer.unitCost;
          layer.qty -= take;
          remaining -= take;
          if (layer.qty <= 0.0000001) layers.shift();
        }
        // Eğer katmanlar bitti ve remaining > 0 ise, bilinmeyen maliyet: kalan kısmı 0 maliyetle varsayıyoruz.
        agg[pid].cogs += cogsForThisSale;
        agg[pid].soldQty += qtyOut;
        const saleAmount = typeof m.amount === 'number' ? m.amount : (m.unitPrice != null ? (m.unitPrice * qtyOut) : 0);
        agg[pid].salesAmount += saleAmount;
      }
    }
    layersByProduct.set(pid, layers);
  }

  for (const pid of Object.keys(agg)) {
    agg[pid].profit = agg[pid].salesAmount - agg[pid].cogs;
  }
  return agg;
}

// 30/60/90 günlük ortalama alış maliyeti ve satış fiyatı (ürün bazında)
export function computeRollingAveragesPerProduct(
  movements: StockTransaction[],
  now: Date,
  daysArray: number[] = [30, 60, 90]
): Record<string, RollingAverages> {
  const result: Record<string, RollingAverages> = {};
  const base: Record<number, { purchQty: Record<string, number>; purchAmount: Record<string, number>; saleQty: Record<string, number>; saleAmount: Record<string, number> }> = {};
  for (const d of daysArray) {
    base[d] = { purchQty: {}, purchAmount: {}, saleQty: {}, saleAmount: {} };
  }
  const filtered = normalizeMovements(movements);

  for (const m of filtered) {
    const ts = new Date(m.date).getTime();
    for (const d of daysArray) {
      const from = new Date(now.getTime() - d * 24 * 60 * 60 * 1000).getTime();
      if (ts >= from && ts <= now.getTime()) {
        const pid = m.stockItemId;
        if (m.transactionType === 'purchase') {
          const q = Number(m.quantityPurchased || 0);
          const amt = typeof m.amount === 'number' ? m.amount : (m.unitPrice != null && q > 0 ? m.unitPrice * q : 0);
          base[d].purchQty[pid] = (base[d].purchQty[pid] || 0) + q;
          base[d].purchAmount[pid] = (base[d].purchAmount[pid] || 0) + amt;
        } else if (m.transactionType === 'sale') {
          const q = Number(m.quantitySold || 0);
          const amt = typeof m.amount === 'number' ? m.amount : (m.unitPrice != null && q > 0 ? m.unitPrice * q : 0);
          base[d].saleQty[pid] = (base[d].saleQty[pid] || 0) + q;
          base[d].saleAmount[pid] = (base[d].saleAmount[pid] || 0) + amt;
        }
      }
    }
  }

  for (const pid of new Set(filtered.map(m => m.stockItemId))) {
    const entry: RollingAverages = {};
    for (const d of daysArray) {
      const pq = base[d].purchQty[pid] || 0;
      const pa = base[d].purchAmount[pid] || 0;
      const sq = base[d].saleQty[pid] || 0;
      const sa = base[d].saleAmount[pid] || 0;
      const avgPurchase = pq > 0 ? pa / pq : undefined;
      const avgSale = sq > 0 ? sa / sq : undefined;
      if (d === 30) { entry.avgPurchase30 = avgPurchase; entry.avgSale30 = avgSale; }
      if (d === 60) { entry.avgPurchase60 = avgPurchase; entry.avgSale60 = avgSale; }
      if (d === 90) { entry.avgPurchase90 = avgPurchase; entry.avgSale90 = avgSale; }
    }
    result[pid] = entry;
  }

  return result;
}

export function filterMovementsByDate(movements: StockTransaction[], fromISO?: string, toISO?: string) {
  const fromTs = fromISO ? new Date(fromISO).getTime() : -Infinity;
  const toTs = toISO ? new Date(toISO).getTime() : Infinity;
  return normalizeMovements(movements).filter(m => {
    const t = new Date(m.date).getTime();
    return t >= fromTs && t <= toTs;
  });
}

// Günlük bazda (YYYY-MM-DD + productId) FIFO COGS ve kâr dağıtımı
export function buildDailyFifoAggregates(
  movements: StockTransaction[]
): Record<string, { // key: `${dateKey}|${productId}|${currency}`
  dateKey: string;
  productId: string;
  currency: string;
  purchasedQty: number;
  purchasedAmount: number;
  soldQty: number;
  salesAmount: number;
  cogs: number;
  profit: number;
}> {
  const sorted = normalizeMovements(movements);
  type Layer = { qty: number; unitCost: number };
  const layersByProduct = new Map<string, Layer[]>();
  const daily: Record<string, any> = {};

  const getKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  for (const m of sorted) {
    const pid = m.stockItemId;
    if (!pid) continue;
    const d = new Date(m.date);
    const dateKey = getKey(d);
    const currency = (m as any).currency || 'TRY';
    const key = `${dateKey}|${pid}|${currency}`;
    const row = (daily[key] ||= { dateKey, productId: pid, currency, purchasedQty:0, purchasedAmount:0, soldQty:0, salesAmount:0, cogs:0, profit:0 });
    const layers = layersByProduct.get(pid) || [];

    if (m.transactionType === 'purchase') {
      const q = Number(m.quantityPurchased||0);
      const unit = m.unitPrice ?? (q>0 && m.amount ? m.amount/q : undefined);
      if (q>0 && typeof unit === 'number' && Number.isFinite(unit)) {
        layers.push({ qty: q, unitCost: unit });
        row.purchasedQty += q;
        row.purchasedAmount += unit * q;
      }
    } else if (m.transactionType === 'sale') {
      const qOut = Number(m.quantitySold||0);
      let remaining = qOut>0 ? qOut : 0;
      let cogsForThis = 0;
      while (remaining>0 && layers.length>0) {
        const layer = layers[0];
        const take = Math.min(layer.qty, remaining);
        cogsForThis += take * layer.unitCost;
        layer.qty -= take;
        remaining -= take;
        if (layer.qty <= 0.0000001) layers.shift();
      }
      const saleAmount = typeof m.amount === 'number' ? m.amount : (m.unitPrice!=null && qOut>0 ? (m.unitPrice*qOut) : 0);
      row.soldQty += qOut>0 ? qOut : 0;
      row.salesAmount += saleAmount;
      row.cogs += cogsForThis;
    }

    layersByProduct.set(pid, layers);
  }

  // finalize profit
  Object.values(daily).forEach((r:any)=> r.profit = (r.salesAmount||0) - (r.cogs||0));
  return daily as any;
}
