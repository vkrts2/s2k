"use client";

import React, { useState, useEffect } from 'react';
import type { Customer, Supplier, Sale, Purchase } from '@/lib/types';
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
import { getCustomers, getSuppliers, getSales, getPurchases } from "@/lib/storage";
import {
  LineChart as LineChartComponent,
  BarChart as BarChartComponent,
  PieChart as PieChartComponent
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
  const [error, setError] = useState<string | null>(null);

  // Filtreler için state
  const [dateRange, setDateRange] = useState<{start: string, end: string} | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getCustomers(user.uid),
      getSuppliers(user.uid),
      getSales(user.uid),
      getPurchases(user.uid)
    ]).then(([customers, suppliers, sales, purchases]) => {
      setCustomers(customers);
      setSuppliers(suppliers);
      setSales(sales);
      setPurchases(purchases);
    }).catch((err) => {
      setError("Veriler alınırken hata oluştu.");
      toast({ title: "Hata", description: "Veriler alınırken hata oluştu.", variant: "destructive" });
    }).finally(() => setLoading(false));
  }, [user, toast]);

  // Filtrelenmiş veriler
  const filteredSales = sales.filter(sale => {
    const dateOk = !dateRange || (sale.date >= dateRange.start && sale.date <= dateRange.end);
    const customerOk = !customerFilter || sale.customerId === customerFilter;
    return dateOk && customerOk;
  });
  const filteredPurchases = purchases.filter(purchase => {
    const dateOk = !dateRange || (purchase.date >= dateRange.start && purchase.date <= dateRange.end);
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

  // En çok satış yapılan müşteri
  const salesByCustomer: {[id: string]: number} = {};
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

  // Satış trendi (son 12 ay)
  const salesByMonth: { [key: string]: number } = {};
  filteredSales.forEach((sale: Sale) => {
    const date = new Date(sale.date);
    const key = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}`;
    salesByMonth[key] = (salesByMonth[key] || 0) + (sale.amount || 0);
  });
  const last12Months = Array.from({length: 12}, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11-i));
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}`;
  });
  const salesTrend = last12Months.map(month => ({ date: month, amount: salesByMonth[month] || 0 }));

  // Alış trendi (son 12 ay)
  const purchasesByMonth: { [key: string]: number } = {};
  filteredPurchases.forEach((purchase: Purchase) => {
    const date = new Date(purchase.date);
    const key = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}`;
    purchasesByMonth[key] = (purchasesByMonth[key] || 0) + (purchase.amount || 0);
  });
  const purchasesTrend = last12Months.map(month => ({ date: month, amount: purchasesByMonth[month] || 0 }));

  // En çok satılan ürünler
  const salesByProduct: {[name: string]: number} = {};
  filteredSales.forEach(sale => {
    if (sale.description) {
      salesByProduct[sale.description] = (salesByProduct[sale.description] || 0) + (sale.amount || 0);
    }
  });
  const topProducts = Object.entries(salesByProduct)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, total]) => ({ name, total }));

  // Müşteri segmentasyonu (örnek: eğer customer nesnesinde segment varsa)
  const segmentCounts: {[segment: string]: number} = {};
  customers.forEach(c => {
    const segment = (c as any).segment || 'Bilinmeyen';
    segmentCounts[segment] = (segmentCounts[segment] || 0) + 1;
  });
  const segmentData = Object.entries(segmentCounts).map(([name, count]) => ({ name, count }));

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
            <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Toplam Satış</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">₺{totalSales.toLocaleString()}</div></CardContent></Card>
            <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Toplam Alış</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">₺{totalPurchases.toLocaleString()}</div></CardContent></Card>
            <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Müşteri Sayısı</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{customerCount}</div></CardContent></Card>
            <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tedarikçi Sayısı</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{supplierCount}</div></CardContent></Card>
            <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ortalama Satış</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">₺{avgSale.toLocaleString(undefined, {maximumFractionDigits:2})}</div></CardContent></Card>
            <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ortalama Alış</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">₺{avgPurchase.toLocaleString(undefined, {maximumFractionDigits:2})}</div></CardContent></Card>
            <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Brüt Kâr</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">₺{profit.toLocaleString()}</div></CardContent></Card>
            <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">En Çok Satış Yapılan Müşteri</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{topCustomers[0]?.name || '-'}</div></CardContent></Card>
            <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">En Çok Alış Yapılan Tedarikçi</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{topSuppliers[0]?.name || '-'}</div></CardContent></Card>
          </div>

          {/* Grafikler */}
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <div><h3 className="font-semibold mb-2">Satış Trendi (Son 12 Ay)</h3><LineChartComponent data={salesTrend} /></div>
            <div><h3 className="font-semibold mb-2">Alış Trendi (Son 12 Ay)</h3><LineChartComponent data={purchasesTrend} /></div>
            <div><h3 className="font-semibold mb-2">En Çok Satılan Ürünler</h3><BarChartComponent data={topProducts.map(p => ({ category: p.name, count: p.total }))} /></div>
            <div><h3 className="font-semibold mb-2">Müşteri Segmentasyonu</h3><PieChartComponent data={segmentData} /></div>
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