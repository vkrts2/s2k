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
// AI ile ilgili import kaldırıldı

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading } = useAuth();

  // AI ile ilgili state'ler kaldırıldı
  // const [aiSummary, setAiSummary] = useState<string>("");
  // const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  useEffect(() => {
    document.title = "Aylık ve Genel Durum Raporları | ERMAY";
    setIsLoading(true);
    setError(null);

    const loadReportData = async () => {
      if (!user || loading) {
        return;
      }
      try {
        const salesData = await getSales(user.uid);
        const purchasesData = await getPurchases(user.uid);
        const stockData = await getStockItems(user.uid);
        const customersData = await getCustomers(user.uid);
        setAllSales(salesData);
        setAllPurchases(purchasesData);
        setAllStockItems(stockData);
        setAllCustomers(customersData);
      } catch (e: any) {
        console.error("Rapor verileri yüklenirken hata:", e);
        setError("Rapor verileri yüklenirken bir hata oluştu. Lütfen localStorage'ı kontrol edin veya sayfayı yenileyin.");
        toast({
          title: "Veri Yükleme Hatası",
          description: "Rapor verileri yüklenirken bir sorun oluştu.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadReportData();
  }, [toast, user, loading]);

  const overallTotals = useMemo(() => {
    const totals: {
      sales: Record<Currency, number>;
      purchases: Record<Currency, number>;
      profitLoss: Record<Currency, number>;
    } = {
      sales: { TRY: 0, USD: 0 },
      purchases: { TRY: 0, USD: 0 },
      profitLoss: { TRY: 0, USD: 0 },
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
            totalSales: { TRY: 0, USD: 0 },
            totalPurchases: { TRY: 0, USD: 0 },
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

  // handleGenerateAiSummary kaldırıldı

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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Raporlar</h2>
      </div>

      <Separator />

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
                  <TableRow>
                    <TableCell>Son 30 Gün</TableCell>
                    <TableCell>₺15.000,00</TableCell>
                    <TableCell>30</TableCell>
                    <TableCell>₺500,00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Bu Yıl</TableCell>
                    <TableCell>₺120.000,00</TableCell>
                    <TableCell>200</TableCell>
                    <TableCell>₺600,00</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
                      const currency = name.includes('TRY') ? 'TRY' : 'USD';
                      return formatCurrencyForReport(value, currency);
                    }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="totalSales.TRY" name="Toplam Satış (TRY)" stroke="#8884d8" activeDot={{ r: 8 }} />
                    <Line yAxisId="right" type="monotone" dataKey="totalSales.USD" name="Toplam Satış (USD)" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit-loss" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Genel Kar/Zarar Durumu</CardTitle>
              <CardDescription>Tüm satış ve alış kayıtlarınıza dayalı genel kar/zarar özeti.</CardDescription>
            </CardHeader>
            <CardContent>
              {allSales.length === 0 && allPurchases.length === 0 ? (
                <p className="text-muted-foreground text-center py-3">Genel kar/zarar durumu için gösterilecek satış veya alım hareketi bulunmamaktadır.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parametre</TableHead>
                      <TableHead className="text-right">TRY</TableHead>
                      <TableHead className="text-right">USD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Toplam Satışlar</TableCell>
                      <TableCell className="text-right">{formatCurrencyForReport(overallTotals.sales.TRY, 'TRY')}</TableCell>
                      <TableCell className="text-right">{formatCurrencyForReport(overallTotals.sales.USD, 'USD')}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Toplam Alışlar</TableCell>
                      <TableCell className="text-right">{formatCurrencyForReport(overallTotals.purchases.TRY, 'TRY')}</TableCell>
                      <TableCell className="text-right">{formatCurrencyForReport(overallTotals.purchases.USD, 'USD')}</TableCell>
                    </TableRow>
                    <TableRow className="font-bold">
                      <TableCell>Net Kar/Zarar</TableCell>
                      <TableCell className={cn("text-right", overallTotals.profitLoss.TRY >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatCurrencyForReport(overallTotals.profitLoss.TRY, 'TRY')}
                      </TableCell>
                      <TableCell className={cn("text-right", overallTotals.profitLoss.USD >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatCurrencyForReport(overallTotals.profitLoss.USD, 'USD')}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ay/Yıl</TableHead>
                      <TableHead className="text-right">Toplam Satış (TRY)</TableHead>
                      <TableHead className="text-right">Toplam Satış (USD)</TableHead>
                      <TableHead className="text-right">Toplam Alış (TRY)</TableHead>
                      <TableHead className="text-right">Toplam Alış (USD)</TableHead>
                      <TableHead className="text-right">Net Kar/Zarar (TRY)</TableHead>
                      <TableHead className="text-right">Net Kar/Zarar (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlySummaries.map(summary => (
                      <TableRow key={summary.monthKey}>
                        <TableCell className="font-medium">{summary.monthYear}</TableCell>
                        <TableCell className="text-right">{formatCurrencyForReport(summary.totalSales.TRY, 'TRY')}</TableCell>
                        <TableCell className="text-right">{formatCurrencyForReport(summary.totalSales.USD, 'USD')}</TableCell>
                        <TableCell className="text-right">{formatCurrencyForReport(summary.totalPurchases.TRY, 'TRY')}</TableCell>
                        <TableCell className="text-right">{formatCurrencyForReport(summary.totalPurchases.USD, 'USD')}</TableCell>
                        <TableCell className={cn("text-right", (summary.totalSales.TRY - summary.totalPurchases.TRY) >= 0 ? "text-green-600" : "text-red-600")}>
                          {formatCurrencyForReport(summary.totalSales.TRY - summary.totalPurchases.TRY, 'TRY')}
                        </TableCell>
                        <TableCell className={cn("text-right", (summary.totalSales.USD - summary.totalPurchases.USD) >= 0 ? "text-green-600" : "text-red-600")}>
                          {formatCurrencyForReport(summary.totalSales.USD - summary.totalPurchases.USD, 'USD')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
