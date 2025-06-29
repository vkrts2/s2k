// src/app/reports/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import type { Sale, Purchase, Currency, StockItem, Customer } from '@/lib/types';
import { getSales, getPurchases, getStockItems, getCustomers } from '@/lib/storage';
import { format, parseISO, startOfMonth, isValid, eachMonthOfInterval, lastDayOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, CalendarDays, FileText, Package2, AlertTriangle, Users2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import BackToHomeButton from '@/components/common/back-to-home-button';
import { onSnapshot, QuerySnapshot } from "firebase/firestore";
import { query } from "firebase/firestore";
import { _getUserCollectionRef } from "@/lib/storage";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

interface MonthlySummary {
  monthYear: string; 
  monthKey: string; 
  totalSales: Record<Currency, number>;
  totalPurchases: Record<Currency, number>;
}

const formatCurrencyForReport = (amount: number, currency: Currency): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }
  try {
    return amount.toLocaleString('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch (e) {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

export default function ReportsPage() {
  const { toast } = useToast();
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([]);
  const [allStockItems, setAllStockItems] = useState<StockItem[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const [profitLossDateRange, setProfitLossDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    document.title = "Aylık ve Genel Durum Raporları | ERMAY";
    setIsLoading(true);
    setError(null);

    if (!user || loading) {
      return;
    }

    // Firestore canlı dinleyiciler
    const salesUnsub = onSnapshot(
      query(_getUserCollectionRef(user.uid, "sales")) as any,
      (snapshot: QuerySnapshot) => {
        setAllSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Omit<Sale, 'id'> })));
      }
    );
    const purchasesUnsub = onSnapshot(
      query(_getUserCollectionRef(user.uid, "purchases")) as any,
      (snapshot: QuerySnapshot) => {
        setAllPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Omit<Purchase, 'id'> })));
      }
    );
    const stockUnsub = onSnapshot(
      query(_getUserCollectionRef(user.uid, "stockItems")) as any,
      (snapshot: QuerySnapshot) => {
        setAllStockItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Omit<StockItem, 'id'> })));
      }
    );
    const customersUnsub = onSnapshot(
      query(_getUserCollectionRef(user.uid, "customers")) as any,
      (snapshot: QuerySnapshot) => {
        setAllCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Omit<Customer, 'id'> })));
      }
    );
    const paymentsUnsub = onSnapshot(
      query(_getUserCollectionRef(user.uid, "payments")) as any,
      (snapshot: QuerySnapshot) => {
        setAllPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    setIsLoading(false);

    // Temizlik: Sayfa kapanınca dinleyicileri kapat
    return () => {
      salesUnsub();
      purchasesUnsub();
      stockUnsub();
      customersUnsub();
      paymentsUnsub();
    };
  }, [user, loading]);

  const overallTotals = useMemo(() => {
    const totals: {
      sales: Record<Currency, number>;
      purchases: Record<Currency, number>;
      profitLoss: Record<Currency, number>;
    } = {
      sales: { TRY: 0, USD: 0, EUR: 0 },
      purchases: { TRY: 0, USD: 0, EUR: 0 },
      profitLoss: { TRY: 0, USD: 0, EUR: 0 },
    };

    allSales.forEach(s => {
      if (s && typeof s.amount === 'number' && s.currency) {
        totals.sales[s.currency] = (totals.sales[s.currency] || 0) + s.amount;
      }
    });

    allPurchases.forEach(p => {
      if (p && typeof p.amount === 'number' && p.currency) {
        totals.purchases[p.currency] = (totals.purchases[p.currency] || 0) + p.amount;
      }
    });

    (Object.keys(totals.sales) as Currency[]).forEach(currency => {
      totals.profitLoss[currency] = (totals.sales[currency] || 0) - (totals.purchases[currency] || 0);
    });

    return totals;
  }, [allSales, allPurchases]);

  const monthlySummaries: MonthlySummary[] = useMemo(() => {
    const summaries: Record<string, Omit<MonthlySummary, 'monthYear' | 'monthKey'>> = {};

    const processTransactions = (transactions: Array<Sale | Purchase>, type: 'sales' | 'purchases') => {
      transactions.forEach(transaction => {
        if (!transaction || !transaction.date || typeof transaction.amount !== 'number' || !transaction.currency) return;
        
        const transactionDate = parseISO(transaction.date);
        if (!isValid(transactionDate)) return;

        const monthKey = format(startOfMonth(transactionDate), 'yyyy-MM'); 
        
        if (!summaries[monthKey]) {
          summaries[monthKey] = {
            totalSales: { TRY: 0, USD: 0, EUR: 0 },
            totalPurchases: { TRY: 0, USD: 0, EUR: 0 },
          };
        }
        
        if (type === 'sales') {
          summaries[monthKey].totalSales[transaction.currency] = (summaries[monthKey].totalSales[transaction.currency] || 0) + transaction.amount;
        } else if (type === 'purchases') {
          summaries[monthKey].totalPurchases[transaction.currency] = (summaries[monthKey].totalPurchases[transaction.currency] || 0) + transaction.amount;
        }
      });
    };

    processTransactions(allSales, 'sales');
    processTransactions(allPurchases, 'purchases');
    
    return Object.entries(summaries)
      .map(([monthKey, data]) => ({
        monthKey,
        monthYear: format(parseISO(monthKey + '-01'), 'MMMM yyyy', { locale: tr }),
        ...data,
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey)); 
  }, [allSales, allPurchases]);

  const lowStockItems = useMemo(() => {
    // Belirli bir limitin altındaki stokları bul
    const LOW_STOCK_THRESHOLD = 5;
    return allStockItems.filter(item => item.currentStock <= LOW_STOCK_THRESHOLD);
  }, [allStockItems]);

  const customerSalesSummary = useMemo(() => {
    const customerSales: Record<string, { name: string; totalSales: number; saleCount: number }> = {};

    allCustomers.forEach(customer => {
      customerSales[customer.id] = {
        name: customer.name,
        totalSales: 0,
        saleCount: 0,
      };
    });

    allSales.forEach(sale => {
      if (sale.customerId && customerSales[sale.customerId]) {
        customerSales[sale.customerId].totalSales += sale.amount;
        customerSales[sale.customerId].saleCount += 1;
      }
    });

    return Object.values(customerSales).sort((a, b) => b.totalSales - a.totalSales);
  }, [allCustomers, allSales]);

  const topSellingProducts = useMemo(() => {
    const productSales: Record<string, { name: string; totalQuantitySold: number; totalRevenue: number }> = {};

    allSales.forEach(sale => {
      if (sale.stockItemId && typeof sale.quantity === 'number' && typeof sale.amount === 'number') {
        const stockItem = allStockItems.find(item => item.id === sale.stockItemId);
        const productName = stockItem ? stockItem.name : 'Bilinmeyen Ürün';

        if (!productSales[sale.stockItemId]) {
          productSales[sale.stockItemId] = {
            name: productName,
            totalQuantitySold: 0,
            totalRevenue: 0,
          };
        }
        productSales[sale.stockItemId].totalQuantitySold += sale.quantity;
        productSales[sale.stockItemId].totalRevenue += sale.amount;
      }
    });
    return Object.values(productSales).sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);
  }, [allSales, allStockItems]);

  // Tarih aralığına göre filtrelenmiş satış ve alışlar
  const filteredSales = useMemo(() => {
    if (!profitLossDateRange?.from || !profitLossDateRange?.to) return allSales;
    return allSales.filter(sale => {
      const d = parseISO(sale.date);
      return profitLossDateRange?.from && profitLossDateRange?.to && d >= profitLossDateRange.from && d <= profitLossDateRange.to;
    });
  }, [allSales, profitLossDateRange]);
  const filteredPurchases = useMemo(() => {
    if (!profitLossDateRange?.from || !profitLossDateRange?.to) return allPurchases;
    return allPurchases.filter(purchase => {
      const d = parseISO(purchase.date);
      return profitLossDateRange?.from && profitLossDateRange?.to && d >= profitLossDateRange.from && d <= profitLossDateRange.to;
    });
  }, [allPurchases, profitLossDateRange]);

  // Filtrelenmiş verilerle kar/zarar hesapla
  const filteredTotals = useMemo(() => {
    const totals: {
      sales: Record<Currency, number>;
      purchases: Record<Currency, number>;
      profitLoss: Record<Currency, number>;
    } = {
      sales: { TRY: 0, USD: 0, EUR: 0 },
      purchases: { TRY: 0, USD: 0, EUR: 0 },
      profitLoss: { TRY: 0, USD: 0, EUR: 0 },
    };
    filteredSales.forEach(s => {
      if (s && typeof s.amount === 'number' && s.currency) {
        totals.sales[s.currency] = (totals.sales[s.currency] || 0) + s.amount;
      }
    });
    filteredPurchases.forEach(p => {
      if (p && typeof p.amount === 'number' && p.currency) {
        totals.purchases[p.currency] = (totals.purchases[p.currency] || 0) + p.amount;
      }
    });
    (Object.keys(totals.sales) as Currency[]).forEach(currency => {
      totals.profitLoss[currency] = (totals.sales[currency] || 0) - (totals.purchases[currency] || 0);
    });
    return totals;
  }, [filteredSales, filteredPurchases]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Rapor verileri yükleniyor...</p></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Bir Hata Oluştu</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <BackToHomeButton />
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Raporlar</h2>
        </div>

        <Separator />

        {/* GÜNCEL DURUM KARTI */}
        {(() => {
          // Müşterilerden toplam alacak (TRY)
          let toplamAlacak = 0;
          // Tedarikçilere toplam borç (TRY)
          let toplamBorc = 0;

          // Müşteri bakiyeleri (satışlar - ödemeler)
          const customerBalances: Record<string, number> = {};
          allCustomers.forEach(customer => {
            const sales = allSales.filter((s: any) => s.customerId === customer.id && s.currency === 'TRY');
            const payments = (allPayments || []).filter((p: any) => p.customerId === customer.id && p.currency === 'TRY');
            const salesTotal = sales.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
            const paymentsTotal = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            const balance = salesTotal - paymentsTotal;
            customerBalances[customer.id] = balance;
            toplamAlacak += balance;
          });

          // Tedarikçi bakiyeleri (alışlar - ödemeler)
          // Tedarikçi ödemeleri için allPurchases ve allPaymentsToSuppliers kullanılmalı
          // Ancak burada sadece allPurchases ve allSales var, bu yüzden tedarikçi borcu için alışlar - ödemeler mantığı kullanılacak
          // allPurchases: alışlar, allSales: satışlar
          // Tedarikçi borcu: alışlar - ödemeler
          // allPurchases: Purchase[], allPaymentsToSuppliers: PaymentToSupplier[]
          // allPaymentsToSuppliers yok, bu yüzden sadece alışlar üzerinden hesap
          // (Eğer ödeme varsa, eklenmeli)
          // Şimdilik alışların toplamı
          toplamBorc = allPurchases.filter(p => p.currency === 'TRY').reduce((sum, p) => sum + (p.amount || 0), 0);

          // Güncel kar durumu: toplam alacak - toplam borç
          const guncelKar = toplamAlacak - toplamBorc;

          return (
            <Card className="bg-neutral-900/95 rounded-xl shadow-lg px-6 py-3 border border-gray-700 max-w-xl mx-auto mb-6">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Güncel Durum</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 text-lg text-white">
                  <span>Müşterilerden Toplam Alacak: <span className="font-bold text-green-400">{formatCurrencyForReport(toplamAlacak, 'TRY')}</span></span>
                  <span>Tedarikçilere Toplam Borç: <span className="font-bold text-red-400">{formatCurrencyForReport(toplamBorc, 'TRY')}</span></span>
                  <span>Güncel Kar Durumu: <span className={guncelKar >= 0 ? 'font-bold text-green-400' : 'font-bold text-red-400'}>{formatCurrencyForReport(guncelKar, 'TRY')}</span></span>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Satış Raporları</TabsTrigger>
            <TabsTrigger value="profit-loss">Kar/Zarar Tablosu</TabsTrigger>
            <TabsTrigger value="stock">Stok Raporları</TabsTrigger>
            <TabsTrigger value="customers">Müşteri Analizi</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Genel Satış Özeti</CardTitle>
                <CardDescription>Belirlenen döneme ait satış özetleri.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dönem</TableHead>
                        <TableHead>Toplam Satış Tutarı</TableHead>
                        <TableHead>Satış Sayısı</TableHead>
                        <TableHead>Ortalama Satış Tutarı</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Son 30 Gün */}
                      {(() => {
                        const now = new Date();
                        const thirtyDaysAgo = new Date(now);
                        thirtyDaysAgo.setDate(now.getDate() - 30);
                        const salesLast30Days = allSales.filter(sale => {
                          const d = typeof sale.date === 'string' ? parseISO(sale.date) : new Date(sale.date);
                          return d >= thirtyDaysAgo && d <= now;
                        });
                        const totalAmount30 = salesLast30Days.reduce((sum, sale) => sum + (typeof sale.amount === 'number' ? sale.amount : 0), 0);
                        const count30 = salesLast30Days.length;
                        const avg30 = count30 > 0 ? totalAmount30 / count30 : 0;
                        return (
                          <TableRow>
                            <TableCell>Son 30 Gün</TableCell>
                            <TableCell>{formatCurrencyForReport(totalAmount30, 'TRY')}</TableCell>
                            <TableCell>{count30}</TableCell>
                            <TableCell>{formatCurrencyForReport(avg30, 'TRY')}</TableCell>
                          </TableRow>
                        );
                      })()}
                      {/* Bu Yıl */}
                      {(() => {
                        const now = new Date();
                        const yearStart = new Date(now.getFullYear(), 0, 1);
                        const salesThisYear = allSales.filter(sale => {
                          const d = typeof sale.date === 'string' ? parseISO(sale.date) : new Date(sale.date);
                          return d >= yearStart && d <= now;
                        });
                        const totalAmountYear = salesThisYear.reduce((sum, sale) => sum + (typeof sale.amount === 'number' ? sale.amount : 0), 0);
                        const countYear = salesThisYear.length;
                        const avgYear = countYear > 0 ? totalAmountYear / countYear : 0;
                        return (
                          <TableRow>
                            <TableCell>Bu Yıl</TableCell>
                            <TableCell>{formatCurrencyForReport(totalAmountYear, 'TRY')}</TableCell>
                            <TableCell>{countYear}</TableCell>
                            <TableCell>{formatCurrencyForReport(avgYear, 'TRY')}</TableCell>
                          </TableRow>
                        );
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>En Çok Satan Ürünler</CardTitle>
                <CardDescription>Satış adetlerine göre en çok satan ürünler.</CardDescription>
              </CardHeader>
              <CardContent>
                {topSellingProducts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-3">Henüz satış verisi bulunamadı.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ürün Adı</TableHead>
                          <TableHead className="text-right">Satılan Miktar</TableHead>
                          <TableHead className="text-right">Toplam Gelir (TRY)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topSellingProducts.map((product, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-right">{product.totalQuantitySold}</TableCell>
                            <TableCell className="text-right">{formatCurrencyForReport(product.totalRevenue, 'TRY')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aylık Satış Trendleri</CardTitle>
                <CardDescription>Aylık satış tutarlarının grafiği.</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlySummaries.length === 0 ? (
                  <p className="text-muted-foreground text-center py-3">Aylık satış trendleri için gösterilecek veri bulunamadı.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={monthlySummaries.sort((a, b) => a.monthKey.localeCompare(b.monthKey))}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="monthYear" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip formatter={(value: number, name: string, props: any) => {
                          const currency = name.includes('TRY') ? 'TRY' : name.includes('USD') ? 'USD' : 'EUR';
                          return formatCurrencyForReport(value, currency);
                        }} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="totalSales.TRY" name="Toplam Satış (TRY)" stroke="#8884d8" activeDot={{ r: 8 }} />
                        <Line yAxisId="right" type="monotone" dataKey="totalSales.USD" name="Toplam Satış (USD)" stroke="#82ca9d" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profit-loss" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Kar/Zarar Dönem Filtresi</CardTitle>
                <CardDescription>İstediğiniz tarih aralığını seçerek kar/zarar tablosunu filtreleyin.</CardDescription>
              </CardHeader>
              <CardContent>
                <DateRangePicker value={profitLossDateRange} onChange={setProfitLossDateRange} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Genel Kar/Zarar Durumu</CardTitle>
                <CardDescription>Seçili döneme ait satış ve alış kayıtlarınıza dayalı kar/zarar özeti.</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredSales.length === 0 && filteredPurchases.length === 0 ? (
                  <p className="text-muted-foreground text-center py-3">Seçili dönem için satış veya alım hareketi bulunmamaktadır.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Parametre</TableHead>
                          <TableHead className="text-right">TRY</TableHead>
                          <TableHead className="text-right">USD</TableHead>
                          <TableHead className="text-right">EUR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Toplam Satışlar</TableCell>
                          <TableCell className="text-right">{formatCurrencyForReport(filteredTotals.sales.TRY, 'TRY')}</TableCell>
                          <TableCell className="text-right">{formatCurrencyForReport(filteredTotals.sales.USD, 'USD')}</TableCell>
                          <TableCell className="text-right">{formatCurrencyForReport(filteredTotals.sales.EUR, 'EUR')}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Toplam Alışlar</TableCell>
                          <TableCell className="text-right">{formatCurrencyForReport(filteredTotals.purchases.TRY, 'TRY')}</TableCell>
                          <TableCell className="text-right">{formatCurrencyForReport(filteredTotals.purchases.USD, 'USD')}</TableCell>
                          <TableCell className="text-right">{formatCurrencyForReport(filteredTotals.purchases.EUR, 'EUR')}</TableCell>
                        </TableRow>
                        <TableRow className="font-bold">
                          <TableCell>Net Kar/Zarar</TableCell>
                          <TableCell className={cn("text-right", filteredTotals.profitLoss.TRY >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrencyForReport(filteredTotals.profitLoss.TRY, 'TRY')}</TableCell>
                          <TableCell className={cn("text-right", filteredTotals.profitLoss.USD >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrencyForReport(filteredTotals.profitLoss.USD, 'USD')}</TableCell>
                          <TableCell className={cn("text-right", filteredTotals.profitLoss.EUR >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrencyForReport(filteredTotals.profitLoss.EUR, 'EUR')}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aylık Kar/Zarar Dökümü</CardTitle>
                <CardDescription>Her ay için satış ve alış tutarlarınızın dökümü.</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlySummaries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ay/Yıl</TableHead>
                          <TableHead className="text-right">Toplam Satış (TRY)</TableHead>
                          <TableHead className="text-right">Toplam Satış (USD)</TableHead>
                          <TableHead className="text-right">Toplam Satış (EUR)</TableHead>
                          <TableHead className="text-right">Toplam Alış (TRY)</TableHead>
                          <TableHead className="text-right">Toplam Alış (USD)</TableHead>
                          <TableHead className="text-right">Toplam Alış (EUR)</TableHead>
                          <TableHead className="text-right">Net Kar/Zarar (TRY)</TableHead>
                          <TableHead className="text-right">Net Kar/Zarar (USD)</TableHead>
                          <TableHead className="text-right">Net Kar/Zarar (EUR)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlySummaries.map(summary => (
                          <TableRow key={summary.monthKey}>
                            <TableCell className="font-medium">{summary.monthYear}</TableCell>
                            <TableCell className="text-right">{formatCurrencyForReport(summary.totalSales.TRY, 'TRY')}</TableCell>
                            <TableCell className="text-right">{formatCurrencyForReport(summary.totalSales.USD, 'USD')}</TableCell>
                            <TableCell className="text-right">{formatCurrencyForReport(summary.totalSales.EUR, 'EUR')}</TableCell>
                            <TableCell className="text-right">{formatCurrencyForReport(summary.totalPurchases.TRY, 'TRY')}</TableCell>
                            <TableCell className="text-right">{formatCurrencyForReport(summary.totalPurchases.USD, 'USD')}</TableCell>
                            <TableCell className="text-right">{formatCurrencyForReport(summary.totalPurchases.EUR, 'EUR')}</TableCell>
                            <TableCell className={cn("text-right", (summary.totalSales.TRY - summary.totalPurchases.TRY) >= 0 ? "text-green-600" : "text-red-600")}>
                              {formatCurrencyForReport(summary.totalSales.TRY - summary.totalPurchases.TRY, 'TRY')}
                            </TableCell>
                            <TableCell className={cn("text-right", (summary.totalSales.USD - summary.totalPurchases.USD) >= 0 ? "text-green-600" : "text-red-600")}>
                              {formatCurrencyForReport(summary.totalSales.USD - summary.totalPurchases.USD, 'USD')}
                            </TableCell>
                            <TableCell className={cn("text-right", (summary.totalSales.EUR - summary.totalPurchases.EUR) >= 0 ? "text-green-600" : "text-red-600")}>
                              {formatCurrencyForReport(summary.totalSales.EUR - summary.totalPurchases.EUR, 'EUR')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Aylık kar/zarar raporu için gösterilecek satış veya alım verisi bulunamadı.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stock" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Genel Stok Durumu</CardTitle>
                <CardDescription>Mevcut tüm stok kalemleri ve miktarları.</CardDescription>
              </CardHeader>
              <CardContent>
                {allStockItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-3">Stokta herhangi bir ürün bulunamadı.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ürün Adı</TableHead>
                          <TableHead className="text-right">Mevcut Stok</TableHead>
                          <TableHead>Birim</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allStockItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-right">{item.currentStock}</TableCell>
                            <TableCell>{item.unit || 'Adet'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {lowStockItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-500"><AlertTriangle className="h-5 w-5" /> Düşük Stok Uyarıları</CardTitle>
                  <CardDescription>Düşük stok seviyesine sahip ürünler.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ürün Adı</TableHead>
                          <TableHead className="text-right">Mevcut Stok</TableHead>
                          <TableHead>Birim</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowStockItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-right">{item.currentStock}</TableCell>
                            <TableCell>{item.unit || 'Adet'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users2 className="h-5 w-5"/>Müşteri Analizi Raporu</CardTitle>
                <CardDescription>Müşteri segmentasyonu ve satın alma davranışları.</CardDescription>
              </CardHeader>
              <CardContent>
                {customerSalesSummary.length === 0 ? (
                  <p className="text-muted-foreground text-center py-3">Analiz edilecek müşteri veya satış verisi bulunamadı.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Müşteri Adı</TableHead>
                          <TableHead className="text-right">Toplam Satış Tutarı</TableHead>
                          <TableHead className="text-right">Satış Sayısı</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerSalesSummary.map((customer) => (
                          <TableRow key={customer.name}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell className="text-right">{formatCurrencyForReport(customer.totalSales, 'TRY')}</TableCell>
                            <TableCell className="text-right">{customer.saleCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
