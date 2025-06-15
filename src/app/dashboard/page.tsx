"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, BarChart, PieChart } from "@/components/ui/charts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Filter, RefreshCw } from "lucide-react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Transaction {
  id: string;
  date: any;
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

interface SalesData {
  date: string;
  amount: number;
}

interface StockData {
  category: string;
  count: number;
}

interface PaymentData {
  status: string;
  count: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [lastTransactions, setLastTransactions] = useState<Transaction[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalSales: 0,
    totalPurchases: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalProducts: 0,
    lowStockItems: 0,
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Son işlemleri getir
      const transactionsRef = collection(db, "transactions");
      const transactionsQuery = query(
        transactionsRef,
        orderBy("date", "desc"),
        limit(5)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setLastTransactions(transactions);

      // İstatistikleri getir
      const stats = await fetchStatistics();
      setStatistics(stats);

      // Satış verilerini getir
      const sales = await fetchSalesData();
      setSalesData(sales);

      // Stok verilerini getir
      const stock = await fetchStockData();
      setStockData(stock);

      // Ödeme verilerini getir
      const payments = await fetchPaymentData();
      setPaymentData(payments);

    } catch (error) {
      console.error("Dashboard veri yükleme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async (): Promise<Statistics> => {
    // İstatistikleri getir
    return {
      totalSales: 150000,
      totalPurchases: 120000,
      totalCustomers: 45,
      totalSuppliers: 30,
      totalProducts: 200,
      lowStockItems: 5,
    };
  };

  const fetchSalesData = async (): Promise<SalesData[]> => {
    // Satış verilerini getir
    return [
      { date: "2024-01", amount: 25000 },
      { date: "2024-02", amount: 30000 },
      { date: "2024-03", amount: 35000 },
    ];
  };

  const fetchStockData = async (): Promise<StockData[]> => {
    // Stok verilerini getir
    return [
      { category: "Filtreler", count: 100 },
      { category: "Yağlar", count: 150 },
      { category: "Yedek Parçalar", count: 200 },
    ];
  };

  const fetchPaymentData = async (): Promise<PaymentData[]> => {
    // Ödeme verilerini getir
    return [
      { status: "Ödendi", count: 30 },
      { status: "Beklemede", count: 15 },
      { status: "Gecikmiş", count: 5 },
    ];
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Arama işlemi
  };

  const handleExport = () => {
    // PDF çıktı alma
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={fetchDashboardData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Yenile
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            PDF İndir
          </Button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <Input
            placeholder="Müşteri, tedarikçi, ürün veya işlem ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">
            <Search className="w-4 h-4 mr-2" />
            Ara
          </Button>
          <Button type="button" variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtrele
          </Button>
        </div>
      </form>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="sales">Satışlar</TabsTrigger>
          <TabsTrigger value="stock">Stok</TabsTrigger>
          <TabsTrigger value="payments">Ödemeler</TabsTrigger>
          <TabsTrigger value="reports">Raporlar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Toplam Satış</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{statistics.totalSales.toLocaleString('tr-TR')} ₺</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Toplam Alış</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{statistics.totalPurchases.toLocaleString('tr-TR')} ₺</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Toplam Müşteri</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{statistics.totalCustomers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Toplam Tedarikçi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{statistics.totalSuppliers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Toplam Ürün</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{statistics.totalProducts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Düşük Stok</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-500">{statistics.lowStockItems}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Satış Grafiği</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart data={salesData} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Stok Durumu</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart data={stockData} />
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Son İşlemler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Tarih</th>
                      <th className="text-left">İşlem</th>
                      <th className="text-left">Müşteri/Tedarikçi</th>
                      <th className="text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{format(transaction.date.toDate(), 'dd MMMM yyyy', { locale: tr })}</td>
                        <td>{transaction.type}</td>
                        <td>{transaction.partyName}</td>
                        <td className="text-right">{transaction.amount.toLocaleString('tr-TR')} ₺</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          {/* Satış detayları ve grafikleri */}
        </TabsContent>

        <TabsContent value="stock">
          {/* Stok detayları ve grafikleri */}
        </TabsContent>

        <TabsContent value="payments">
          {/* Ödeme detayları ve grafikleri */}
        </TabsContent>

        <TabsContent value="reports">
          {/* Raporlar ve analizler */}
        </TabsContent>
      </Tabs>
    </div>
  );
} 