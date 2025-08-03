"use client";

import React, { useState, useEffect } from 'react';
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
  PieChart,
  LineChart,
  Target,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import BackToHomeButton from '@/components/common/back-to-home-button';
import { useAuth } from '@/contexts/AuthContext';

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

  // Mock KPI data
  const kpis: KPI[] = [
    {
      title: "Aylık Satış",
      value: "₺125,450",
      change: 12.5,
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-green-600"
    },
    {
      title: "Müşteri Sayısı",
      value: "1,234",
      change: 8.2,
      icon: <Users className="h-4 w-4" />,
      color: "text-blue-600"
    },
    {
      title: "Ortalama Sipariş",
      value: "₺2,450",
      change: -3.1,
      icon: <ShoppingCart className="h-4 w-4" />,
      color: "text-orange-600"
    },
    {
      title: "Stok Değeri",
      value: "₺89,230",
      change: 5.7,
      icon: <Package className="h-4 w-4" />,
      color: "text-purple-600"
    }
  ];

  // Mock chart data
  const salesData: ChartData[] = [
    { name: "Ocak", value: 45000, color: "#3b82f6" },
    { name: "Şubat", value: 52000, color: "#3b82f6" },
    { name: "Mart", value: 48000, color: "#3b82f6" },
    { name: "Nisan", value: 61000, color: "#3b82f6" },
    { name: "Mayıs", value: 55000, color: "#3b82f6" },
    { name: "Haziran", value: 67000, color: "#3b82f6" }
  ];

  const customerSegmentData: ChartData[] = [
    { name: "Kurumsal", value: 45, color: "#ef4444" },
    { name: "Bireysel", value: 30, color: "#f59e0b" },
    { name: "Ortaklık", value: 25, color: "#10b981" }
  ];

  const productPerformanceData: ChartData[] = [
    { name: "Ürün A", value: 35, color: "#8b5cf6" },
    { name: "Ürün B", value: 28, color: "#06b6d4" },
    { name: "Ürün C", value: 22, color: "#f97316" },
    { name: "Ürün D", value: 15, color: "#84cc16" }
  ];

  const refreshData = async () => {
    setLoading(true);
    try {
      // Simüle edilmiş veri yenileme
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Veriler Güncellendi",
        description: "İş zekası verileri başarıyla yenilendi.",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Veriler yenilenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
      
      {/* Header */}
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <div className={kpi.color}>{kpi.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className={`flex items-center text-xs ${
                kpi.change > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {kpi.change > 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(kpi.change)}% geçen döneme göre
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Satış Trendi */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChart className="mr-2 h-5 w-5" />
              Satış Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {salesData.map((item, index) => (
                <div key={index} className="flex flex-col items-center space-y-2">
                  <div 
                    className="w-8 rounded-t"
                    style={{ 
                      height: `${(item.value / 67000) * 200}px`,
                      backgroundColor: item.color 
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Son 6 ay satış performansı
            </div>
          </CardContent>
        </Card>

        {/* Müşteri Segmentasyonu */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              Müşteri Segmentasyonu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customerSegmentData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Müşteri dağılımı
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Analysis */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* En Çok Satan Ürünler */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              En Çok Satan Ürünler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {productPerformanceData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{item.name}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full"
                        style={{ 
                          width: `${item.value}%`,
                          backgroundColor: item.color 
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tahminleme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              Satış Tahmini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">₺145,000</div>
                <div className="text-sm text-muted-foreground">Gelecek Ay Tahmini</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Güven Aralığı</span>
                  <span className="font-medium">%85</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Büyüme Oranı</span>
                  <span className="font-medium text-green-600">+15.6%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Karşılaştırmalı Analiz */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Dönem Karşılaştırması
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Bu Ay</span>
                <span className="font-medium">₺125,450</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Geçen Ay</span>
                <span className="font-medium">₺111,230</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Değişim</span>
                <span className="font-medium text-green-600">+12.8%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Gelişmiş Analitik</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Müşteri Yaşam Boyu Değeri</h4>
              <div className="text-2xl font-bold text-blue-600">₺8,450</div>
              <p className="text-sm text-muted-foreground">Ortalama müşteri değeri</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Stok Devir Hızı</h4>
              <div className="text-2xl font-bold text-orange-600">4.2x</div>
              <p className="text-sm text-muted-foreground">Yıllık stok devir oranı</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 