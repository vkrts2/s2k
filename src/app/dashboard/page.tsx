'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, Users, BellRing, Calendar, Filter, Search, Download, FileText, MessageSquare, CheckSquare, AlertTriangle, TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 6)),
    to: new Date()
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("TRY");
  const [activeTab, setActiveTab] = useState("overview");

  // Örnek veriler (gerçek uygulamada API'den gelecek)
  const totalSales = 125000.75;
  const totalPayments = 85000.50;
  const averageSaleAmount = 520.30;
  const totalCustomers = 120;
  const totalStockItems = 150;
  const lowStockAlerts = 5;
  const pendingTasks = 8;
  const unreadMessages = 3;
  const monthlyGrowth = 12;
  const customerSatisfaction = 85;

  const monthlySalesData = [
    { month: 'Ocak', sales: 15000, payments: 10000, profit: 5000 },
    { month: 'Şubat', sales: 20000, payments: 12000, profit: 8000 },
    { month: 'Mart', sales: 18000, payments: 11000, profit: 7000 },
    { month: 'Nisan', sales: 22000, payments: 15000, profit: 7000 },
    { month: 'Mayıs', sales: 25000, payments: 18000, profit: 7000 },
    { month: 'Haziran', sales: 30000, payments: 20000, profit: 10000 },
  ];

  const currencyData = [
    { name: 'TL', value: 75000 },
    { name: 'USD', value: 50000 },
  ];

  const COLORS = ['#0088FE', '#00C49F'];

  const recentActivities = [
    { type: 'sale', description: 'Yeni satış: Ahmet Yılmaz', amount: '₺1,250', date: '2024-03-15' },
    { type: 'payment', description: 'Ödeme alındı: Mehmet Demir', amount: '₺850', date: '2024-03-14' },
    { type: 'task', description: 'Görev tamamlandı: Stok kontrolü', date: '2024-03-13' },
    { type: 'message', description: 'Yeni mesaj: Ayşe Kaya', date: '2024-03-12' },
  ];

  const stockAlerts = [
    { name: 'Ürün A', current: 5, minimum: 10 },
    { name: 'Ürün B', current: 3, minimum: 15 },
    { name: 'Ürün C', current: 8, minimum: 20 },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Gösterge Paneli</h2>
        <div className="flex items-center gap-4">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Para Birimi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRY">TL</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="sales">Satışlar</TabsTrigger>
          <TabsTrigger value="customers">Müşteriler</TabsTrigger>
          <TabsTrigger value="stock">Stok</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Ana Metrikler */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Satışlar</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedCurrency === 'TRY' ? '₺' : '$'}
                  {totalSales.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                  Geçen aydan %{monthlyGrowth} arttı
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Ödemeler</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedCurrency === 'TRY' ? '₺' : '$'}
                  {totalPayments.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                  Geçen aydan %8 arttı
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Müşteri</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCustomers}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                  Geçen aydan %5 artış
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Müşteri Memnuniyeti</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">%{customerSatisfaction}</div>
                <Progress value={customerSatisfaction} className="h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Grafikler ve Detaylı Bilgiler */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Satış ve Ödeme Trendleri</CardTitle>
                <CardDescription>Son 6 ayın satış ve ödeme grafiği</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlySalesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="sales" stroke="#8884d8" fill="#8884d8" name="Satışlar" />
                      <Area type="monotone" dataKey="payments" stroke="#82ca9d" fill="#82ca9d" name="Ödemeler" />
                      <Area type="monotone" dataKey="profit" stroke="#ffc658" fill="#ffc658" name="Kar" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Para Birimi Dağılımı</CardTitle>
                <CardDescription>Satışların para birimine göre dağılımı</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currencyData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {currencyData.map((entry, index) => (
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

          {/* Aktivite ve Görevler */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Son Aktiviteler</CardTitle>
                <CardDescription>Son işlemler ve aktiviteler</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {activity.type === 'sale' && <DollarSign className="h-4 w-4 text-blue-500" />}
                        {activity.type === 'payment' && <DollarSign className="h-4 w-4 text-green-500" />}
                        {activity.type === 'task' && <CheckSquare className="h-4 w-4 text-purple-500" />}
                        {activity.type === 'message' && <MessageSquare className="h-4 w-4 text-yellow-500" />}
                        <span className="text-sm">{activity.description}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(activity.date), 'dd MMM yyyy', { locale: tr })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stok Uyarıları</CardTitle>
                <CardDescription>Düşük stok seviyesindeki ürünler</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stockAlerts.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.name}</span>
                        <Badge variant="destructive">
                          {item.current} / {item.minimum}
                        </Badge>
                      </div>
                      <Progress value={(item.current / item.minimum) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hızlı İşlemler</CardTitle>
                <CardDescription>Sık kullanılan işlemler</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline">
                  <Link href="/customers/new">Yeni Müşteri</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/sales/new">Yeni Satış</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/stock/new">Stok Ekle</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/reports">Raporlar</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          {/* Satış detayları buraya gelecek */}
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          {/* Müşteri detayları buraya gelecek */}
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          {/* Stok detayları buraya gelecek */}
        </TabsContent>
      </Tabs>
    </div>
  );
} 