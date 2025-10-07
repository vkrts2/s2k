"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, RefreshCcw, FileText, BarChart3, Package, Users, Receipt, TrendingUp, DollarSign, Archive, CircleDollarSign, ArrowRight, ArrowUpRight, ArrowDownRight, TrendingDown, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SalesTab } from "@/components/dashboard/sales-tab";
import { StockTab } from "@/components/dashboard/stock-tab";
import { PaymentsTab } from "@/components/dashboard/payments-tab";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

import { collection, query, where, getDocs, orderBy, limit, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import ChatWidget from "@/components/ChatWidget";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface Transaction {
  id: string;
  date: any; // Firestore Timestamp
  type: string;
  partyName: string;
  amount: number;
}

interface Statistics {
  totalSales: number;
  totalPurchases: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalProducts: number;
  lowStockItems: number;
}

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

interface SalesDataPoint {
  name: string;
  sales: number;
  uv?: number;
  amt?: number;
}

interface StockDataPoint {
  name: string;
  value: number;
}

interface PaymentDataPoint {
  name: string;
  value: number;
}

interface ProductData {
  id: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

interface ProfitLossData {
  totalRevenue: number;
  totalExpenses: number;
  netProfitLoss: number;
}

interface RecentTransaction {
  id: string;
  type: 'Fatura' | 'Ödeme' | 'Stok Hareketi' | 'Gider' | 'Alış' | 'Ödeme (Gelen)' | 'Ödeme (Giden)';
  description: string;
  amount: number;
  date: Date;
  link: string;
}

interface Statistic {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
}

interface DailySalesData {
  date: string;
  sales: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // State for Overview Tab
  const [totalSales, setTotalSales] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [salesTrendData, setSalesTrendData] = useState<SalesDataPoint[]>([]);
  const [stockStatusData, setStockStatusData] = useState<StockDataPoint[]>([]);

  // State for Sales Tab
  const [salesTabSalesData, setSalesTabSalesData] = useState<any[]>([]);
  const [salesTabDailySales, setSalesTabDailySales] = useState<any[]>([]);
  const [salesTabProductSales, setSalesTabProductSales] = useState<any[]>([]);
  const [salesTabCustomerSales, setSalesTabCustomerSales] = useState<any[]>([]);

  // State for Stock Tab
  const [stockTabStockData, setStockTabStockData] = useState<any[]>([]);
  const [stockTabStockMovements, setStockTabStockMovements] = useState<any[]>([]);
  const [stockTabLowStockItems, setStockTabLowStockItems] = useState<any[]>([]);
  const [stockTabCategoryDistribution, setStockTabCategoryDistribution] = useState<any[]>([]);

  // State for Payments Tab
  const [paymentsTabPaymentsData, setPaymentsTabPaymentsData] = useState<any[]>([]);
  const [paymentsTabDailyPayments, setPaymentsTabDailyPayments] = useState<any[]>([]);
  const [paymentsTabCustomerPayments, setPaymentsTabCustomerPayments] = useState<any[]>([]);
  const [paymentsTabPaymentStatus, setPaymentsTabPaymentStatus] = useState<any[]>([]);

  // State for Reports Tab
  const [reportsTabSalesReports, setReportsTabSalesReports] = useState<any[]>([]);
  const [reportsTabPaymentReports, setReportsTabPaymentReports] = useState<any[]>([]);
  const [reportsTabStockReports, setReportsTabStockReports] = useState<any[]>([]);
  const [reportsTabProfitLossReport, setReportsTabProfitLossReport] = useState<ProfitLossData | null>(null);

  const [statistics, setStatistics] = useState<Statistic[]>([]);
  const [dailySales, setDailySales] = useState<DailySalesData[]>([]);

  // Mock data - In a real application, this would come from your API
  const metrics = {
    totalRevenue: 125000,
    totalExpenses: 45000,
    activeCustomers: 156,
    totalProducts: 89,
    revenueChange: 12.5,
    expensesChange: -5.2,
  };

  const recentActivities = [
    { type: 'sale', amount: 2500, customer: 'Ahmet Yılmaz', date: '2024-03-15' },
    { type: 'purchase', amount: 1800, supplier: 'ABC Ltd.', date: '2024-03-14' },
    { type: 'payment', amount: 3200, customer: 'Mehmet Demir', date: '2024-03-13' },
  ];

  // Mock data for analytics
  const salesData = [
    { name: 'Ocak', satış: 4000, alış: 2400 },
    { name: 'Şubat', satış: 3000, alış: 1398 },
    { name: 'Mart', satış: 2000, alış: 9800 },
    { name: 'Nisan', satış: 2780, alış: 3908 },
    { name: 'Mayıs', satış: 1890, alış: 4800 },
    { name: 'Haziran', satış: 2390, alış: 3800 },
  ];

  const customerData = [
    { name: 'Yeni', value: 400 },
    { name: 'Aktif', value: 300 },
    { name: 'Pasif', value: 200 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  const revenueData = [
    { name: 'Pzt', gelir: 4000, gider: 2400 },
    { name: 'Sal', gelir: 3000, gider: 1398 },
    { name: 'Çar', gelir: 2000, gider: 9800 },
    { name: 'Per', gelir: 2780, gider: 3908 },
    { name: 'Cum', gelir: 1890, gider: 4800 },
    { name: 'Cmt', gelir: 2390, gider: 3800 },
    { name: 'Paz', gelir: 3490, gider: 4300 },
  ];

  // Mock data for reports
  const yearlyData = [
    { year: '2020', gelir: 1200000, gider: 800000, kar: 400000 },
    { year: '2021', gelir: 1500000, gider: 950000, kar: 550000 },
    { year: '2022', gelir: 1800000, gider: 1100000, kar: 700000 },
    { year: '2023', gelir: 2100000, gider: 1300000, kar: 800000 },
  ];

  const taxSummary = [
    { type: 'KDV Tahsilat', amount: 450000 },
    { type: 'KDV Ödeme', amount: 380000 },
    { type: 'Gelir Vergisi', amount: 280000 },
    { type: 'Kurumlar Vergisi', amount: 320000 },
  ];

  const categoryPerformance = [
    { category: 'Elektronik', satış: 450000, kar: 90000 },
    { category: 'Giyim', satış: 380000, kar: 76000 },
    { category: 'Mobilya', satış: 290000, kar: 58000 },
    { category: 'Aksesuar', satış: 220000, kar: 44000 },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const fetchedTransactions: RecentTransaction[] = [];
      let totalSalesAmount = 0;
      let totalPurchasesAmount = 0;
      let totalCustomersCount = 0;
      let totalSuppliersCount = 0;
      let lowStockItemsCount = 0;
      let totalProductsCount = 0;

      const salesByDate: { [key: string]: number } = {};
      const purchasesByDate: { [key: string]: number } = {};

      // Fetch recent invoices (Sales)
      const invoicesQuery = query(
        collection(db, `users/${user.uid}/invoices`),
        orderBy("date", "desc"),
        limit(10)
      );
      const invoicesSnapshot = await getDocs(invoicesQuery);
      invoicesSnapshot.forEach(doc => {
        const data = doc.data();
        const invoiceDate = data.date.toDate();
        totalSalesAmount += data.totalAmount;
        fetchedTransactions.push({
          id: doc.id,
          type: 'Fatura',
          description: `Fatura No: ${data.invoiceNumber || doc.id}`,
          amount: data.totalAmount,
          date: invoiceDate,
          link: `/invoices/${doc.id}`,
        });

        const monthYear = format(invoiceDate, 'MMM yyyy', { locale: tr });
        salesByDate[monthYear] = (salesByDate[monthYear] || 0) + data.totalAmount;
      });

      // Fetch recent purchases
      const purchasesQuery = query(
        collection(db, `users/${user.uid}/purchases`),
        orderBy("date", "desc"),
        limit(10)
      );
      const purchasesSnapshot = await getDocs(purchasesQuery);
      purchasesSnapshot.forEach(doc => {
        const data = doc.data();
        const purchaseDate = data.date.toDate();
        totalPurchasesAmount += data.amount;
        fetchedTransactions.push({
          id: doc.id,
          type: 'Alış',
          description: data.description || `Alış: ${doc.id}`,
          amount: data.amount,
          date: purchaseDate,
          link: `/suppliers/${data.supplierId}/purchases`,
        });
        const monthYear = format(purchaseDate, 'MMM yyyy', { locale: tr });
        purchasesByDate[monthYear] = (purchasesByDate[monthYear] || 0) + data.amount;
      });

      // Fetch recent payments (both to customers and suppliers)
      const paymentsQuery = query(
        collection(db, `users/${user.uid}/payments`),
        orderBy("date", "desc"),
        limit(5)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      paymentsSnapshot.forEach(doc => {
        const data = doc.data();
        const paymentDate = data.date.toDate();
        fetchedTransactions.push({
          id: doc.id,
          type: 'Ödeme (Gelen)',
          description: data.description || `Ödeme (Gelen): ${doc.id}`,
          amount: data.amount,
          date: paymentDate,
          link: `/customers/${data.customerId}/payments`,
        });
      });

      const paymentsToSuppliersQuery = query(
        collection(db, `users/${user.uid}/paymentsToSuppliers`),
        orderBy("date", "desc"),
        limit(5)
      );
      const paymentsToSuppliersSnapshot = await getDocs(paymentsToSuppliersQuery);
      paymentsToSuppliersSnapshot.forEach(doc => {
        const data = doc.data();
        const paymentDate = data.date.toDate();
        fetchedTransactions.push({
          id: doc.id,
          type: 'Ödeme (Giden)',
          description: data.description || `Ödeme (Giden): ${doc.id}`,
          amount: data.amount,
          date: paymentDate,
          link: `/suppliers/${data.supplierId}/payments`,
        });
      });

      // Fetch customer count
      const customersSnapshot = await getDocs(collection(db, `users/${user.uid}/customers`));
      totalCustomersCount = customersSnapshot.size;

      // Fetch supplier count
      const suppliersSnapshot = await getDocs(collection(db, `users/${user.uid}/suppliers`));
      totalSuppliersCount = suppliersSnapshot.size;

      // Fetch product count and low stock items
      const productsSnapshot = await getDocs(collection(db, `users/${user.uid}/stockItems`));
      totalProductsCount = productsSnapshot.size;
      productsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.quantity <= (data.minStockQuantity || 5)) { // Assuming a default min stock of 5 if not specified
          lowStockItemsCount++;
        }
      });

      // Sort all transactions by date
      fetchedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      setTotalSales(totalSalesAmount);
      setTotalPurchases(totalPurchasesAmount);
      setTotalCustomers(totalCustomersCount);
      setTotalSuppliers(totalSuppliersCount);
      setTotalProducts(totalProductsCount);
      setLowStockCount(lowStockItemsCount);
      setRecentTransactions(fetchedTransactions.slice(0, 5)); // Show top 5 recent transactions

      // Prepare sales trend data for chart
      const sortedSalesDates = Object.keys(salesByDate).sort((a, b) => {
        const dateA = parseISO(format(new Date(a), 'yyyy-MM-01'));
        const dateB = parseISO(format(new Date(b), 'yyyy-MM-01'));
        return dateA.getTime() - dateB.getTime();
      });
      const formattedSalesTrendData = sortedSalesDates.map(date => ({ name: date, sales: salesByDate[date] }));
      setSalesTrendData(formattedSalesTrendData);

      const statisticsData: Statistic[] = [
        {
          title: "Toplam Satış",
          value: `$${totalSalesAmount.toLocaleString()}`,
          icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
          description: "Uygulama üzerinden yapılan toplam satış tutarı.",
        },
        {
          title: "Toplam Alış",
          value: `$${totalPurchasesAmount.toLocaleString()}`,
          icon: <TrendingDown className="h-4 w-4 text-muted-foreground" />,
          description: "Uygulama üzerinden yapılan toplam alış tutarı.",
        },
        {
          title: "Müşteri Sayısı",
          value: totalCustomersCount.toLocaleString(),
          icon: <Users className="h-4 w-4 text-muted-foreground" />,
          description: "Sistemdeki toplam müşteri sayısı.",
        },
        {
          title: "Tedarikçi Sayısı",
          value: totalSuppliersCount.toLocaleString(),
          icon: <Truck className="h-4 w-4 text-muted-foreground" />,
          description: "Sistemdeki toplam tedarikçi sayısı.",
        },
        {
          title: "Toplam Ürün",
          value: totalProductsCount.toLocaleString(),
          icon: <Package className="h-4 w-4 text-muted-foreground" />,
          description: "Sistemdeki toplam ürün sayısı.",
        },
        {
          title: "Düşük Stoklu Ürün",
          value: lowStockItemsCount.toLocaleString(),
          icon: <Archive className="h-4 w-4 text-red-500" />,
          description: "Stok seviyesi düşük olan ürün sayısı.",
        },
      ];
      setStatistics(statisticsData);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Veri çekme hatası",
        description: "Kontrol paneli verileri çekilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="analytics">Analitik</TabsTrigger>
          <TabsTrigger value="reports">Raporlar</TabsTrigger>
          <TabsTrigger value="cash">Kasa</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₺{metrics.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  {metrics.revenueChange}% geçen aya göre
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Gider</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₺{metrics.totalExpenses.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                  {metrics.expensesChange}% geçen aya göre
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktif Müşteriler</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.activeCustomers}</div>
                <p className="text-xs text-muted-foreground">
                  Toplam müşteri sayısı
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Ürün</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalProducts}</div>
                <p className="text-xs text-muted-foreground">
                  Stokta bulunan ürünler
                </p>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chat Bot</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Sorularınızı sorun; Gemini destekli asistan yanıtlasın.
                </p>
                <Link href="/chat">
                  <Button variant="default">Chat Bot'u Aç</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stok Hareketleri</CardTitle>
                <Archive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Stok giriş/çıkış hareketlerini görüntüleyin.</p>
                <Link href="/stock-movements">
                  <Button variant="outline" size="sm">Stok Hareketlerine Git</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statistics.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  {stat.icon}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Son İşlemler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((activity) => (
                      <div key={activity.id} className="flex items-center">
                        <div className="ml-4 space-y-1">
                          <p className="text-sm font-medium leading-none">{activity.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(activity.date, 'dd MMMM yyyy HH:mm', { locale: tr })}
                          </p>
                        </div>
                        <div className="ml-auto font-medium">{activity.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div>
                        <Link href={activity.link} className="ml-2">
                          <Button variant="ghost" size="sm">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Henüz bir işlem bulunmamaktadır.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Satış Trendi</CardTitle>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: 8 }}
                      itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                      labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                      wrapperStyle={{ outline: 'none' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#8884d8" activeDot={{ r: 8 }} name="Satışlar" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-7">
              <CardHeader>
                <CardTitle>Chat Bot</CardTitle>
              </CardHeader>
              <CardContent>
                <ChatWidget />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="cash" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-7">
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5" /> Kasa Özeti</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Toplam Nakit</p>
                    <p className="text-2xl font-bold">₺0</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bugünkü Giriş</p>
                    <p className="text-2xl font-bold text-green-600">₺0</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bugünkü Çıkış</p>
                    <p className="text-2xl font-bold text-red-600">₺0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-7">
              <CardHeader>
                <CardTitle>Kasa Hareketleri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Tür</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead className="text-right">Tutar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">Henüz hareket yok.</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Satış ve Alış Analizi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: 8 }}
                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        wrapperStyle={{ outline: 'none' }}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Legend />
                      <Bar dataKey="satış" fill="#8884d8" />
                      <Bar dataKey="alış" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Müşteri Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={customerData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {customerData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: 8 }}
                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        wrapperStyle={{ outline: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-7">
              <CardHeader>
                <CardTitle>Haftalık Gelir-Gider Analizi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: 8 }}
                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        wrapperStyle={{ outline: 'none' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="gelir" stroke="#8884d8" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="gider" stroke="#82ca9d" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Yıllık Finansal Performans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => `₺${value.toLocaleString()}`}
                        contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: 8 }}
                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        wrapperStyle={{ outline: 'none' }}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="gelir" stroke="#8884d8" name="Gelir" />
                      <Line type="monotone" dataKey="gider" stroke="#82ca9d" name="Gider" />
                      <Line type="monotone" dataKey="kar" stroke="#ffc658" name="Kar" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Vergi Özeti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {taxSummary.map((tax, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{tax.type}</p>
                      </div>
                      <div className="text-sm font-medium">₺{tax.amount.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-7">
              <CardHeader>
                <CardTitle>Kategori Bazlı Performans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => `₺${value.toLocaleString()}`}
                        contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: 8 }}
                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        wrapperStyle={{ outline: 'none' }}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Legend />
                      <Bar dataKey="satış" fill="#8884d8" name="Satış" />
                      <Bar dataKey="kar" fill="#82ca9d" name="Kar" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-7">
              <CardHeader>
                <CardTitle>Finansal Özet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Toplam Gelir</p>
                    <p className="text-2xl font-bold">₺{yearlyData[3].gelir.toLocaleString()}</p>
                    <p className="text-xs text-green-500">+{((yearlyData[3].gelir - yearlyData[2].gelir) / yearlyData[2].gelir * 100).toFixed(1)}% geçen yıla göre</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Toplam Gider</p>
                    <p className="text-2xl font-bold">₺{yearlyData[3].gider.toLocaleString()}</p>
                    <p className="text-xs text-red-500">+{((yearlyData[3].gider - yearlyData[2].gider) / yearlyData[2].gider * 100).toFixed(1)}% geçen yıla göre</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Net Kar</p>
                    <p className="text-2xl font-bold">₺{yearlyData[3].kar.toLocaleString()}</p>
                    <p className="text-xs text-green-500">+{((yearlyData[3].kar - yearlyData[2].kar) / yearlyData[2].kar * 100).toFixed(1)}% geçen yıla göre</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Kar Marjı</p>
                    <p className="text-2xl font-bold">%{((yearlyData[3].kar / yearlyData[3].gelir) * 100).toFixed(1)}</p>
                    <p className="text-xs text-green-500">+{(((yearlyData[3].kar / yearlyData[3].gelir) - (yearlyData[2].kar / yearlyData[2].gelir)) * 100).toFixed(1)}% geçen yıla göre</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Maliyetler</h2>
        {/* Maliyetler içeriği buraya gelecek */}
      </div>
    </div>
  );
} 