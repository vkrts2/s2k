"use client";

import React, { useState, useEffect } from 'react';
import type { Customer, Supplier, Sale, Purchase, StockItem } from '@/lib/types';
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
import { getCustomers, getSuppliers, getSales, getPurchases, getPayments, getPaymentsToSuppliers, getStockItems, getBIMonthlyTarget, setBIMonthlyTarget, getBIMarginMonthlyTarget, setBIMarginMonthlyTarget } from "@/lib/storage";
import {
  LineChart as LineChartComponent,
  BarChart as BarChartComponent
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
  const [error, setError] = useState<string | null>(null);

  // Filtreler için state
  const [dateRange, setDateRange] = useState<{start: string, end: string} | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  // Manuel aylık hedef (kullanıcı girişi)
  const [targetManual, setTargetManual] = useState<number | null>(null);
  // Kâr marjı aylık hedef (kullanıcı girişi)
  const [marginTargetManual, setMarginTargetManual] = useState<number | null>(null);
  // Değer formatlayıcılar
  const fmtCurrency = (v: number) => `₺${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})}`;
  const fmtDays = (v: number) => `${Number(v||0).toFixed(0)} gün`;
  const fmtPercent = (v: number) => `${(Number(v)||0) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`;

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
      getStockItems(user.uid)
    ]).then(async ([customers, suppliers, sales, purchases, payments, supplierPayments, stockItems]) => {
      setCustomers(customers);
      setSuppliers(suppliers);
      setSales(sales);
      setPurchases(purchases);
      setPayments(payments);
      setSupplierPayments(supplierPayments);
      setStockItems(stockItems);
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
  // Yardımcı: isim bazlı fuzzy avg maliyet bulucu
  const findAvgByFuzzyName = (avgMap: Record<string, number>, normName?: string): number => {
    if (!normName) return 0;
    let bestKey = '';
    let bestLen = 0;
    const target = normName;
    for (const k of Object.keys(avgMap)) {
      if (!k.startsWith('name:')) continue;
      const cand = k.slice(5);
      if (!cand) continue;
      const contains = target.includes(cand) || cand.includes(target);
      if (contains) {
        const score = Math.min(target.length, cand.length);
        if (score > bestLen) { bestLen = score; bestKey = k; }
      }
    }
    return bestKey ? Number(avgMap[bestKey] || 0) : 0;
  };

  // Birim dönüşüm yardımcıları
  const extractRollLengthMT = (text?: string): number | null => {
    if (!text) return null;
    const t = (''+text).toUpperCase();
    // Örn: "100 MT", "1500 MT" gibi kalıpları yakala
    const m = t.match(/(\d+[\.,]?\d*)\s*MT\b/);
    if (!m) return null;
    const v = Number(m[1].replace(',', '.'));
    return isFinite(v) && v>0 ? v : null;
  };
  const detectUnit = (explicitUnit?: string|null, productName?: string): 'MT'|'RULO'|'ADET'|'OTHER' => {
    const u = (explicitUnit || '').toString().trim().toUpperCase();
    if (u === 'MT' || u === 'M' || u === 'METRE') return 'MT';
    if (u === 'RULO' || u === 'ROLL' || u === 'TOP') return 'RULO';
    if (u === 'ADET' || u === 'PCS' || u === 'PCE') return 'ADET';
    const n = (productName||'').toUpperCase();
    if (n.includes('RULO') || n.includes('ROLL') || n.includes('TOP')) return 'RULO';
    if (n.includes(' MT')) return 'MT';
    return 'OTHER';
  };
  const toBaseQtyAndPrice = (qty: number, unitPrice?: number, unit?: string|null, productName?: string) => {
    const u = detectUnit(unit, productName);
    if (u === 'MT' || u === 'OTHER') {
      return { qtyBase: qty, unitPriceBase: unitPrice };
    }
    const rollLen = extractRollLengthMT(productName || '') || null;
    if ((u === 'RULO' || u === 'ADET') && rollLen) {
      const factor = rollLen; // 1 Rulo/ADET = rollLen MT
      const qtyBase = qty * factor;
      const unitPriceBase = unitPrice != null ? (unitPrice / factor) : undefined;
      return { qtyBase, unitPriceBase };
    }
    // Dönüşüm yapılamadı -> olduğu gibi bırak
    return { qtyBase: qty, unitPriceBase: unitPrice };
  };

  const zeroCostDiag: Array<{key:string; sid?:string; name?:string; month:string; pool?:number}> = [];
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

  // Kâr Marjı Analizi ve yardımcılar
  const monthEnd = (key:string) => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0, 23,59,59,999); };
  const getMonthKey = (d: Date) => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;

  // Ürün adı normalizasyonu ve isimden stok ID çözümleme (eşleşmeyi güçlendirmek için)
  const normalizeName = (s: string | null | undefined): string => {
    let raw = (s ?? '').toString().toLowerCase();
    // Sondaki "+N kalem" veya "kalem" ibarelerini ayıkla
    raw = raw.replace(/\+\s*\d+\s*kalem\b/gi, '');
    raw = raw.replace(/\bkalem\b/gi, '');
    // Unicode normalizasyonu + harf/rakam dışını boşluk yap + fazlalık boşlukları sadeleştir
    return raw
      .normalize('NFKD')
      .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  };
  const stockByNameRaw: Record<string, string> = Object.fromEntries(
    (stockItems || []).map(si => [ (si.name ?? '').toString().toLowerCase(), si.id ])
  );
  const stockByNameNorm: Record<string, string> = Object.fromEntries(
    (stockItems || []).map(si => [ normalizeName(si.name ?? ''), si.id ])
  );
  // ID -> İsim sözlüğü (display için)
  const stockIndex: Record<string, string> = Object.fromEntries(
    (stockItems || []).map(si => [ si.id, (si.name ?? si.id) as string ])
  );
  const resolveNameToId = (nameLike?: string | null): string | undefined => {
    if (!nameLike) return undefined;
    const raw = (nameLike || '').toString().toLowerCase();
    if (stockByNameRaw[raw]) return stockByNameRaw[raw];
    const norm = normalizeName(nameLike);
    return stockByNameNorm[norm];
  };

  // Ürün anahtarı: stok ID varsa ID öncelikli; yoksa isimden ID çöz, o da yoksa normalize isim
  const normalizeProductKey = (stockItemId?: string | null, productName?: string | null): string => {
    const sid = (stockItemId || '').toString().trim();
    if (sid) return `id:${sid}`;
    const resolved = resolveNameToId(productName || '') || undefined;
    if (resolved) return `id:${resolved}`;
    const nm = normalizeName(productName || '') || 'diğer';
    return `name:${nm}`;
  };

  // Eski ay-sonu ortalaması ve fallback temelli marj hesapları kaldırıldı.

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

  // Marj hedef/gerçekleşen hesapları ledger'dan sonra tanımlanır

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

  const displayNameFromKey = (k: string) => {
    if (k.startsWith('id:')) {
      const sid = k.slice(3);
      return stockIndex[sid] || sid;
    }
    // name:xxx
    const nm = k.slice(5);
    return nm || 'Diğer';
  };

  const salesByProduct: { [key: string]: { name: string; total: number } } = {};
  filteredSales.forEach(sale => {
    if (Array.isArray((sale as any).items) && (sale as any).items.length > 0) {
      (sale as any).items.forEach((it: any) => {
        const k = normalizeProductKey((sale as any).stockItemId || it.stockItemId, it.productName || (sale as any).description);
        const name = displayNameFromKey(k);
        const curr = salesByProduct[k] || { name, total: 0 };
        const lineTotal = Number(it.total ?? ((it.quantity ?? 0) * (it.unitPrice ?? 0))) || 0;
        curr.total += lineTotal;
        salesByProduct[k] = curr;
      });
    } else {
      const k = normalizeProductKey((sale as any).stockItemId, (sale as any).description);
      const name = displayNameFromKey(k);
      const curr = salesByProduct[k] || { name, total: 0 };
      curr.total += (sale.amount || 0);
      salesByProduct[k] = curr;
    }
  });
  const topProducts = Object.values(salesByProduct)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((item) => ({ name: item.name, total: item.total }));

  // Kârlılık için: sadece miktarı açık olan satış kalemlerini dikkate al
  const salesByProductForProfit: { [key: string]: { name: string; total: number } } = {};
  filteredSales.forEach((sale: any) => {
    if (Array.isArray(sale.items) && sale.items.length > 0) {
      sale.items.forEach((it: any) => {
        if (it.quantity == null) return; // miktar yoksa atla
        const k = normalizeProductKey(sale.stockItemId || it.stockItemId, it.productName || sale.description);
        const name = displayNameFromKey(k);
        const curr = salesByProductForProfit[k] || { name, total: 0 };
        const lineTotal = Number(it.total ?? ((it.quantity ?? 0) * (it.unitPrice ?? 0))) || 0;
        curr.total += lineTotal;
        salesByProductForProfit[k] = curr;
      });
    } else {
      if ((sale as any).quantity == null) return;
      const k = normalizeProductKey((sale as any).stockItemId, (sale as any).description);
      const name = displayNameFromKey(k);
      const curr = salesByProductForProfit[k] || { name, total: 0 };
      curr.total += (sale.amount || 0);
      salesByProductForProfit[k] = curr;
    }
  });

  // Ürün Kârlılık: Kullanıcı metoduna göre (Avg Satış − Avg Alış) × Satılan KG
  type Line = { date: Date; key: string; qty: number; unitPrice: number; customerId?: string };
  const purchaseLinesAll: Line[] = [];
  const salesLinesAll: Line[] = [];
  // Alış satırlarını normalize et
  purchases.forEach((p: any) => {
    const d = new Date(p.date);
    if (Array.isArray(p.invoiceItems) && p.invoiceItems.length > 0) {
      p.invoiceItems.forEach((it: any) => {
        const k = normalizeProductKey(p.stockItemId || it.stockItemId, it.productName || p.description || p.manualProductName);
        const rawQty = Number(it.quantity ?? 0) || 0;
        const rawUP = Number(it.unitPrice ?? 0) || 0;
        const { qtyBase, unitPriceBase } = toBaseQtyAndPrice(rawQty, rawUP, it.unit, it.productName || p.description || p.manualProductName);
        if (qtyBase !== 0 && unitPriceBase != null) purchaseLinesAll.push({ date: d, key: k, qty: qtyBase, unitPrice: unitPriceBase });
      });
    } else {
      const k = normalizeProductKey(p.stockItemId, p.description || p.manualProductName);
      const rawQty = Number((p as any).quantityPurchased ?? 0) || 0;
      const rawUP = Number((p as any).unitPrice ?? 0) || 0;
      const { qtyBase, unitPriceBase } = toBaseQtyAndPrice(rawQty, rawUP, (p as any).unit, p.description || p.manualProductName);
      if (qtyBase !== 0 && unitPriceBase != null) purchaseLinesAll.push({ date: d, key: k, qty: qtyBase, unitPrice: unitPriceBase });
    }
  });
  // Satış satırlarını normalize et
  sales.forEach((s: any) => {
    const d = new Date(s.date);
    if (Array.isArray(s.items) && s.items.length > 0) {
      s.items.forEach((it: any) => {
        if (it.quantity == null || it.unitPrice == null) return;
        const k = normalizeProductKey(s.stockItemId || it.stockItemId, it.productName || s.description);
        const rawQty = Number(it.quantity) || 0;
        const rawUP = Number(it.unitPrice) || 0;
        const { qtyBase, unitPriceBase } = toBaseQtyAndPrice(rawQty, rawUP, it.unit, it.productName || s.description);
        if (qtyBase !== 0 && unitPriceBase != null) salesLinesAll.push({ date: d, key: k, qty: qtyBase, unitPrice: unitPriceBase, customerId: s.customerId });
      });
    } else {
      if ((s as any).quantity == null || (s as any).unitPrice == null) return;
      const k = normalizeProductKey(s.stockItemId, s.description);
      const rawQty = Number(s.quantity) || 0;
      const rawUP = Number(s.unitPrice) || 0;
      const { qtyBase, unitPriceBase } = toBaseQtyAndPrice(rawQty, rawUP, (s as any).unit, s.description);
      if (qtyBase !== 0 && unitPriceBase != null) salesLinesAll.push({ date: d, key: k, qty: qtyBase, unitPrice: unitPriceBase, customerId: s.customerId });
    }
  });

  // Filtre aralığına göre satırlar
  const inRange = (d: Date) => !dateRange || (d >= new Date(dateRange.start) && d <= new Date(dateRange.end));
  const salesLines = salesLinesAll.filter(l => inRange(l.date));
  const purchaseLines = purchaseLinesAll.filter(l => inRange(l.date));

  // Ay ve ürün bazında ortalama fiyatlar
  const avgSaleByMonthProduct: Record<string, number> = {}; // key: `${mk}::${prodKey}`
  const avgPurchByMonthProduct: Record<string, number> = {};
  const soldQtyByMonthProduct: Record<string, number> = {};
  const mkOf = (d: Date) => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;

  // Satış: avg = sum(amount)/sum(qty) ; amount = qty*unitPrice
  const saleAgg: Record<string, { amt:number; qty:number }> = {};
  salesLines.forEach(l => {
    const mk = mkOf(l.date);
    const k = `${mk}::${l.key}`;
    const a = saleAgg[k] || { amt:0, qty:0 };
    a.amt += l.qty * l.unitPrice;
    a.qty += l.qty;
    saleAgg[k] = a;
    soldQtyByMonthProduct[k] = (soldQtyByMonthProduct[k] || 0) + l.qty;
  });
  Object.keys(saleAgg).forEach(k => { avgSaleByMonthProduct[k] = saleAgg[k].qty>0 ? (saleAgg[k].amt / saleAgg[k].qty) : 0; });

  // Alış: avg = sum(amount)/sum(qty)
  const purchAgg: Record<string, { amt:number; qty:number }> = {};
  purchaseLines.forEach(l => {
    const mk = mkOf(l.date);
    const k = `${mk}::${l.key}`;
    const a = purchAgg[k] || { amt:0, qty:0 };
    a.amt += l.qty * l.unitPrice;
    a.qty += l.qty;
    purchAgg[k] = a;
  });
  Object.keys(purchAgg).forEach(k => { avgPurchByMonthProduct[k] = purchAgg[k].qty>0 ? (purchAgg[k].amt / purchAgg[k].qty) : 0; });

  // Aylık marj: her ay ve ürün için (avgS-avgP)*soldQty, sonra ürünler toplamı
  const marginByMonthAcc: Record<string, number> = {};
  last12Months.forEach(mk => { marginByMonthAcc[mk] = 0; });
  Object.keys(soldQtyByMonthProduct).forEach(k => {
    const [mk] = k.split('::');
    const avgS = avgSaleByMonthProduct[k] ?? 0;
    const avgP = avgPurchByMonthProduct[k] ?? 0;
    const q = soldQtyByMonthProduct[k] || 0;
    marginByMonthAcc[mk] = (marginByMonthAcc[mk] || 0) + (avgS - avgP) * q;
  });
  const marginByMonth: {date:string, margin:number}[] = last12Months.map(mk => ({ date: mk, margin: marginByMonthAcc[mk] || 0 }));

  // Bu ay müşteri bazlı marj: satış satırlarını gez, satırın ürününün bu ayki avgS-avgP farkını qty ile çarp
  const marginByCustomerAccCurrent: Record<string, number> = {};
  salesLines
    .filter(l => mkOf(l.date) === currentMonthKey)
    .forEach(l => {
      const key = `${currentMonthKey}::${l.key}`;
      const delta = (avgSaleByMonthProduct[key] ?? 0) - (avgPurchByMonthProduct[key] ?? 0);
      const m = delta * l.qty;
      if (l.customerId) marginByCustomerAccCurrent[l.customerId] = (marginByCustomerAccCurrent[l.customerId] || 0) + m;
    });
  const marginByCustomer: {name:string, margin:number}[] = Object.entries(marginByCustomerAccCurrent)
    .map(([cid, m]) => ({ name: customers.find(c=>c.id===cid)?.name || 'Bilinmeyen', margin: m }))
    .sort((a,b)=> b.margin - a.margin)
    .slice(0,5);

  // Ürün kârlılık ligi: filtreli dönemde ürün bazında avgS, avgP ve satılan qty ile hesapla
  const saleAggByProduct: Record<string, { amt:number; qty:number; name:string }> = {};
  const purchAggByProduct: Record<string, { amt:number; qty:number; name:string }> = {};
  salesLines.forEach(l => {
    const cur = saleAggByProduct[l.key] || { amt:0, qty:0, name: displayNameFromKey(l.key) };
    cur.amt += l.qty * l.unitPrice; cur.qty += l.qty; saleAggByProduct[l.key] = cur;
  });
  purchaseLines.forEach(l => {
    const cur = purchAggByProduct[l.key] || { amt:0, qty:0, name: displayNameFromKey(l.key) };
    cur.amt += l.qty * l.unitPrice; cur.qty += l.qty; purchAggByProduct[l.key] = cur;
  });
  const allProdKeys = new Set<string>([...Object.keys(saleAggByProduct), ...Object.keys(purchAggByProduct)]);
  const costByProduct: { [key: string]: { name: string; total: number } } = {};
  const productProfitability: Array<{ name: string; sales: number; cost: number; profit: number }> = Array.from(allProdKeys).map(k => {
    const sAgg = saleAggByProduct[k];
    const pAgg = purchAggByProduct[k];
    const avgS = sAgg && sAgg.qty>0 ? (sAgg.amt / sAgg.qty) : 0;
    const avgP = pAgg && pAgg.qty>0 ? (pAgg.amt / pAgg.qty) : 0;
    const soldQty = sAgg?.qty || 0;
    const name = (sAgg?.name) || (pAgg?.name) || displayNameFromKey(k);
    const salesTotal = sAgg?.amt || 0;
    const costTotal = avgP * soldQty;
    costByProduct[k] = { name, total: costTotal };
    return { name, sales: salesTotal, cost: costTotal, profit: salesTotal - costTotal };
  }).sort((a, b) => b.profit - a.profit).slice(0, 10);

  // Marj hedef/gerçekleşen KPI'ları
  const marginByMonthMap: Record<string, number> = Object.fromEntries((marginByMonth || []).map((m: {date:string; margin:number}) => [m.date, m.margin || 0]));
  const marginActualThisMonth = marginByMonthMap[currentMonthKey] || 0;
  const marginTargetAuto = marginByMonthMap[prevMonthKey] || 0;
  const marginTargetThisMonth = marginTargetManual ?? marginTargetAuto;
  const marginDiff = marginActualThisMonth - marginTargetThisMonth;
  const marginDiffPct = marginTargetThisMonth ? (marginDiff / marginTargetThisMonth) * 100 : 0;

  // Müşteri segmentasyonu kaldırıldı
  
  // Uncosted (ilk alıştan önceki) satışlar uyarı kartı verisi – bu metodolojide hesaplanmıyor
  const uncostedSales: Array<{ name: string; qty: number; amount: number }> = [];
  const uncostedTop: Array<{ name: string; qty: number; amount: number }> = [];

  // DEBUG: Eşleşme durumu – anahtar bazında satış ve maliyetin görülmesi
  const allKeys: Set<string> = new Set<string>();
  const productMatchDebug = Array.from(allKeys).map(k => ({
    key: k,
    name: salesByProduct[k]?.name || costByProduct[k]?.name || displayNameFromKey(k),
    sales: salesByProduct[k]?.total || 0,
    cost: costByProduct[k]?.total || 0,
  })).sort((a,b)=> (b.sales - b.cost) - (a.sales - a.cost)).slice(0, 20);
  if (typeof window !== 'undefined') {
    console.log('[BI][Product Match Debug]', productMatchDebug);
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">İş Zekası</h2>
          <p className="text-muted-foreground">İşletmenizin performansını analiz edin</p>
        </div>
        <div className="flex items-center space-x-4">
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
          <Button onClick={refreshData} disabled={loading}>
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
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <Label>Tarih Aralığı</Label>
              <div className="flex gap-2">
                <Input type="date" value={dateRange?.start || ''} onChange={e => setDateRange(r => ({ start: e.target.value, end: r?.end || '' }))} />
                <Input type="date" value={dateRange?.end || ''} onChange={e => setDateRange(r => ({ start: r?.start || '', end: e.target.value }))} />
              </div>
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