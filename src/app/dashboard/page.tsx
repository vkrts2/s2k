"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LineChart, BarChart, PieChart } from "@/components/ui/charts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, RefreshCcw, FileText, BarChart3, Package, Users, Receipt, TrendingUp, DollarSign, Archive, CircleDollarSign, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SalesTab } from "@/components/dashboard/sales-tab";
import { StockTab } from "@/components/dashboard/stock-tab";
import { PaymentsTab } from "@/components/dashboard/payments-tab";
import { ReportsTab } from "@/components/dashboard/reports-tab";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

import { collection, query, where, getDocs, orderBy, limit, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
  LineChart as ChartLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

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
  type: 'Fatura' | 'Ödeme' | 'Stok Hareketi' | 'Gider';
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
    try {
      const fetchedTransactions: RecentTransaction[] = [];
      let totalSalesAmount = 0;
      let totalPurchasesAmount = 0;
      let totalCustomers = 0;
      let totalProducts = 0;
      let lowStockCount = 0;
      let pendingPaymentsAmount = 0;

      const salesByDate: { [key: string]: number } = {};

      // Fetch recent invoices
      const invoicesQuery = query(collection(db, "invoices"), orderBy("date", "desc"));
      const invoicesSnapshot = await getDocs(invoicesQuery);
      invoicesSnapshot.forEach(doc => {
        const data = doc.data();
        const invoiceDate = data.date.toDate();
        fetchedTransactions.push({
          id: doc.id,
          type: 'Fatura',
          description: `Fatura Kesildi - ${data.customerName}`,
          amount: data.totalAmount,
          date: invoiceDate,
          link: `/invoices/${doc.id}`,
        });
        totalSalesAmount += data.totalAmount;

        const formattedDate = format(invoiceDate, 'dd.MM');
        salesByDate[formattedDate] = (salesByDate[formattedDate] || 0) + data.totalAmount;
      });

      // Fetch recent payment movements
      const paymentsQuery = query(collection(db, "paymentMovements"), orderBy("date", "desc"), limit(5));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      paymentsSnapshot.forEach(doc => {
        const data = doc.data();
        fetchedTransactions.push({
          id: doc.id,
          type: 'Ödeme',
          description: `${data.type === 'Gelen' ? 'Ödeme Alındı' : 'Ödeme Yapıldı'} - ${data.partyName}`,
          amount: data.amount,
          date: data.date.toDate(),
          link: `/payment-movements`,
        });
        if (data.type === 'Giden') {
          totalPurchasesAmount += data.amount;
        }
      });

      // Fetch recent stock movements
      const stockMovementsQuery = query(collection(db, "stockMovements"), orderBy("date", "desc"), limit(5));
      const stockMovementsSnapshot = await getDocs(stockMovementsQuery);
      stockMovementsSnapshot.forEach(doc => {
        const data = doc.data();
        fetchedTransactions.push({
          id: doc.id,
          type: 'Stok Hareketi',
          description: `Ürün ${data.type} - ${data.productName} (${data.quantity} adet)`,
          amount: 0, // Stock movements don't have a direct monetary amount
          date: data.date.toDate(),
          link: `/stock-movements`,
        });
      });

      // Sort all fetched transactions by date
      fetchedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
      setRecentTransactions(fetchedTransactions.slice(0, 5)); // Show only the latest 5

      // Fetch total customers
      const customersSnapshot = await getDocs(collection(db, "customers"));
      totalCustomers = customersSnapshot.size;

      // Fetch total products and low stock count
      const productsSnapshot = await getDocs(collection(db, "products"));
      totalProducts = productsSnapshot.size;
      productsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.quantity < 10) { // Assuming low stock threshold is 10
          lowStockCount++;
        }
      });

      // Fetch pending payments (simplified: assuming any invoice not fully paid)
      const allInvoicesSnapshot = await getDocs(collection(db, "invoices"));
      allInvoicesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'Ödenmedi' || data.status === 'Kısmi Ödendi') {
          pendingPaymentsAmount += data.totalAmount;
        }
      });

      // Prepare daily sales data for chart
      const sortedSalesData = Object.keys(salesByDate).map(date => ({
        date,
        sales: salesByDate[date],
      })).sort((a, b) => {
        // Split date string "dd.MM" into parts to create a comparable string "MM-dd"
        const [dayA, monthA] = a.date.split('.');
        const [dayB, monthB] = b.date.split('.');
        const dateA = `2000-${monthA}-${dayA}`; // Use a dummy year since we only care about month/day order
        const dateB = `2000-${monthB}-${dayB}`;
        return parseISO(dateA).getTime() - parseISO(dateB).getTime();
      });
      setDailySales(sortedSalesData);

      // Update statistics
      setStatistics([
        { title: "Toplam Satış", value: totalSalesAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }), icon: <DollarSign className="h-4 w-4 text-muted-foreground" />, description: "Tüm zamanların toplam satışları" },
        { title: "Toplam Müşteri", value: totalCustomers.toString(), icon: <Users className="h-4 w-4 text-muted-foreground" />, description: "Sisteme kayıtlı müşteri sayısı" },
        { title: "Toplam Ürün", value: totalProducts.toString(), icon: <Package className="h-4 w-4 text-muted-foreground" />, description: "Mevcut ürün çeşitliliği" },
        { title: "Düşük Stok Ürün", value: lowStockCount.toString(), icon: <Archive className="h-4 w-4 text-muted-foreground" />, description: "Kritik stok seviyesindeki ürünler" },
        { title: "Bekleyen Tahsilatlar", value: pendingPaymentsAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }), icon: <Receipt className="h-4 w-4 text-muted-foreground" />, description: "Vadesi geçmiş veya kısmi ödenmiş faturalar" },
        { title: "Toplam Alış (Ödeme Hareketleri)", value: totalPurchasesAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }), icon: <CircleDollarSign className="h-4 w-4 text-muted-foreground" />, description: "Yapılan toplam tedarikçi ödemeleri" },
      ]);

    } catch (error) {
      console.error("Gösterge paneli verileri yüklenirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Gösterge paneli verileri yüklenirken bir sorun oluştu.",
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
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Son İşlemler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">
                          {activity.type === 'sale' ? 'Satış' : 
                           activity.type === 'purchase' ? 'Alış' : 'Ödeme'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.type === 'sale' || activity.type === 'payment' 
                            ? activity.customer 
                            : activity.supplier}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₺{activity.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{activity.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Hızlı İşlemler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <button className="w-full p-2 text-left hover:bg-accent rounded-lg">
                    Yeni Satış Oluştur
                  </button>
                  <button className="w-full p-2 text-left hover:bg-accent rounded-lg">
                    Yeni Alış Oluştur
                  </button>
                  <button className="w-full p-2 text-left hover:bg-accent rounded-lg">
                    Fatura Oluştur
                  </button>
                  <button className="w-full p-2 text-left hover:bg-accent rounded-lg">
                    Stok Girişi
                  </button>
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
                      <Tooltip />
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
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {customerData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
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
                      <Tooltip />
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
                      <Tooltip formatter={(value) => `₺${value.toLocaleString()}`} />
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
                      <Tooltip formatter={(value) => `₺${value.toLocaleString()}`} />
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
    </div>
  );
} 