"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  ShoppingCart, 
  TrendingDown, 
  DollarSign,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  RefreshCw,
  Eye,
  Activity
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import BackToHomeButton from '@/components/common/back-to-home-button';
import { useAuth } from '@/contexts/AuthContext';

interface CustomerBehavior {
  segment: string;
  avgOrderValue: number;
  frequency: number;
  lastPurchase: string;
  totalCustomers: number;
}

interface ProductRelationship {
  productA: string;
  productB: string;
  confidence: number;
  support: number;
  lift: number;
}

interface ChurnData {
  customerId: string;
  customerName: string;
  churnProbability: number;
  lastActivity: string;
  totalSpent: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface LifetimeValue {
  customerId: string;
  customerName: string;
  ltv: number;
  avgOrderValue: number;
  purchaseFrequency: number;
  segment: string;
}

export default function DataMiningPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [loading, setLoading] = useState(false);

  // Mock data for customer behavior analysis
  const customerBehaviorData: CustomerBehavior[] = [
    { segment: "Yüksek Değer", avgOrderValue: 2500, frequency: 8.5, lastPurchase: "2024-01-15", totalCustomers: 45 },
    { segment: "Orta Değer", avgOrderValue: 1200, frequency: 4.2, lastPurchase: "2024-01-10", totalCustomers: 120 },
    { segment: "Düşük Değer", avgOrderValue: 450, frequency: 1.8, lastPurchase: "2024-01-05", totalCustomers: 85 }
  ];

  // Mock data for product relationships
  const productRelationshipData: ProductRelationship[] = [
    { productA: "Ürün A", productB: "Ürün B", confidence: 0.75, support: 0.45, lift: 1.8 },
    { productA: "Ürün C", productB: "Ürün D", confidence: 0.62, support: 0.32, lift: 1.5 },
    { productA: "Ürün E", productB: "Ürün F", confidence: 0.88, support: 0.28, lift: 2.1 },
    { productA: "Ürün G", productB: "Ürün H", confidence: 0.45, support: 0.18, lift: 1.2 }
  ];

  // Mock data for churn analysis
  const churnData: ChurnData[] = [
    { customerId: "C001", customerName: "Ahmet Yılmaz", churnProbability: 0.85, lastActivity: "2024-01-01", totalSpent: 15000, riskLevel: 'high' },
    { customerId: "C002", customerName: "Fatma Demir", churnProbability: 0.45, lastActivity: "2024-01-10", totalSpent: 8500, riskLevel: 'medium' },
    { customerId: "C003", customerName: "Mehmet Kaya", churnProbability: 0.15, lastActivity: "2024-01-15", totalSpent: 22000, riskLevel: 'low' },
    { customerId: "C004", customerName: "Ayşe Özkan", churnProbability: 0.72, lastActivity: "2024-01-05", totalSpent: 6500, riskLevel: 'high' }
  ];

  // Mock data for lifetime value
  const ltvData: LifetimeValue[] = [
    { customerId: "C001", customerName: "Ahmet Yılmaz", ltv: 45000, avgOrderValue: 2500, purchaseFrequency: 8.5, segment: "VIP" },
    { customerId: "C002", customerName: "Fatma Demir", ltv: 28000, avgOrderValue: 1800, purchaseFrequency: 6.2, segment: "Premium" },
    { customerId: "C003", customerName: "Mehmet Kaya", ltv: 65000, avgOrderValue: 3200, purchaseFrequency: 12.1, segment: "VIP" },
    { customerId: "C004", customerName: "Ayşe Özkan", ltv: 15000, avgOrderValue: 1200, purchaseFrequency: 3.8, segment: "Standard" }
  ];

  const refreshData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Veriler Güncellendi",
        description: "Veri madenciliği analizleri yenilendi.",
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

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'VIP': return 'bg-purple-100 text-purple-800';
      case 'Premium': return 'bg-blue-100 text-blue-800';
      case 'Standard': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Veri Madenciliği</h2>
          <p className="text-muted-foreground">Gelişmiş veri analizi ve tahminleme</p>
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

      {/* Customer Behavior Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Müşteri Davranış Analizi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {customerBehaviorData.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">{item.segment}</h3>
                  <span className="text-sm text-muted-foreground">{item.totalCustomers} müşteri</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Ortalama Sipariş:</span>
                    <span className="font-medium">₺{item.avgOrderValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Satın Alma Sıklığı:</span>
                    <span className="font-medium">{item.frequency}/ay</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Son Satın Alma:</span>
                    <span className="font-medium">{new Date(item.lastPurchase).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Product Relationship Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Ürün İlişki Analizi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {productRelationshipData.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">{item.productA} → {item.productB}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    item.lift > 1.5 ? 'bg-green-100 text-green-800' :
                    item.lift > 1.2 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    Lift: {item.lift.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Güven:</span>
                    <div className="font-medium">%{(item.confidence * 100).toFixed(1)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Destek:</span>
                    <div className="font-medium">%{(item.support * 100).toFixed(1)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lift Oranı:</span>
                    <div className="font-medium">{item.lift.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Churn Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingDown className="mr-2 h-5 w-5" />
            Churn Analizi (Müşteri Kaybı Tahminleme)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {churnData.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-medium">{item.customerName}</h3>
                    <p className="text-sm text-muted-foreground">ID: {item.customerId}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${getRiskLevelColor(item.riskLevel)}`}>
                    {item.riskLevel === 'high' ? 'Yüksek Risk' :
                     item.riskLevel === 'medium' ? 'Orta Risk' : 'Düşük Risk'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Churn Olasılığı:</span>
                    <div className="font-medium">%{(item.churnProbability * 100).toFixed(1)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Toplam Harcama:</span>
                    <div className="font-medium">₺{item.totalSpent.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Son Aktivite:</span>
                    <div className="font-medium">{new Date(item.lastActivity).toLocaleDateString('tr-TR')}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Risk Seviyesi:</span>
                    <div className="font-medium">{item.riskLevel.toUpperCase()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lifetime Value Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5" />
            Müşteri Yaşam Boyu Değeri (LTV)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ltvData.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-medium">{item.customerName}</h3>
                    <p className="text-sm text-muted-foreground">ID: {item.customerId}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${getSegmentColor(item.segment)}`}>
                    {item.segment}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">LTV:</span>
                    <div className="font-medium text-green-600">₺{item.ltv.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ortalama Sipariş:</span>
                    <div className="font-medium">₺{item.avgOrderValue.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Satın Alma Sıklığı:</span>
                    <div className="font-medium">{item.purchaseFrequency}/ay</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Segment:</span>
                    <div className="font-medium">{item.segment}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 