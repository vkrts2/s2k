"use client";

import React, { useState, useEffect } from 'react';
import type { Customer, Supplier, Sale, Purchase, StockItem, StockTransaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Package,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Target,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import BackToHomeButton from '@/components/common/back-to-home-button';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomers, getSuppliers, getSales, getPurchases, getPayments, getPaymentsToSuppliers, getStockItems, getBIMonthlyTarget, setBIMonthlyTarget, getBIMarginMonthlyTarget, setBIMarginMonthlyTarget, getStockMovements, rebuildAnalyticsDaily, getAnalyticsDaily, rebuildAnalyticsDailyByCustomer, getAnalyticsDailyByCustomer } from "@/lib/storage";
import { computeFifoPerProduct, computeRollingAveragesPerProduct } from '@/lib/analytics';
import {
  LineChart as LineChartComponent,
  BarChart as BarChartComponent,
  MultiLineChart as MultiLineChartComponent,
} from '@/components/ui/charts';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface KPI {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}

// Basit CSV oluşturucu ve indirme
function downloadCsv(filename: string, headers: string[], rows: (string|number)[][]) {
  const headerLine = headers.join(',');
  const dataLines = rows.map(r => r.map(v => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }).join(',')).join('\n');
  const csv = headerLine + '\n' + dataLines;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

export default function BusinessIntelligencePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockTransaction[]>([]);
  const [fifoAgg, setFifoAgg] = useState<Record<string, { profit: number; salesAmount: number; cogs: number; purchasedQty: number; purchasedAmount: number; soldQty: number }>>({});
  const [rollingAvg, setRollingAvg] = useState<Record<string, { avgPurchase30?: number; avgPurchase60?: number; avgPurchase90?: number; avgSale30?: number; avgSale60?: number; avgSale90?: number }>>({});
  const [aggProfit, setAggProfit] = useState<number | null>(null);
  const [dailyProfitRows, setDailyProfitRows] = useState<Array<{ dateKey: string; profit: number }>>([]);
  const [dailyProfitCumRows, setDailyProfitCumRows] = useState<Array<{ dateKey: string; profit: number }>>([]);
  const [dailyProfitByProduct, setDailyProfitByProduct] = useState<Array<{ productId: string; name: string; profit: number }>>([]);
  const [dailyProfitByCustomer, setDailyProfitByCustomer] = useState<Array<{ customerId: string; name: string; profit: number }>>([]);
  const [dailySPP, setDailySPP] = useState<Array<{ date: string; sales: number; purchases: number; profit: number }>>([]);
  const [showSales, setShowSales] = useState<boolean>(true);
  const [showPurchases, setShowPurchases] = useState<boolean>(true);
  const [showProfit, setShowProfit] = useState<boolean>(true);
  const [show7dma, setShow7dma] = useState<boolean>(false);
  const [lastSaleTsByProduct, setLastSaleTsByProduct] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [currencyTotals, setCurrencyTotals] = useState<Record<string, { sales: number; purchases: number; profit: number }>>({});
  // ABC analizi ve stok uyarıları
  const [abcRows, setAbcRows] = useState<Array<{ productId: string; name: string; salesAmount: number; profit: number; contributionPct: number; cumulativePct: number; klass: 'A'|'B'|'C' }>>([]);
  const [lowStockRows, setLowStockRows] = useState<Array<{ productId: string; name: string; stockQty: number; avgDailySales: number; daysLeft: number }>>([]);
  // Ayarlanabilir eşikler
  const [abcACut, setAbcACut] = useState<number>(80);
  const [abcBCut, setAbcBCut] = useState<number>(95);
  const [stockDaysThreshold, setStockDaysThreshold] = useState<number>(14);
  // Müşteri kâr trendi
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [custProfitRows, setCustProfitRows] = useState<Array<{ dateKey: string; profit: number }>>([]);
  const [custProfitCumRows, setCustProfitCumRows] = useState<Array<{ dateKey: string; profit: number }>>([]);

  // Filtreler için state
  const [dateRange, setDateRange] = useState<{start: string, end: string} | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [inactiveDays, setInactiveDays] = useState<number>(60);
  // Manuel aylık hedef (kullanıcı girişi)
  const [targetManual, setTargetManual] = useState<number | null>(null);
  // Kâr marjı aylık hedef (kullanıcı girişi)
  const [marginTargetManual, setMarginTargetManual] = useState<number | null>(null);
  // Değer formatlayıcılar
  const fmtCurrency = (v: number) => `₺${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})}`;
  const fmtDays = (v: number) => `${Number(v||0).toFixed(0)} gün`;
  const fmtPercent = (v: number) => `${(Number(v)||0) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`;

  // Yardımcı: ay başlangıcı/sonu
  const monthRange = (d = new Date()) => {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getCustomers(user.uid),
      getSuppliers(user.uid),
      getSales(user.uid),
      getPurchases(user.uid),
      getPayments(user.uid),
      getPaymentsToSuppliers(user.uid),
      getStockItems(user.uid),
      getStockMovements(user.uid)
    ]).then(async ([customers, suppliers, sales, purchases, payments, supplierPayments, stockItems, stockMovements]) => {
      setCustomers(customers);
      setSuppliers(suppliers);
      setSales(sales);
      setPurchases(purchases);
      setPayments(payments);
      setSupplierPayments(supplierPayments);
      setStockItems(stockItems);
      setMovements(stockMovements);
      try {
        const d = new Date();
        const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
        const savedSales = await getBIMonthlyTarget(user.uid, key);
        if (typeof savedSales === 'number') setTargetManual(savedSales);
        const savedMargin = await getBIMarginMonthlyTarget(user.uid, key);
        if (typeof savedMargin === 'number') setMarginTargetManual(savedMargin);
      } catch {}
    }).catch((err) => {
      setError("Veriler alınırken hata oluştu.");
      toast({ title: "Hata", description: "Veriler alınırken hata oluştu.", variant: "destructive" });
    }).finally(() => setLoading(false));
  }, [user, toast]);

  // FIFO ve 30/60/90 ortalamaları hesapla (tarih aralığına göre)
  useEffect(() => {
    const now = new Date();
    const fromISO = dateRange?.start ? new Date(dateRange.start).toISOString() : undefined;
    const toISO = dateRange?.end ? new Date(dateRange.end + 'T23:59:59.999Z').toISOString() : undefined;
    const filtered = (movements || []).filter(m => {
      const t = new Date(m.date).getTime();
      const fromTs = fromISO ? new Date(fromISO).getTime() : -Infinity;
      const toTs = toISO ? new Date(toISO).getTime() : Infinity;
      return t >= fromTs && t <= toTs;
    });
    const fifoMap = computeFifoPerProduct(filtered);
    const roll = computeRollingAveragesPerProduct(filtered, now, [30,60,90]);
    // fifoMap'i sadeleştirerek state'e yaz
    const compact: Record<string, { profit: number; salesAmount: number; cogs: number; purchasedQty: number; purchasedAmount: number; soldQty: number }> = {};
    Object.entries(fifoMap).forEach(([pid, a]: any) => {
      compact[pid] = { profit: a.profit||0, salesAmount: a.salesAmount||0, cogs: a.cogs||0, purchasedQty: a.purchasedQty||0, purchasedAmount: a.purchasedAmount||0, soldQty: a.soldQty||0 };
    });
    setFifoAgg(compact);
    setRollingAvg(roll);
    // Son satış tarihlerini hesapla (global, revert hariç)
    const lastMap: Record<string, number> = {};
    (movements || []).forEach(m => {
      if (m.transactionType !== 'sale' || (m as any).action === 'revert') return;
      const t = new Date(m.date).getTime();
      const pid = m.stockItemId;
      if (!pid || !Number.isFinite(t)) return;
      if (!lastMap[pid] || t > lastMap[pid]) lastMap[pid] = t;
    });
    setLastSaleTsByProduct(lastMap);
  }, [movements, dateRange]);

  // ABC analizi (kâr katkısına göre)
  useEffect(() => {
    const totalProfit = Object.values(fifoAgg||{}).reduce((s: number, v: any)=> s + Number(v?.profit||0), 0) || 0;
    if (!totalProfit) { setAbcRows([]); return; }
    const rows = Object.entries(fifoAgg||{}).map(([pid, v]: any) => ({
      productId: pid,
      name: stockItems.find(si=>si.id===pid)?.name || pid,
      salesAmount: Number(v?.salesAmount||0),
      profit: Number(v?.profit||0),
    }))
    .sort((a,b)=> (b.profit||0) - (a.profit||0));
    let acc = 0;
    const withPct = rows.map(r => {
      const contributionPct = totalProfit ? (r.profit/totalProfit)*100 : 0;
      acc += contributionPct;
      let klass: 'A'|'B'|'C' = 'C';
      if (acc <= abcACut) klass = 'A'; else if (acc <= abcBCut) klass = 'B'; else klass = 'C';
      return { ...r, contributionPct, cumulativePct: acc, klass };
    });
    setAbcRows(withPct);
  }, [fifoAgg, stockItems, abcACut, abcBCut]);

  // Stok uyarıları: mevcut stok ve 30 günlük ortalama satışa göre tahmini bitiş
  useEffect(() => {
    const now = Date.now();
    const days30Ago = now - 30*24*60*60*1000;
    const stockQtyMap: Record<string, number> = {};
    const soldLast30Map: Record<string, number> = {};
    (movements||[]).forEach(m => {
      if ((m as any).action === 'revert') return;
      const pid = m.stockItemId; if (!pid) return;
      if (m.transactionType==='purchase') stockQtyMap[pid] = (stockQtyMap[pid]||0) + Number(m.quantityPurchased||0);
      if (m.transactionType==='sale') {
        stockQtyMap[pid] = (stockQtyMap[pid]||0) - Number(m.quantitySold||0);
        const t = new Date(m.date).getTime();
        if (t>=days30Ago) soldLast30Map[pid] = (soldLast30Map[pid]||0) + Number(m.quantitySold||0);
      }
    });
    const rows = Object.keys(stockQtyMap).map(pid => {
      const name = stockItems.find(si=>si.id===pid)?.name || pid;
      const stockQty = Number(stockQtyMap[pid]||0);
      const avgDailySales = (soldLast30Map[pid]||0) / 30;
      const daysLeft = avgDailySales>0 ? stockQty/avgDailySales : Infinity;
      return { productId: pid, name, stockQty, avgDailySales, daysLeft };
    })
    .filter(r => Number.isFinite(r.daysLeft) && r.daysLeft <= stockDaysThreshold)
    .sort((a,b)=> a.daysLeft - b.daysLeft)
    .slice(0, 20);
    setLowStockRows(rows);
  }, [movements, stockItems, stockDaysThreshold]);

  // Bu Ay Özet KPI'ları (hareketlerden)
  const { start: curStart, end: curEnd } = monthRange();
  const salesThisMonth = (movements || []).filter(m => m.transactionType==='sale' && (m as any).action !== 'revert' && new Date(m.date) >= curStart && new Date(m.date) <= curEnd);
  const purchasesThisMonth = (movements || []).filter(m => m.transactionType==='purchase' && (m as any).action !== 'revert' && new Date(m.date) >= curStart && new Date(m.date) <= curEnd);
  const soldQtyThisMonth = salesThisMonth.reduce((s, m) => s + (Number(m.quantitySold||0)), 0);
  const salesAmountThisMonth = salesThisMonth.reduce((s,m)=> s + (Number(m.amount||0)), 0);
  const purchaseAmountThisMonth = purchasesThisMonth.reduce((s,m)=> s + (Number(m.amount||0)), 0);
  const saleQtyByPidThisMonth: Record<string, number> = {};
  salesThisMonth.forEach(m => { const pid = m.stockItemId; saleQtyByPidThisMonth[pid] = (saleQtyByPidThisMonth[pid]||0) + (Number(m.quantitySold||0)); });
  const zeroSoldCountThisMonth = stockItems.filter(si => (saleQtyByPidThisMonth[si.id]||0) === 0).length;
  // FIFO bazlı bu ay en kârlı ürün
  const movementsThisMonth = (movements || []).filter(m => (m as any).action !== 'revert' && new Date(m.date) >= curStart && new Date(m.date) <= curEnd);
  const fifoMonth = computeFifoPerProduct(movementsThisMonth as any);
  const topProfitProductMonth = Object.entries(fifoMonth).sort((a:any,b:any)=> (b[1].profit||0) - (a[1].profit||0))[0];
  let totalProfitThisMonth = 0;
  for (const v of Object.values(fifoMonth as Record<string, any>)) {
    totalProfitThisMonth += Number(v?.profit || 0);
  }
  // Çoklu para birimi kartları (seçili tarih aralığına göre)
  const fromTsFilter = dateRange?.start ? new Date(dateRange.start) : undefined;
  const toTsFilter = dateRange?.end ? new Date(dateRange.end) : undefined;
  const inFilter = (dt: string) => {
    const t = new Date(dt);
    if (fromTsFilter && t < fromTsFilter) return false;
    if (toTsFilter && t > toTsFilter) return false;
    return true;
  };
  const salesByCurrency: Record<string, number> = {};
  const purchasesByCurrency: Record<string, number> = {};
  (movements||[]).forEach(m => {
    if ((m as any).action === 'revert') return;
    if (!inFilter(m.date)) return;
    const cur = (m.currency as any) || 'TRY';
    const amt = Number(m.amount||0);
    if (m.transactionType==='sale') salesByCurrency[cur] = (salesByCurrency[cur]||0) + amt;
    else if (m.transactionType==='purchase') purchasesByCurrency[cur] = (purchasesByCurrency[cur]||0) + amt;
  });

  // Filtrelenmiş veriler
  const filteredSales = sales.filter(sale => {
    const d = new Date(sale.date);
    const dateOk = !dateRange || (d >= new Date(dateRange.start) && d <= new Date(dateRange.end));
    const customerOk = !customerFilter || sale.customerId === customerFilter;
    return dateOk && customerOk;
  });
  const filteredPurchases = purchases.filter(purchase => {
    const d = new Date(purchase.date);
    const dateOk = !dateRange || (d >= new Date(dateRange.start) && d <= new Date(dateRange.end));
    const supplierOk = !supplierFilter || purchase.supplierId === supplierFilter;
    return dateOk && supplierOk;
  });

  // KPI hesaplamaları (filtreli)
  const totalSales = filteredSales.reduce((sum: number, s: Sale) => sum + (s.amount || 0), 0);
  const totalPurchases = filteredPurchases.reduce((sum: number, p: Purchase) => sum + (p.amount || 0), 0);
  const customerCount = customers.length;
  const supplierCount = suppliers.length;
  const avgSale = filteredSales.length ? totalSales / filteredSales.length : 0;
  const avgPurchase = filteredPurchases.length ? totalPurchases / filteredPurchases.length : 0;
  const profit = totalSales - totalPurchases;

  // En çok satış yapılan müşteri (erken hesapla, KPI'larda kullanılıyor)
  const salesByCustomer: {[id: string]: number} = {};

const handleSaveMarginTarget = async () => {
  try {
    if (!user) return;
    const d = new Date();
    const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
    const value = marginTargetManual ?? marginTargetAuto;
    await setBIMarginMonthlyTarget(user.uid, key, value);
    toast({ title: 'Kaydedildi', description: 'Aylık kâr marjı hedefi kaydedildi.' });
  } catch (e:any) {
    toast({ title: 'Hata', description: 'Kâr marjı hedefi kaydedilemedi.', variant: 'destructive' });
  }
};
  filteredSales.forEach(sale => {
    salesByCustomer[sale.customerId] = (salesByCustomer[sale.customerId] || 0) + (sale.amount || 0);
  });
  const topCustomers = Object.entries(salesByCustomer)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, total]) => ({
      name: customers.find(c => c.id === id)?.name || 'Bilinmeyen',
      total
    }));

  // Satış/Alış trendi için aylık agregasyonlar ve son 12 ay listesi
  // Not: Genel hedef/gerçekleşen kartları filtrelerden bağımsız olmalı → All dizileri
  const salesByMonthAll: { [key: string]: number } = {};
  sales.forEach((sale: Sale) => {
    const date = new Date(sale.date);
    const key = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}`;
    salesByMonthAll[key] = (salesByMonthAll[key] || 0) + (sale.amount || 0);
  });
  const last12Months = Array.from({length: 12}, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11-i));
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}`;
  });
  // Aktif/önceki ay anahtarları (tek kaynaklı üretim: getMonthKey)
  const nowForKeys = new Date();
  const currentMonthKey = `${nowForKeys.getFullYear()}-${(nowForKeys.getMonth()+1).toString().padStart(2,'0')}`;
  const prevForKeys = new Date(nowForKeys.getFullYear(), nowForKeys.getMonth()-1, 1);
  const prevMonthKey = `${prevForKeys.getFullYear()}-${(prevForKeys.getMonth()+1).toString().padStart(2,'0')}`;
  // Trend grafiklerinde filtreli veriyi koruyoruz
  const salesByMonthFiltered: { [key: string]: number } = {};
  filteredSales.forEach((sale: Sale) => {
    const date = new Date(sale.date);
    const key = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}`;
    salesByMonthFiltered[key] = (salesByMonthFiltered[key] || 0) + (sale.amount || 0);
  });
  const salesTrend = last12Months.map(month => ({ date: month, amount: salesByMonthFiltered[month] || 0 }));

  const purchasesByMonthAll: { [key: string]: number } = {};
  purchases.forEach((purchase: Purchase) => {
    const date = new Date(purchase.date);
    const key = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}`;
    purchasesByMonthAll[key] = (purchasesByMonthAll[key] || 0) + (purchase.amount || 0);
  });
  const purchasesByMonthFiltered: { [key: string]: number } = {};
  filteredPurchases.forEach((purchase: Purchase) => {
    const date = new Date(purchase.date);
    const key = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}`;
    purchasesByMonthFiltered[key] = (purchasesByMonthFiltered[key] || 0) + (purchase.amount || 0);
  });
  const purchasesTrend = last12Months.map(month => ({ date: month, amount: purchasesByMonthFiltered[month] || 0 }));

  // Bu ay için eksik birim fiyat / miktar içeren satış satırları (uyarı listesi)
  const invalidSalesLinesThisMonth: Array<{date:string; customer:string; product:string; quantity:any; unitPrice:any; total:number}> = [];
  (sales || []).forEach((s: Sale) => {
    const t = new Date(s.date).getTime();
    const [y, m] = currentMonthKey.split('-').map(Number);
    const start = new Date(y, m - 1, 1).getTime();
    const end = new Date(y, m, 0, 23,59,59,999).getTime();
    if (t < start || t > end) return;
    const customerName = customers.find(c=>c.id===s.customerId)?.name || 'Bilinmeyen';
    if (Array.isArray(s.items) && s.items.length>0){
      s.items.forEach((it:any) => {
        const hasQty = it.quantity!=null && it.quantity!=='';
        const hasUP = it.unitPrice!=null && it.unitPrice!=='';
        if (!hasQty || !hasUP){
          invalidSalesLinesThisMonth.push({
            date: s.date,
            customer: customerName,
            product: it.productName || s.description || '—',
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            total: Number(it.total ?? ((it.quantity && it.unitPrice) ? it.quantity*it.unitPrice : 0)) || 0,
          });
        }
      });
    } else {
      const hasQty = (s as any).quantity!=null && (s as any).quantity!=='';
      const hasUP = (s as any).unitPrice!=null && (s as any).unitPrice!=='';
      if (!hasQty || !hasUP){
        invalidSalesLinesThisMonth.push({
          date: s.date,
          customer: customerName,
          product: (s as any).description || '—',
          quantity: (s as any).quantity,
          unitPrice: (s as any).unitPrice,
          total: Number((s as any).amount)||0,
        });
      }
    }
  });
  const invalidSalesCount = invalidSalesLinesThisMonth.length;

  // Ödemeler bazlı nakit akışı agregasyonu (aylık)
  const paymentsByMonth: { [key: string]: number } = {};
  payments.forEach((p) => {
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
    paymentsByMonth[key] = (paymentsByMonth[key] || 0) + (p.amount || 0);
  });
  const supplierPaymentsByMonth: { [key: string]: number } = {};
  supplierPayments.forEach((sp) => {
    const d = new Date(sp.date);
    const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
    supplierPaymentsByMonth[key] = (supplierPaymentsByMonth[key] || 0) + (sp.amount || 0);
  });

  // Nakit Akış Projeksiyonu (Aylık, ödemeler bazlı): Son 6 ay tahsilat/ödemelerin ortalamasına göre 6 ay ileri
  const last6Months = Array.from({length: 6}, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5-i));
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
  });
  const inflowVals = last6Months.map(m => paymentsByMonth[m] || 0).filter(v => v > 0);
  const outflowVals = last6Months.map(m => supplierPaymentsByMonth[m] || 0).filter(v => v > 0);
  const inflowAvg = inflowVals.length ? inflowVals.reduce((a,b)=>a+b,0) / inflowVals.length : 0;
  const outflowAvg = outflowVals.length ? outflowVals.reduce((a,b)=>a+b,0) / outflowVals.length : 0;
  const next6Months = Array.from({length: 6}, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() + (i+1));
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
  });
  const cashProjectionMonthly = next6Months.map(label => ({ label, inflow: inflowAvg, outflow: outflowAvg, net: inflowAvg - outflowAvg }));

  // Aging (yaklaşık): müşteri bazında açık bakiye = satış - ödeme; gün farkı = son satıştan bugüne
  const paymentsByCustomer: Record<string, number> = {};
  payments.forEach(p => { paymentsByCustomer[p.customerId] = (paymentsByCustomer[p.customerId]||0) + (p.amount||0); });
  const salesByCustomerForAging: Record<string, {total:number,last:string}> = {};
  filteredSales.forEach(s => {
    const c = salesByCustomerForAging[s.customerId] || { total:0,last:s.date };
    c.total += (s.amount||0);
    if (!c.last || s.date > c.last) c.last = s.date;
    salesByCustomerForAging[s.customerId] = c;
  });
  const agingBuckets = { b0_30:0, b31_60:0, b61_90:0, b90p:0 };
  const agingDetails: Array<{customer:string, outstanding:number, days:number}> = [];
  Object.keys(salesByCustomerForAging).forEach(cid => {
    const total = salesByCustomerForAging[cid].total;
    const paid = paymentsByCustomer[cid] || 0;
    const outstanding = Math.max(0, total - paid);
    if (outstanding <= 0) return;
    const days = Math.floor((Date.now() - new Date(salesByCustomerForAging[cid].last).getTime()) / (1000*60*60*24));
    if (days<=30) agingBuckets.b0_30 += outstanding; else if (days<=60) agingBuckets.b31_60 += outstanding; else if (days<=90) agingBuckets.b61_90 += outstanding; else agingBuckets.b90p += outstanding;
    agingDetails.push({ customer: customers.find(c=>c.id===cid)?.name || 'Bilinmeyen', outstanding, days });
  });

  // Kâr Marjı Analizi (ürün bazlı): Her satış satırı için (birim satış - ort. birim maliyet) * miktar
  // Yeterli veri yoksa geri dönüş: kalan tutar için (satış - min(alış, satış)) yöntemi
  const monthEnd = (key:string) => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0, 23,59,59,999); };
  const getMonthKey = (d: Date) => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;

  // 1) Her ay sonu itibarıyla, ürün bazında ortalama maliyet (kümülatif)
  const avgCostByItemAtMonth: Record<string, Record<string, number>> = {}; // monthKey -> stockItemId -> avgCost
  const stockByName = Object.fromEntries((stockItems || []).map(si => [si.name?.toLowerCase?.() || '', si.id]));
  last12Months.forEach((mk) => {
    const end = monthEnd(mk).getTime();
    const byItem: Record<string, {qty:number; cost:number}> = {};
    purchases.forEach((p: Purchase) => {
      const t = new Date(p.date).getTime();
      if (t > end) return;
      if (Array.isArray(p.invoiceItems) && p.invoiceItems.length>0) {
        p.invoiceItems.forEach((it) => {
          const sid = p.stockItemId || (it as any).stockItemId || (it.productName ? stockByName[it.productName.toLowerCase?.() || ''] : undefined);
          const qty = it.quantity;
          const up = it.unitPrice;
          if (!sid || qty==null || up==null) return;
          byItem[sid] = byItem[sid] || { qty:0, cost:0 };
          byItem[sid].qty += Number(qty)||0;
          byItem[sid].cost += (Number(qty)||0) * (Number(up)||0);
        });
      } else {
        const sid = p.stockItemId;
        const qty = p.quantityPurchased;
        const up = p.unitPrice;
        if (!sid || qty==null || up==null) return;
        byItem[sid] = byItem[sid] || { qty:0, cost:0 };
        byItem[sid].qty += Number(qty)||0;
        byItem[sid].cost += (Number(qty)||0) * (Number(up)||0);
      }
    });
    avgCostByItemAtMonth[mk] = Object.fromEntries(Object.entries(byItem).map(([sid, agg]) => [sid, agg.qty>0 ? agg.cost/agg.qty : 0]));
  });

  // 2) Aylık marj: bilinen kalemlerden hesapla, kalanları güvenli fallback ile ekle
  const marginByMonth: {date:string, margin:number}[] = last12Months.map((mk) => {
    const end = monthEnd(mk).getTime();
    const start = new Date(Number(mk.split('-')[0]), Number(mk.split('-')[1]) - 1, 1).getTime();
    const avgCostMap = avgCostByItemAtMonth[mk] || {};

    let knownCOGS = 0; // bilinen kalemlerden hesaplanan maliyet toplamı
    let knownMargin = 0; // bilinen kalemlerden hesaplanan marj
    let unknownSales = 0; // kalemsiz/eksik verili satışların toplam tutarı

    let matchedItemCount = 0;
    let matchedSalesAmountApprox = 0;
    sales.forEach((s: Sale) => {
      const t = new Date(s.date).getTime();
      if (t < start || t > end) return;
      // Kalemli satışlar öncelikli
      if (Array.isArray(s.items) && s.items.length>0) {
        s.items.forEach((it) => {
          const sid = s.stockItemId || it.stockItemId || (it.productName ? stockByName[it.productName.toLowerCase?.() || ''] : undefined);
          const qty = it.quantity;
          const up = it.unitPrice;
          if (sid && qty!=null && up!=null) {
            const hasAvg = Object.prototype.hasOwnProperty.call(avgCostMap, sid) && Number.isFinite(avgCostMap[sid]);
            if (hasAvg) {
              const avg = Number(avgCostMap[sid]) || 0;
              knownCOGS += (Number(qty)||0) * avg;
              knownMargin += (Number(up)||0 - avg) * (Number(qty)||0);
              matchedItemCount += 1;
              matchedSalesAmountApprox += (Number(qty)||0) * (Number(up)||0);
            } else {
              // Bu ürün için henüz alış yok → kâr hesaplamasını fallback'e bırak
              unknownSales += Number(it.total ?? (it.quantity && it.unitPrice ? it.quantity * it.unitPrice : 0)) || 0;
            }
          } else {
            // kalemsiz/eksik
            unknownSales += Number(it.total ?? (it.quantity && it.unitPrice ? it.quantity * it.unitPrice : 0)) || 0;
          }
        });
      } else if (s.stockItemId && s.quantity!=null && s.unitPrice!=null) {
        const sid = s.stockItemId as string;
        const qty = Number(s.quantity)||0;
        const up = Number(s.unitPrice)||0;
        const hasAvg = Object.prototype.hasOwnProperty.call(avgCostMap, sid) && Number.isFinite(avgCostMap[sid]);
        if (hasAvg) {
          const avg = Number(avgCostMap[sid]) || 0;
          knownCOGS += qty * avg;
          knownMargin += (up - avg) * qty;
          matchedItemCount += 1;
          matchedSalesAmountApprox += qty * up;
        } else {
          // Ürünün maliyeti yok → satış tutarını fallback'e aktar
          unknownSales += qty * up;
        }
      } else {
        unknownSales += Number(s.amount)||0;
      }
    });

    // Fallback: kalan satışlar için o ayki alışın kalan kısmını COGS say
    const purchasesThisMonth = purchasesByMonthAll[mk] || 0;
    const remainingPurchasesForFallback = Math.max(0, purchasesThisMonth - knownCOGS);
    const fallbackCOGS = Math.min(remainingPurchasesForFallback, unknownSales);
    const fallbackMargin = unknownSales - fallbackCOGS;

    const totalMargin = knownMargin + fallbackMargin;

    // Sadece aktif ay için detaylı debug log yaz
    if (mk === currentMonthKey) {
      console.log('[BI][Margin Debug Detail]', {
        monthKey: mk,
        matchedItemCount,
        matchedSalesAmountApprox,
        knownCOGS,
        knownMargin,
        unknownSales,
        purchasesThisMonth,
        remainingPurchasesForFallback,
        fallbackCOGS,
        fallbackMargin,
        totalMargin,
      });
    }
    return { date: mk, margin: totalMargin };
  });
  // Bu ay için müşteri bazlı marjı, aynı ürün bazlı mantıkla hesapla
  const avgCostMapCurrent = avgCostByItemAtMonth[currentMonthKey] || {};
  const startCur = new Date(Number(currentMonthKey.split('-')[0]), Number(currentMonthKey.split('-')[1]) - 1, 1).getTime();
  const endCur = ((): number => { const [y,m]=currentMonthKey.split('-').map(Number); return new Date(y, m, 0, 23,59,59,999).getTime(); })();
  const knownMarginByCustomer: Record<string, number> = {};
  const unknownSalesByCustomer: Record<string, number> = {};
  let knownCOGSTotalThisMonth = 0;
  let unknownSalesTotalThisMonth = 0;
  sales.forEach((s: Sale) => {
    const t = new Date(s.date).getTime();
    if (t < startCur || t > endCur) return;
    const cid = s.customerId;
    if (Array.isArray(s.items) && s.items.length>0) {
      s.items.forEach((it) => {
        const sid = s.stockItemId || it.stockItemId || (it.productName ? stockByName[it.productName.toLowerCase?.() || ''] : undefined);
        const qty = it.quantity;
        const up = it.unitPrice;
        if (sid && qty!=null && up!=null && Object.prototype.hasOwnProperty.call(avgCostMapCurrent, sid) && Number.isFinite(avgCostMapCurrent[sid])) {
          const avg = Number(avgCostMapCurrent[sid]) || 0;
          knownCOGSTotalThisMonth += (Number(qty)||0) * avg;
          knownMarginByCustomer[cid] = (knownMarginByCustomer[cid]||0) + ((Number(up)||0 - avg) * (Number(qty)||0));
        } else {
          const lineTotal = Number(it.total ?? (it.quantity && it.unitPrice ? it.quantity * it.unitPrice : 0)) || 0;
          unknownSalesByCustomer[cid] = (unknownSalesByCustomer[cid]||0) + lineTotal;
          unknownSalesTotalThisMonth += lineTotal;
        }
      });
    } else if (s.stockItemId && s.quantity!=null && s.unitPrice!=null) {
      const sid = s.stockItemId as string;
      const qty = Number(s.quantity)||0;
      const up = Number(s.unitPrice)||0;
      if (Object.prototype.hasOwnProperty.call(avgCostMapCurrent, sid) && Number.isFinite(avgCostMapCurrent[sid])) {
        const avg = Number(avgCostMapCurrent[sid]) || 0;
        knownCOGSTotalThisMonth += qty * avg;
        knownMarginByCustomer[cid] = (knownMarginByCustomer[cid]||0) + ((up - avg) * qty);
      } else {
        const total = qty * up;
        unknownSalesByCustomer[cid] = (unknownSalesByCustomer[cid]||0) + total;
        unknownSalesTotalThisMonth += total;
      }
    } else {
      const amt = Number(s.amount)||0;
      unknownSalesByCustomer[cid] = (unknownSalesByCustomer[cid]||0) + amt;
      unknownSalesTotalThisMonth += amt;
    }
  });
  const purchasesThisMonthForSplit = purchasesByMonthAll[currentMonthKey] || 0;
  const remainingPurchasesForSplit = Math.max(0, purchasesThisMonthForSplit - knownCOGSTotalThisMonth);
  const fallbackCOGSForSplit = Math.min(remainingPurchasesForSplit, unknownSalesTotalThisMonth);
  const marginByCustomer: {name:string, margin:number}[] = Object.keys({ ...knownMarginByCustomer, ...unknownSalesByCustomer }).map(cid => {
    const unknownForCid = unknownSalesByCustomer[cid] || 0;
    const share = unknownSalesTotalThisMonth > 0 ? (unknownForCid / unknownSalesTotalThisMonth) : 0;
    const fallbackCOGSForCid = fallbackCOGSForSplit * share;
    const fallbackMarginForCid = unknownForCid - fallbackCOGSForCid;
    const totalMarginCid = (knownMarginByCustomer[cid] || 0) + fallbackMarginForCid;
    return { name: customers.find(c=>c.id===cid)?.name || 'Bilinmeyen', margin: totalMarginCid };
  }).sort((a,b)=>b.margin-a.margin).slice(0,5);

  // Müşteri satış listeleri (DSO hesaplaması için)
  const salesByCustomerList: Record<string, Sale[]> = {};
  filteredSales.forEach(s=>{ (salesByCustomerList[s.customerId] ||= []).push(s); });

  // Churn (kayıp) kartı kaldırıldı – hesaplama yapılmıyor

  // Hedef vs Gerçekleşen: hedef = geçen ay satışları
  // currentMonthKey ve prevMonthKey yukarıda tanımlandı
  // Ciro hedef/gerçekleşen kartı: filtrelerden bağımsız tam veri
  const actualThisMonth = salesByMonthAll[currentMonthKey] || 0;
  const targetAuto = salesByMonthAll[prevMonthKey] || 0;
  const targetThisMonth = targetManual ?? targetAuto;
  const salesDiff = actualThisMonth - targetThisMonth;
  const salesDiffPct = targetThisMonth ? (salesDiff / targetThisMonth) * 100 : 0;

  // Marj hedef/gerçekleşen hesapları
  const marginByMonthMap: Record<string, number> = Object.fromEntries((marginByMonth || []).map(m => [m.date, m.margin || 0]));
  const marginActualThisMonth = marginByMonthMap[currentMonthKey] || 0;
  const marginTargetAuto = marginByMonthMap[prevMonthKey] || 0;
  const marginTargetThisMonth = marginTargetManual ?? marginTargetAuto;
  const marginDiff = marginActualThisMonth - marginTargetThisMonth;
  const marginDiffPct = marginTargetThisMonth ? (marginDiff / marginTargetThisMonth) * 100 : 0;

  // Debug: Bu ayın ham toplamları (filtreye bağımlı değil)
  const debugSalesThisMonth = salesByMonthAll[currentMonthKey] || 0;
  const debugPurchasesThisMonth = purchasesByMonthAll[currentMonthKey] || 0;
  const debugComputedMargin = debugSalesThisMonth - Math.min(debugPurchasesThisMonth, debugSalesThisMonth);
  console.log('[BI][Kâr Marjı Debug]', {
    currentMonthKey,
    debugSalesThisMonth,
    debugPurchasesThisMonth,
    debugComputedMargin,
  });

  const handleSaveTarget = async () => {
    try {
      if (!user) return;
      const d = new Date();
      const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
      const value = targetManual ?? targetAuto;
      await setBIMonthlyTarget(user.uid, key, value);
      toast({ title: 'Kaydedildi', description: 'Aylık satış hedefi kaydedildi.' });
    } catch (e:any) {
      toast({ title: 'Hata', description: 'Hedef kaydedilemedi.', variant: 'destructive' });
    }
  };

  // Tahsilat performansı (FIFO eşleme, müşteri bazında basit)
  const paymentsByCustomerList: Record<string, any[]> = {};
  payments.forEach(p=>{ (paymentsByCustomerList[p.customerId] ||= []).push(p); });
  const dsoList: Array<{name:string, dso:number}> = [];
  Object.keys(salesByCustomerList).forEach(cid => {
    // Bağımsız çalışma kopyaları (miktarlar yeni alanlarda)
    const sList = salesByCustomerList[cid].slice().map(s=> ({ date: new Date(s.date), amt: s.amount||0 }))
      .sort((a,b)=> a.date.getTime()-b.date.getTime());
    const pList = (paymentsByCustomerList[cid]||[]).slice().map(p=> ({ date: new Date(p.date), amt: p.amount||0 }))
      .sort((a,b)=> a.date.getTime()-b.date.getTime());
    let i=0,j=0; let sumDays=0, matched=0;
    while(i<sList.length && j<pList.length){
      // sadece ödeme tarihi satış tarihinden büyük/eşit olanı eşleştir
      if (pList[j].date < sList[i].date){ j++; continue; }
      const sAmt = sList[i].amt; const pAmt = pList[j].amt;
      const minAmt = Math.min(sAmt, pAmt);
      if (minAmt<=0){ if (sAmt<=0) i++; if (pAmt<=0) j++; continue; }
      const days = Math.max(0, Math.floor((pList[j].date.getTime() - sList[i].date.getTime())/(1000*60*60*24)));
      sumDays += days * minAmt; matched += minAmt;
      sList[i].amt -= minAmt; pList[j].amt -= minAmt;
      if (sList[i].amt<=0) i++; if (pList[j].amt<=0) j++;
    }
    let dso = matched>0 ? (sumDays / matched) : 0;
    if (matched===0){
      // Fallback: Ortalama Alacak / Aylık Kredi Satışı * 30
      const totalS = sList.reduce((a,b)=>a+b.amt,0) + filteredSales.filter(s=> s.customerId===cid).reduce((a,b)=>a+(b.amount||0),0);
      const totalP = (paymentsByCustomerList[cid]||[]).reduce((a,b)=>a+(b.amount||0),0);
      const ar = Math.max(0, totalS - totalP);
      const monthsWithSales = Math.max(1, last12Months.filter(m => (salesByMonthFiltered[m]||0)>0).length);
      const monthlyCreditSales = (last12Months.reduce((a,m)=>a+(salesByMonthFiltered[m]||0),0)) / monthsWithSales;
      dso = monthlyCreditSales>0 ? (ar / monthlyCreditSales) * 30 : 0;
    }
    dsoList.push({ name: customers.find(c=>c.id===cid)?.name || 'Bilinmeyen', dso: Number(dso.toFixed(1)) });
  });
  const topDSO = dsoList.sort((a,b)=> b.dso - a.dso).slice(0,10);

  // salesByCustomer ve topCustomers yukarıda tanımlandı

  // En çok alış yapılan tedarikçi
  const purchasesBySupplier: {[id: string]: number} = {};
  filteredPurchases.forEach(purchase => {
    purchasesBySupplier[purchase.supplierId] = (purchasesBySupplier[purchase.supplierId] || 0) + (purchase.amount || 0);
  });
  const topSuppliers = Object.entries(purchasesBySupplier)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, total]) => ({
      name: suppliers.find(s => s.id === id)?.name || 'Bilinmeyen',
      total
    }));

  // salesByMonth/last12Months/purchasesByMonth/purchasesTrend yukarıda tanımlandı

  // En çok satılan ürünler (ID öncelikli)
  const stockIndex: Record<string, string> = Object.fromEntries(stockItems.map(si => [si.id, si.name]));
  const salesByProduct: {[key: string]: {name:string; total:number}} = {};
  filteredSales.forEach(sale => {
    const key = sale.stockItemId || sale.description || 'Diğer';
    const name = sale.stockItemId ? (stockIndex[sale.stockItemId] || sale.description || sale.stockItemId) : (sale.description || 'Diğer');
    const curr = salesByProduct[key] || { name, total: 0 };
    curr.total += (sale.amount || 0);
    salesByProduct[key] = curr;
  });
  const topProducts = Object.values(salesByProduct)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((item) => ({ name: item.name, total: item.total }));

  // Ürün Kârlılık: ID öncelikli eşleme (stok), yoksa açıklama/manuel adı
  const costByProduct: {[key: string]: {name:string; total:number}} = {};
  filteredPurchases.forEach(p => {
    const key = p.stockItemId || p.description || p.manualProductName || 'Diğer';
    const name = p.stockItemId ? (stockIndex[p.stockItemId] || p.description || key) : (p.description || p.manualProductName || 'Diğer');
    const curr = costByProduct[key] || { name, total: 0 };
    curr.total += (p.amount || 0);
    costByProduct[key] = curr;
  });
  const allKeys = new Set<string>([...Object.keys(salesByProduct), ...Object.keys(costByProduct)]);
  const productProfitability: Array<{name:string; sales:number; cost:number; profit:number}> = Array.from(allKeys).map(key => {
    const s = salesByProduct[key]?.total || 0;
    const c = costByProduct[key]?.total || 0;
    const name = salesByProduct[key]?.name || costByProduct[key]?.name || key;
    return { name, sales: s, cost: c, profit: s - c };
  }).sort((a,b)=> b.profit - a.profit).slice(0, 10);

  // Müşteri segmentasyonu kaldırıldı

  // Son 10 satış/alış
  const lastSales = filteredSales.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const lastPurchases = filteredPurchases.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  const refreshData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [customers, suppliers, sales, purchases] = await Promise.all([
        getCustomers(user.uid),
        getSuppliers(user.uid),
        getSales(user.uid),
        getPurchases(user.uid)
      ]);
      setCustomers(customers);
      setSuppliers(suppliers);
      setSales(sales);
      setPurchases(purchases);
      toast({ title: "Veriler Güncellendi", description: "İş zekası verileri başarıyla yenilendi." });
    } catch (err) {
      setError("Veriler alınırken hata oluştu.");
      toast({ title: "Hata", description: "Veriler alınırken hata oluştu.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">İş Zekası</h2>
          <p className="text-muted-foreground">İşletmenizin performansını analiz edin</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Haftalık</SelectItem>
              <SelectItem value="month">Aylık</SelectItem>
              <SelectItem value="quarter">Çeyreklik</SelectItem>
              <SelectItem value="year">Yıllık</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                if (!user) return;
                const fromISO = dateRange?.start ? new Date(dateRange.start).toISOString() : undefined;
                const toISO = dateRange?.end ? new Date(dateRange.end + 'T23:59:59.999Z').toISOString() : undefined;
                const n = await rebuildAnalyticsDaily(user.uid, fromISO, toISO);
                toast({ title: 'Ön-agregasyon tamamlandı', description: `${n} günlük kayıt güncellendi` });
              } catch (e:any) {
                toast({ title: 'Hata', description: 'Ön-agregasyon sırasında hata oluştu', variant: 'destructive' });
              }
            }}
          >Günlük Özetleri Güncelle</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                if (!user) return;
                const fromISO = dateRange?.start ? new Date(dateRange.start).toISOString() : undefined;
                const toISO = dateRange?.end ? new Date(dateRange.end + 'T23:59:59.999Z').toISOString() : undefined;
                const rows = await getAnalyticsDaily(user.uid, { from: fromISO, to: toISO });
                const sum = rows.reduce((s:any, r:any)=> s + Number(r?.profit||0), 0);
                const byDay: Record<string, number> = {};
                const byProduct: Record<string, number> = {};
                const byCurrency: Record<string, { sales: number; purchases: number; profit: number }> = {};
                const daySales: Record<string, number> = {};
                const dayPurch: Record<string, number> = {};
                for (const r of rows as any[]) {
                  const dk = String((r as any).dateKey);
                  byDay[dk] = (byDay[dk]||0) + Number((r as any).profit||0);
                  const pid = String((r as any).productId);
                  byProduct[pid] = (byProduct[pid]||0) + Number((r as any).profit||0);
                  const cur = String((r as any).currency || 'TRY');
                  if (!byCurrency[cur]) byCurrency[cur] = { sales: 0, purchases: 0, profit: 0 };
                  byCurrency[cur].sales += Number((r as any).salesAmount||0);
                  byCurrency[cur].purchases += Number((r as any).purchasedAmount||0);
                  byCurrency[cur].profit += Number((r as any).profit||0);
                  daySales[dk] = (daySales[dk]||0) + Number((r as any).salesAmount||0);
                  dayPurch[dk] = (dayPurch[dk]||0) + Number((r as any).purchasedAmount||0);
                }
                const series = Object.keys(byDay).sort().map(k => ({ dateKey: k, profit: byDay[k] }));
                setAggProfit(sum);
                setDailyProfitRows(series);
                // Kümülatif seri
                let acc = 0;
                const cumSeries = series.map(pt => ({ dateKey: pt.dateKey, profit: (acc += pt.profit) }));
                setDailyProfitCumRows(cumSeries);
                // Çoklu seri: Satış/Alış/Kâr
                const spp = Object.keys({ ...daySales, ...dayPurch, ...byDay }).sort().map(dk => ({
                  date: dk,
                  sales: daySales[dk]||0,
                  purchases: dayPurch[dk]||0,
                  profit: byDay[dk]||0,
                }));
                setDailySPP(spp);
                const byProdArr = Object.entries(byProduct)
                  .map(([pid, p]) => ({ productId: pid, name: stockItems.find(si=>si.id===pid)?.name || pid, profit: p as number }))
                  .sort((a,b)=> (b.profit||0) - (a.profit||0))
                  .slice(0, 20);
                setDailyProfitByProduct(byProdArr);
                setCurrencyTotals(byCurrency);
                toast({ title: 'Ön-agregasyon okundu', description: `${rows.length} satır` });
              } catch (e:any) {
                toast({ title: 'Hata', description: 'Ön-agregasyon okunamadı', variant: 'destructive' });
              }
            }}
          >Özetten Oku</Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                if (!user) return;
                const fromISO = dateRange?.start ? new Date(dateRange.start).toISOString() : undefined;
                const toISO = dateRange?.end ? new Date(dateRange.end + 'T23:59:59.999Z').toISOString() : undefined;
                const n = await rebuildAnalyticsDailyByCustomer(user.uid, fromISO, toISO);
                toast({ title: 'Müşteri özetleri güncellendi', description: `${n} günlük müşteri kaydı yazıldı` });
              } catch (e:any) {
                toast({ title: 'Hata', description: 'Müşteri özetleri oluşturulamadı', variant: 'destructive' });
              }
            }}
          >Müşteri Özetlerini Güncelle</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                if (!user) return;
                const fromISO = dateRange?.start ? new Date(dateRange.start).toISOString() : undefined;
                const toISO = dateRange?.end ? new Date(dateRange.end + 'T23:59:59.999Z').toISOString() : undefined;
                const rows = await getAnalyticsDailyByCustomer(user.uid, { from: fromISO, to: toISO });
                const byCustomer: Record<string, number> = {};
                for (const r of rows as any[]) {
                  const cid = String((r as any).customerId);
                  byCustomer[cid] = (byCustomer[cid]||0) + Number((r as any).profit||0);
                }
                const arr = Object.entries(byCustomer)
                  .map(([cid, p]) => ({ customerId: cid, name: customers.find(c=>c.id===cid)?.name || cid, profit: p as number }))
                  .sort((a,b)=> (b.profit||0) - (a.profit||0))
                  .slice(0, 20);
                setDailyProfitByCustomer(arr);
                toast({ title: 'Müşteri özetinden okundu', description: `${rows.length} satır` });
              } catch (e:any) {
                toast({ title: 'Hata', description: 'Müşteri özetinden okuma başarısız', variant: 'destructive' });
              }
            }}
          >Müşteri Özetinden Oku</Button>
          <Button size="sm" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <span>Yükleniyor...</span>
        </div>
      ) : (
        <>
          {/* Filtre arayüzü */}
          <div className="flex flex-wrap gap-4 mb-4 sticky top-16 z-10 bg-background/80 supports-[backdrop-filter]:bg-background/60 backdrop-blur p-3 rounded-md">
            <div>
              <Label>Tarih Aralığı</Label>
              <div className="flex gap-2">
                <Input type="date" value={dateRange?.start || ''} onChange={e => setDateRange(r => ({ start: e.target.value, end: r?.end || '' }))} />
                <Input type="date" value={dateRange?.end || ''} onChange={e => setDateRange(r => ({ start: r?.start || '', end: e.target.value }))} />
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const d = new Date();
                  const start = new Date(d.getFullYear(), d.getMonth(), 1);
                  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                  setDateRange({ start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) });
                }}>Bu Ay</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const d = new Date();
                  const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
                  const end = new Date(d.getFullYear(), d.getMonth(), 0);
                  setDateRange({ start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) });
                }}>Geçen Ay</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const d = new Date();
                  const start = new Date(d.getFullYear(), 0, 1);
                  const end = new Date();
                  setDateRange({ start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) });
                }}>Yılbaşından Bugüne</Button>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showSales} onChange={(e)=> setShowSales(e.target.checked)} /> Satış</label>
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showPurchases} onChange={(e)=> setShowPurchases(e.target.checked)} /> Alış</label>
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showProfit} onChange={(e)=> setShowProfit(e.target.checked)} /> Kâr</label>
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={show7dma} onChange={(e)=> setShow7dma(e.target.checked)} /> 7g Ort.</label>
              </div>
              <div className="flex flex-wrap items-end gap-4 mt-2">
                <div>
                  <Label>ABC A Eşiği (%)</Label>
                  <Input type="number" min={1} max={99} value={abcACut} onChange={(e)=> setAbcACut(Math.max(1, Math.min(99, Number(e.target.value)||0)))} />
                </div>
                <div>
                  <Label>ABC B Eşiği (%)</Label>
                  <Input type="number" min={1} max={100} value={abcBCut} onChange={(e)=> setAbcBCut(Math.max(1, Math.min(100, Number(e.target.value)||0)))} />
                </div>
                <div>
                  <Label>Kritik Stok Gün Eşiği</Label>
                  <Input type="number" min={1} max={90} value={stockDaysThreshold} onChange={(e)=> setStockDaysThreshold(Math.max(1, Math.min(90, Number(e.target.value)||0)))} />
                </div>
              </div>

          {/* Para Birimi Bazlı Kartlar (Özetten) */}
          {Object.keys(currencyTotals).length > 0 && (
            <>
            <div className="flex items-center justify-between mt-4">
              <CardTitle className="text-sm">Para Birimi Bazlı Toplamlar (Özetten)</CardTitle>
              <Button size="sm" variant="outline" onClick={() => {
                const headers = ['Para Birimi','Satış','Alış','Kâr'];
                const rows = Object.entries(currencyTotals).map(([cur, v]) => [cur, v.sales, v.purchases, v.profit]);
                downloadCsv(`para-birimi-toplamlari-${Date.now()}.csv`, headers, rows);
              }}>CSV</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(currencyTotals).map(([cur, vals]) => (
                <Card key={`cur-${cur}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Satış Toplamı ({cur})</CardTitle>
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold">{vals.sales.toLocaleString('tr-TR')}</div></CardContent>
                </Card>
              ))}
              {Object.entries(currencyTotals).map(([cur, vals]) => (
                <Card key={`cur-p-${cur}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Alış Toplamı ({cur})</CardTitle>
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold">{vals.purchases.toLocaleString('tr-TR')}</div></CardContent>
                </Card>
              ))}
              {Object.entries(currencyTotals).map(([cur, vals]) => (
                <Card key={`cur-pr-${cur}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Kâr (FIFO) ({cur})</CardTitle>
                  </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{vals.profit.toLocaleString('tr-TR')}</div></CardContent>
                </Card>
              ))}
            </div>
            </>
          )}

          {/* Günlük Kâr Trendi (Özetten) */}
          {dailyProfitRows.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Günlük Kâr Trendi (Ön-agregasyon)</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => {
                    const headers = ['Tarih','Kâr'];
                    const rows = dailyProfitRows.map(r => [r.dateKey, r.profit]);
                    downloadCsv(`gunluk-kar-${Date.now()}.csv`, headers, rows);
                  }}>CSV</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <LineChartComponent
                    data={dailyProfitRows.map(r => ({ date: r.dateKey, amount: r.profit }))}
                    xKey="date"
                    yKey="amount"
                    valueFormatter={(v)=> v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  />
                </div>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Tarih</th>
                        <th className="text-right">Kâr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyProfitRows.map(r => (
                        <tr key={r.dateKey}>
                          <td>{r.dateKey}</td>
                          <td className="text-right">{r.profit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ABC Analizi (kâr katkısı) */}
          {abcRows.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>ABC Analizi (Kâr Katkısı)</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => {
                    const headers = ['Ürün','Ciro','Kâr','Katkı %','Kümülatif %','Sınıf'];
                    const rows = abcRows.map(r => [r.name, r.salesAmount, r.profit, r.contributionPct.toFixed(2), r.cumulativePct.toFixed(2), r.klass]);
                    downloadCsv(`abc-analizi-${Date.now()}.csv`, headers, rows);
                  }}>CSV</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Ürün</th>
                        <th className="text-right">Ciro</th>
                        <th className="text-right">Kâr</th>
                        <th className="text-right">Katkı %</th>
                        <th className="text-right">Kümülatif %</th>
                        <th className="text-center">Sınıf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abcRows.map(r => (
                        <tr key={r.productId}>
                          <td>{r.name}</td>
                          <td className="text-right">{r.salesAmount.toLocaleString('tr-TR')}</td>
                          <td className="text-right">{r.profit.toLocaleString('tr-TR')}</td>
                          <td className="text-right">{r.contributionPct.toFixed(2)}%</td>
                          <td className="text-right">{r.cumulativePct.toFixed(2)}%</td>
                          <td className="text-center">{r.klass}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stok Azalanlar ve Tahmini Bitiş Günü */}
          {lowStockRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Stok Azalanlar (≤14 gün)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Ürün</th>
                        <th className="text-right">Stok</th>
                        <th className="text-right">Günlük Satış Ort.</th>
                        <th className="text-right">Kalan Gün</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockRows.map(r => (
                        <tr key={r.productId}>
                          <td>{r.name}</td>
                          <td className="text-right">{r.stockQty.toLocaleString('tr-TR')}</td>
                          <td className="text-right">{r.avgDailySales.toFixed(2)}</td>
                          <td className="text-right">{Number.isFinite(r.daysLeft) ? r.daysLeft.toFixed(1) : '∞'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Müşteri Kâr Trendi (Özetten) */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Müşteri Kâr Trendi (Ön-agregasyon)</CardTitle>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger className="w-[240px]"><SelectValue placeholder="Müşteri seçin" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={async ()=>{
                  try{
                    if (!user || !selectedCustomerId) return;
                    const fromISO = dateRange?.start ? new Date(dateRange.start).toISOString() : undefined;
                    const toISO = dateRange?.end ? new Date(dateRange.end + 'T23:59:59.999Z').toISOString() : undefined;
                    const rows = await getAnalyticsDailyByCustomer(user.uid, { from: fromISO, to: toISO, customerId: selectedCustomerId });
                    const byDay: Record<string, number> = {};
                    for (const r of rows as any[]) {
                      const dk = String((r as any).dateKey);
                      byDay[dk] = (byDay[dk]||0) + Number((r as any).profit||0);
                    }
                    const series = Object.keys(byDay).sort().map(k => ({ dateKey: k, profit: byDay[k] }));
                    setCustProfitRows(series);
                    let acc = 0; setCustProfitCumRows(series.map(pt => ({ dateKey: pt.dateKey, profit: (acc+=pt.profit) })));
                    toast({ title: 'Müşteri kâr trendi yüklendi', description: `${rows.length} satır` });
                  }catch(e:any){
                    toast({ title: 'Hata', description: 'Müşteri kâr trendi okunamadı', variant: 'destructive' });
                  }
                }}>Oku</Button>
              </div>
            </CardHeader>
            <CardContent>
              {custProfitRows.length>0 && (
                <div className="mb-4">
                  <LineChartComponent
                    data={custProfitRows.map(r => ({ date: r.dateKey, amount: r.profit }))}
                    xKey="date"
                    yKey="amount"
                    valueFormatter={(v)=> v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  />
                </div>
              )}
              {custProfitCumRows.length>0 && (
                <div className="mb-2">
                  <LineChartComponent
                    data={custProfitCumRows.map(r => ({ date: r.dateKey, amount: r.profit }))}
                    xKey="date"
                    yKey="amount"
                    valueFormatter={(v)=> v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Eksik veri uyarı banner'ı */}
          {invalidSalesCount>0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Eksik Satış Satırları Uyarısı</CardTitle>
                  <Button size="sm" variant="destructive" onClick={()=>{
                    const headers = ['Tarih','Müşteri','Ürün','Miktar','Birim Fiyat','Toplam'];
                    const rows = invalidSalesLinesThisMonth.map(r => [r.date, r.customer, r.product, r.quantity ?? '', r.unitPrice ?? '', r.total]);
                    downloadCsv(`eksik-satis-satirlari-${Date.now()}.csv`, headers, rows);
                  }}>CSV</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-red-600 text-sm">
                  Bu ayda {invalidSalesCount} adet satış satırında eksik birim fiyat veya miktar var. Lütfen ilgili kayıtları tamamlayın.
                </div>
              </CardContent>
            </Card>
          )}

          {dailyProfitCumRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Kümülatif Kâr Trendi (Ön-agregasyon)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <LineChartComponent
                    data={dailyProfitCumRows.map(r => ({ date: r.dateKey, amount: r.profit }))}
                    xKey="date"
                    yKey="amount"
                    valueFormatter={(v)=> v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {dailyProfitByProduct.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>En Kârlı Ürünler (Ön-agregasyon, filtre)</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => {
                    const headers = ['Ürün','Kâr'];
                    const rows = dailyProfitByProduct.map(r => [r.name, r.profit]);
                    downloadCsv(`en-karlı-urunler-${Date.now()}.csv`, headers, rows);
                  }}>CSV</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Ürün</th>
                        <th className="text-right">Kâr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyProfitByProduct.map(r => (
                        <tr key={r.productId}>
                          <td>{r.name}</td>
                          <td className="text-right">{r.profit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {dailyProfitByCustomer.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>En Kârlı Müşteriler (Ön-agregasyon, filtre)</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => {
                    const headers = ['Müşteri','Kâr'];
                    const rows = dailyProfitByCustomer.map(r => [r.name, r.profit]);
                    downloadCsv(`en-karlı-musteriler-${Date.now()}.csv`, headers, rows);
                  }}>CSV</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Müşteri</th>
                        <th className="text-right">Kâr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyProfitByCustomer.map(r => (
                        <tr key={r.customerId}>
                          <td>{r.name}</td>
                          <td className="text-right">{r.profit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const end = new Date(); const start = new Date(end.getTime() - 29*24*60*60*1000);
                  setDateRange({ start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) });
                }}>Son 30 Gün</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const end = new Date(); const start = new Date(end.getTime() - 59*24*60*60*1000);
                  setDateRange({ start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) });
                }}>Son 60 Gün</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const end = new Date(); const start = new Date(end.getTime() - 89*24*60*60*1000);
                  setDateRange({ start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) });
                }}>Son 90 Gün</Button>
              </div>

          {/* Stok Devir Hızı ve Ortalama Stokta Kalma Süresi (DOH) */}
          <Card>
            <CardHeader>
              <CardTitle>Stok Devir Hızı ve Stokta Kalma (gün)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">Ürün</th>
                      <th className="text-right">Başlangıç Stok (tahmini)</th>
                      <th className="text-right">Bitiş Stok</th>
                      <th className="text-right">Satılan</th>
                      <th className="text-right">Devir Hızı</th>
                      <th className="text-right">Stokta Kalma (gün)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const start = dateRange?.start ? new Date(dateRange.start) : new Date(new Date().getTime() - 90*24*60*60*1000);
                      const end = dateRange?.end ? new Date(dateRange.end) : new Date();
                      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime())/(1000*60*60*24)));
                      const rows = stockItems.map(si => {
                        const id = si.id;
                        const endStock = Number(si.currentStock||0);
                        const sold = Number(fifoAgg[id]?.soldQty||0);
                        const purch = Number(fifoAgg[id]?.purchasedQty||0);
                        const beginStock = Math.max(0, endStock - purch + sold);
                        const avgStock = Math.max(0, (beginStock + endStock)/2);
                        const turnover = avgStock>0 ? (sold/avgStock) : 0;
                        const dailySales = sold>0 ? (sold/days) : 0;
                        const doh = (dailySales>0) ? (avgStock / dailySales) : undefined;
                        return { id, name: si.name, beginStock, endStock, sold, turnover, doh };
                      });
                      return rows
                        .sort((a,b)=> (b.turnover||0) - (a.turnover||0))
                        .slice(0, 20)
                        .map(r => (
                          <tr key={r.id}>
                            <td>{r.name}</td>
                            <td className="text-right">{r.beginStock.toLocaleString('tr-TR')}</td>
                            <td className="text-right">{r.endStock.toLocaleString('tr-TR')}</td>
                            <td className="text-right">{r.sold.toLocaleString('tr-TR')}</td>
                            <td className="text-right">{(r.turnover||0).toFixed(2)}</td>
                            <td className="text-right">{r.doh!=null ? r.doh.toFixed(1) : '-'}</td>
                          </tr>
                        ));
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
            </div>
            <div>
              <Label>Müşteri</Label>
              <select className="border rounded px-2 py-1" value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}>
                <option value="">Tümü</option>
                {customers.map((c: Customer) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Tedarikçi</Label>
              <select className="border rounded px-2 py-1" value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
                <option value="">Tümü</option>
                {suppliers.map((s: Supplier) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* KPI Kartları */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Satış</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">₺{totalSales.toLocaleString()}</div></CardContent>
            </Card>

          {/* Bu Ay Özet ve Hareketsiz / En hızlı tükenen */}
          {/* Bu Ay Özet (Ciro / Alış / Kâr) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bu Ay Ciro (Satış)</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{salesAmountThisMonth.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bu Ay Alış</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{purchaseAmountThisMonth.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bu Ay Kâr (FIFO)</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalProfitThisMonth.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div></CardContent>
            </Card>
            {aggProfit!=null && (
              <Card className="md:col-span-2 lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ön-agregasyondan Kâr (Filtre)</CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{aggProfit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div></CardContent>
              </Card>
            )}
          </div>

          {/* Hareketsiz ürünler ve en hızlı tükenen ürünler */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Hareketsiz Ürünler (Son X günde satılmayanlar)</CardTitle>
                  <div className="flex items-center gap-2 text-sm">
                    <span>Eşik (gün):</span>
                    <Input type="number" className="h-8 w-20" value={inactiveDays}
                      onChange={(e)=> setInactiveDays(Math.max(0, Number(e.target.value||0)))} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Ürün</th>
                        <th className="text-right">Son Satış (gün önce)</th>
                        <th className="text-right">Alınan (adet)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const nowTs = Date.now();
                        const thresholdMs = inactiveDays * 24 * 60 * 60 * 1000;
                        return stockItems
                          .filter(si => {
                            const lastTs = lastSaleTsByProduct[si.id];
                            if (!lastTs) return true;
                            return (nowTs - lastTs) >= thresholdMs;
                          })
                          .slice(0, 20)
                          .map(si => {
                            const lastTs = lastSaleTsByProduct[si.id];
                            const daysAgo = lastTs ? Math.floor((nowTs - lastTs)/(1000*60*60*24)) : undefined;
                            return (
                              <tr key={si.id}>
                                <td>{si.name}</td>
                                <td className="text-right">{daysAgo!=null ? daysAgo : '—'}</td>
                                <td className="text-right">{(fifoAgg[si.id]?.purchasedQty || 0).toLocaleString('tr-TR')}</td>
                              </tr>
                            );
                          });
                      })()}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>En Hızlı Tükenen Ürünler (Adet)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Ürün</th>
                        <th className="text-right">Satılan (adet)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(fifoAgg)
                        .sort((a:any,b:any)=> (b[1].soldQty||0) - (a[1].soldQty||0))
                        .slice(0, 20)
                        .map(([pid, v]: any) => (
                          <tr key={pid}>
                            <td>{stockItems.find(si=>si.id===pid)?.name || pid}</td>
                            <td className="text-right">{(v.soldQty||0).toLocaleString('tr-TR')}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Alış</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">₺{totalPurchases.toLocaleString()}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Müşteri Sayısı</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{customerCount}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tedarikçi Sayısı</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{supplierCount}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ortalama Satış</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">₺{avgSale.toLocaleString(undefined, {maximumFractionDigits:2})}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ortalama Alış</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">₺{avgPurchase.toLocaleString(undefined, {maximumFractionDigits:2})}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eksik Birim/Adet Satır</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${invalidSalesCount>0? 'text-red-600':'text-green-600'}`}>{invalidSalesCount}</div>
                <div className="text-xs text-muted-foreground">Bu ay birim fiyat veya miktarı eksik olan satış satırı</div>
              </CardContent>
            </Card>
          </div>

          {/* Trend ve listeler */}
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <div><h3 className="font-semibold mb-2">Satış Trendi (Son 12 Ay)</h3><LineChartComponent data={salesTrend} valueFormatter={fmtCurrency} /></div>
            <div><h3 className="font-semibold mb-2">Alış Trendi (Son 12 Ay)</h3><LineChartComponent data={purchasesTrend} valueFormatter={fmtCurrency} /></div>
            <div><h3 className="font-semibold mb-2">En Çok Satılan Ürünler</h3><BarChartComponent data={topProducts.map(p => ({ category: p.name, count: p.total }))} valueFormatter={fmtCurrency} /></div>
          </div>

          {/* Nakit Akış Projeksiyonu (6 Ay) */}
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <Card>
              <CardHeader><CardTitle>Nakit Akış Projeksiyonu (6 Ay)</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-3">
                  <LineChartComponent data={cashProjectionMonthly.map(m => ({ date: m.label, amount: m.net }))} valueFormatter={fmtCurrency} />
                </div>
                <table className="w-full text-xs border">
                  <thead><tr><th>Ay</th><th>Giriş</th><th>Çıkış</th><th>Net</th></tr></thead>
                  <tbody>
                    {cashProjectionMonthly.map((m,idx)=> (
                      <tr key={idx} className="border-t"><td>{m.label}</td><td>₺{Math.round(m.inflow).toLocaleString()}</td><td>₺{Math.round(m.outflow).toLocaleString()}</td><td>₺{Math.round(m.net).toLocaleString()}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-muted-foreground text-[10px] mt-2">Not: Vade verisi yoksa son 6 ayın ortalaması ile tahmin edilir.</div>
              </CardContent>
            </Card>

            {/* Aging Özeti */}
            <Card>
              <CardHeader><CardTitle>Geciken Alacaklar (Aging) Özeti</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-3">
                  <BarChartComponent data={[
                    { category: '0–30', count: agingBuckets.b0_30 },
                    { category: '31–60', count: agingBuckets.b31_60 },
                    { category: '61–90', count: agingBuckets.b61_90 },
                    { category: '90+', count: agingBuckets.b90p },
                  ]} valueFormatter={fmtCurrency} />
                </div>
                <table className="w-full text-xs border">
                  <thead><tr><th>0–30</th><th>31–60</th><th>61–90</th><th>90+</th></tr></thead>
                  <tbody><tr className="border-t"><td>₺{agingBuckets.b0_30.toLocaleString()}</td><td>₺{agingBuckets.b31_60.toLocaleString()}</td><td>₺{agingBuckets.b61_90.toLocaleString()}</td><td>₺{agingBuckets.b90p.toLocaleString()}</td></tr></tbody>
                </table>
                <div className="mt-3 max-h-40 overflow-auto">
                  <table className="w-full text-xs border">
                    <thead><tr><th>Müşteri</th><th>Gecikme (gün)</th><th>Tutar</th></tr></thead>
                    <tbody>
                      {agingDetails.sort((a,b)=> b.days-a.days).slice(0,10).map((r,idx)=> (
                        <tr key={idx} className="border-t"><td>{r.customer}</td><td>{r.days}</td><td>₺{r.outstanding.toLocaleString()}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Kâr Marjı Analizi ve Hedef vs Gerçekleşen */}
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <Card>
              <CardHeader><CardTitle>Kâr Marjı Analizi (Aylık)</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-3">
                  <LineChartComponent data={marginByMonth.map(m => ({ date: m.date, amount: m.margin }))} valueFormatter={fmtCurrency} />
                </div>
                <table className="w-full text-xs border">
                  <thead><tr><th>Ay</th><th>Marj</th></tr></thead>
                  <tbody>{marginByMonth.map(m=> (<tr key={m.date} className="border-t"><td>{m.date}</td><td>₺{(m.margin||0).toLocaleString()}</td></tr>))}</tbody>
                </table>
                <div className="mt-3">
                  <h4 className="font-semibold mb-1 text-sm">En Yüksek Marjlı 5 Müşteri</h4>
                  <div className="mb-2">
                    <BarChartComponent data={marginByCustomer.map(m => ({ category: m.name, count: m.margin }))} valueFormatter={fmtCurrency} />
                  </div>
                  <table className="w-full text-xs border"><tbody>
                    {marginByCustomer.map((m,idx)=> (<tr key={idx} className="border-t"><td>{m.name}</td><td>₺{m.margin.toLocaleString()}</td></tr>))}
                  </tbody></table>
                </div>
              </CardContent>
            </Card>

            {/* Sağ kolon: Ciro Hedef vs Gerçekleşen + altında Marj Hedef vs Gerçekleşen */}
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader><CardTitle>Hedef vs Gerçekleşen (Bu Ay)</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-6 text-sm">
                    <div>Hedef: <span className="font-semibold">₺{targetThisMonth.toLocaleString()}</span></div>
                    <div>Gerçekleşen: <span className="font-semibold">₺{actualThisMonth.toLocaleString()}</span></div>
                    <div>Fark: <span className={actualThisMonth>=targetThisMonth? 'text-green-600 font-semibold':'text-red-600 font-semibold'}>₺{(actualThisMonth-targetThisMonth).toLocaleString()} ({fmtPercent(salesDiffPct)})</span></div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Label className="text-xs">Aylık Hedef (₺)</Label>
                    <Input type="number" className="h-8 w-48" value={targetManual ?? ''} placeholder={targetAuto.toString()} onChange={(e)=> {
                      const v = e.target.value;
                      setTargetManual(v === '' ? null : Number(v));
                    }} />
                    {targetManual !== null && (
                      <Button variant="secondary" className="h-8" onClick={()=> setTargetManual(null)}>Otomatik (Geçen Ay)</Button>
                    )}
                    <Button className="h-8" onClick={handleSaveTarget}>Kaydet</Button>
                  </div>
                  <div className="mt-3">
                    <BarChartComponent data={[{ category: 'Hedef', count: targetThisMonth }, { category: 'Gerçekleşen', count: actualThisMonth }]} valueFormatter={fmtCurrency} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Kâr Marjı Hedef vs Gerçekleşen (Bu Ay)</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-6 text-sm">
                    <div>Hedef: <span className="font-semibold">₺{marginTargetThisMonth.toLocaleString()}</span></div>
                    <div>Gerçekleşen: <span className="font-semibold">₺{marginActualThisMonth.toLocaleString()}</span></div>
                    <div>Fark: <span className={marginActualThisMonth>=marginTargetThisMonth? 'text-green-600 font-semibold':'text-red-600 font-semibold'}>₺{(marginActualThisMonth-marginTargetThisMonth).toLocaleString()} ({fmtPercent(marginDiffPct)})</span></div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Label className="text-xs">Aylık Kâr Hedefi (₺)</Label>
                    <Input type="number" className="h-8 w-48" value={marginTargetManual ?? ''} placeholder={marginTargetAuto.toString()} onChange={(e)=> {
                      const v = e.target.value;
                      setMarginTargetManual(v === '' ? null : Number(v));
                    }} />
                    {marginTargetManual !== null && (
                      <Button variant="secondary" className="h-8" onClick={()=> setMarginTargetManual(null)}>Otomatik (Geçen Ay)</Button>
                    )}
                    <Button className="h-8" onClick={handleSaveMarginTarget}>Kaydet</Button>
                  </div>
                  <div className="mt-3">
                    <BarChartComponent data={[{ category: 'Hedef', count: marginTargetThisMonth }, { category: 'Gerçekleşen', count: marginActualThisMonth }]} valueFormatter={fmtCurrency} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* LTV/RFM bölümü kaldırıldı */}

          {/* Tahsilat Performansı ve Ürün Kârlılık Ligi */}
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <Card>
              <CardHeader><CardTitle>Tahsilat Performansı (DSO - Gün)</CardTitle></CardHeader>
              <CardContent>
                <div className="text-[11px] text-muted-foreground mb-2">DSO: Tahsilat Süresi. Faturalardan ödemeye kadar geçen ortalama gün.</div>
                <div className="mb-3">
                  <BarChartComponent data={topDSO.map(d => ({ category: d.name, count: d.dso }))} valueFormatter={fmtDays} />
                </div>
                <table className="w-full text-xs border">
                  <thead><tr><th>Müşteri</th><th>DSO</th></tr></thead>
                  <tbody>
                    {topDSO.map((d,idx)=> (<tr key={idx} className="border-t"><td>{d.name}</td><td>{d.dso}</td></tr>))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Ürün Kârlılık Ligi (Satış - Maliyet)</CardTitle></CardHeader>
              <CardContent>
                <div className="text-[11px] text-muted-foreground mb-2">Not: Eşleşme stok ürünü ID (varsa) üzerinden yapılır; yoksa açıklama/manuel ürün adı kullanılır.</div>
                <div className="mb-3">
                  <BarChartComponent data={productProfitability.map(p => ({ category: p.name, count: p.profit }))} valueFormatter={fmtCurrency} />
                </div>
                <table className="w-full text-xs border">
                  <thead><tr><th>Ürün</th><th>Satış</th><th>Maliyet</th><th>Kâr</th></tr></thead>
                  <tbody>
                    {productProfitability.map((p,idx)=> (
                      <tr key={idx} className="border-t"><td>{p.name}</td><td>₺{p.sales.toLocaleString()}</td><td>₺{p.cost.toLocaleString()}</td><td>₺{p.profit.toLocaleString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Karşılaştırmalı Analiz */}
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <Card><CardHeader><CardTitle>Bu Ay vs Geçen Ay Satış</CardTitle></CardHeader><CardContent>
              <div className="flex flex-col gap-2">
                <div>Bu Ay: ₺{salesTrend[11]?.amount?.toLocaleString() || 0}</div>
                <div>Geçen Ay: ₺{salesTrend[10]?.amount?.toLocaleString() || 0}</div>
                <div>Değişim: <span className={salesTrend[11]?.amount > salesTrend[10]?.amount ? 'text-green-600' : 'text-red-600'}>{((salesTrend[11]?.amount - salesTrend[10]?.amount) / (salesTrend[10]?.amount || 1) * 100).toFixed(2)}%</span></div>
              </div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Bu Ay vs Geçen Ay Alış</CardTitle></CardHeader><CardContent>
              <div className="flex flex-col gap-2">
                <div>Bu Ay: ₺{purchasesTrend[11]?.amount?.toLocaleString() || 0}</div>
                <div>Geçen Ay: ₺{purchasesTrend[10]?.amount?.toLocaleString() || 0}</div>
                <div>Değişim: <span className={purchasesTrend[11]?.amount > purchasesTrend[10]?.amount ? 'text-green-600' : 'text-red-600'}>{((purchasesTrend[11]?.amount - purchasesTrend[10]?.amount) / (purchasesTrend[10]?.amount || 1) * 100).toFixed(2)}%</span></div>
              </div>
            </CardContent></Card>
          </div>

          {/* Son 10 Satış ve Alış Tablosu */}
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <div>
              <h3 className="font-semibold mb-2">Son 10 Satış</h3>
              <table className="w-full text-xs border">
                <thead><tr><th>Tarih</th><th>Müşteri</th><th>Açıklama</th><th>Tutar</th></tr></thead>
                <tbody>
                  {lastSales.map(sale => (
                    <tr key={sale.id} className="border-t">
                      <td>{format(new Date(sale.date), 'yyyy-MM-dd')}</td>
                      <td>{customers.find(c => c.id === sale.customerId)?.name || '-'}</td>
                      <td>{sale.description}</td>
                      <td>₺{sale.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Son 10 Alış</h3>
              <table className="w-full text-xs border">
                <thead><tr><th>Tarih</th><th>Tedarikçi</th><th>Açıklama</th><th>Tutar</th></tr></thead>
                <tbody>
                  {lastPurchases.map(purchase => (
                    <tr key={purchase.id} className="border-t">
                      <td>{format(new Date(purchase.date), 'yyyy-MM-dd')}</td>
                      <td>{suppliers.find(s => s.id === purchase.supplierId)?.name || '-'}</td>
                      <td>{purchase.description}</td>
                      <td>₺{purchase.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* En Çok Satış Yapılan İlk 5 Müşteri ve Tedarikçi */}
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <div>
              <h3 className="font-semibold mb-2">En Çok Satış Yapılan İlk 5 Müşteri</h3>
              <table className="w-full text-xs border">
                <thead><tr><th>Müşteri</th><th>Toplam Satış</th></tr></thead>
                <tbody>
                  {topCustomers.map(c => (
                    <tr key={c.name} className="border-t">
                      <td>{c.name}</td>
                      <td>₺{c.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="font-semibold mb-2">En Çok Alış Yapılan İlk 5 Tedarikçi</h3>
              <table className="w-full text-xs border">
                <thead><tr><th>Tedarikçi</th><th>Toplam Alış</th></tr></thead>
                <tbody>
                  {topSuppliers.map(s => (
                    <tr key={s.name} className="border-t">
                      <td>{s.name}</td>
                      <td>₺{s.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 