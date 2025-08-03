"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bot, 
  FileText, 
  AlertTriangle, 
  Users, 
  BarChart3,
  Settings,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import BackToHomeButton from '@/components/common/back-to-home-button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  analyzeWithGemini, 
  generateInvoiceContent, 
  analyzeStockLevels, 
  generateCustomerReminder,
  generateReportSummary,
  predictChurn,
  analyzeProductRelationships,
  AIAnalysisResult 
} from '@/lib/ai-utils';

interface AIFeature {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  lastRun: string;
  status: 'running' | 'idle' | 'error';
  icon: React.ReactNode;
  aiFunction?: (data: any) => Promise<AIAnalysisResult>;
  sampleData?: any;
}

interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
  status: 'success' | 'error' | 'warning';
  aiResponse?: string;
}

export default function AIPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [showResponse, setShowResponse] = useState(false);

  const [aiFeatures, setAiFeatures] = useState<AIFeature[]>([
    {
      id: 'invoice-generation',
      name: 'Otomatik Fatura Oluşturma',
      description: 'Satış sonrası otomatik fatura oluşturur',
      isActive: true,
      lastRun: '2024-01-15T10:30:00Z',
      status: 'idle',
      icon: <FileText className="h-5 w-5" />,
      aiFunction: generateInvoiceContent,
      sampleData: {
        customerName: 'Ahmet Yılmaz',
        amount: '2500 TL',
        date: '2024-01-15',
        description: 'Ürün A ve B satışı'
      }
    },
    {
      id: 'stock-alerts',
      name: 'Stok Uyarıları',
      description: 'Kritik seviyedeki stoklar için bildirimler',
      isActive: true,
      lastRun: '2024-01-15T09:15:00Z',
      status: 'idle',
      icon: <AlertTriangle className="h-5 w-5" />,
      aiFunction: analyzeStockLevels,
      sampleData: [
        { name: 'Ürün A', quantity: 5, minLevel: 10 },
        { name: 'Ürün B', quantity: 15, minLevel: 8 },
        { name: 'Ürün C', quantity: 2, minLevel: 5 }
      ]
    },
    {
      id: 'customer-tracking',
      name: 'Müşteri Takibi',
      description: 'Otomatik müşteri hatırlatmaları',
      isActive: false,
      lastRun: '2024-01-14T16:45:00Z',
      status: 'idle',
      icon: <Users className="h-5 w-5" />,
      aiFunction: generateCustomerReminder,
      sampleData: {
        name: 'Fatma Demir',
        lastPurchase: '2024-01-10',
        totalSpent: '8500 TL'
      }
    },
    {
      id: 'report-automation',
      name: 'Rapor Otomasyonu',
      description: 'Haftalık/aylık otomatik raporlar',
      isActive: true,
      lastRun: '2024-01-15T08:00:00Z',
      status: 'idle',
      icon: <BarChart3 className="h-5 w-5" />,
      aiFunction: generateReportSummary,
      sampleData: {
        monthlySales: 125450,
        customerCount: 1234,
        avgOrderValue: 2450,
        topProducts: ['Ürün A', 'Ürün B', 'Ürün C']
      }
    }
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: '1',
      action: 'Fatura Oluşturuldu',
      user: 'AI Sistemi',
      timestamp: '2024-01-15T10:30:00Z',
      details: 'Satış #12345 için otomatik fatura oluşturuldu',
      status: 'success'
    },
    {
      id: '2',
      action: 'Stok Uyarısı',
      user: 'AI Sistemi',
      timestamp: '2024-01-15T09:15:00Z',
      details: 'Ürün A stok seviyesi kritik seviyeye düştü',
      status: 'warning'
    },
    {
      id: '3',
      action: 'Müşteri Hatırlatması',
      user: 'AI Sistemi',
      timestamp: '2024-01-15T08:45:00Z',
      details: 'Ahmet Yılmaz için ödeme hatırlatması gönderildi',
      status: 'success'
    },
    {
      id: '4',
      action: 'Rapor Oluşturuldu',
      user: 'AI Sistemi',
      timestamp: '2024-01-15T08:00:00Z',
      details: 'Haftalık satış raporu otomatik oluşturuldu',
      status: 'success'
    }
  ]);

  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  const toggleFeature = async (featureId: string) => {
    setLoading(true);
    try {
      const updatedFeatures = aiFeatures.map(feature => 
        feature.id === featureId 
          ? { ...feature, isActive: !feature.isActive }
          : feature
      );
      setAiFeatures(updatedFeatures);
      
      toast({
        title: "Başarılı",
        description: `AI özelliği ${aiFeatures.find(f => f.id === featureId)?.isActive ? 'devre dışı' : 'etkin'} bırakıldı.`,
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "AI özelliği güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runFeature = async (featureId: string) => {
    setLoading(true);
    setShowResponse(false);
    setAiResponse('');
    
    try {
      const feature = aiFeatures.find(f => f.id === featureId);
      if (!feature || !feature.aiFunction || !feature.sampleData) {
        throw new Error('AI function not available');
      }

      // Update status to running
      const updatedFeatures = aiFeatures.map(f => 
        f.id === featureId 
          ? { ...f, status: 'running' as const }
          : f
      );
      setAiFeatures(updatedFeatures);

      // Call AI function
      const result = await feature.aiFunction(feature.sampleData);
      
      if (result.success && result.data) {
        setAiResponse(result.data);
        setShowResponse(true);
        
        // Update status to idle
        const finalFeatures = aiFeatures.map(f => 
          f.id === featureId 
            ? { ...f, status: 'idle' as const, lastRun: new Date().toISOString() }
            : f
        );
        setAiFeatures(finalFeatures);
        
        // Add audit log
        const newLog: AuditLog = {
          id: Date.now().toString(),
          action: `${feature.name} Çalıştırıldı`,
          user: 'Kullanıcı',
          timestamp: new Date().toISOString(),
          details: 'AI özelliği manuel olarak çalıştırıldı',
          status: 'success',
          aiResponse: result.data
        };
        setAuditLogs(prev => [newLog, ...prev]);
        
        toast({
          title: "Başarılı",
          description: "AI özelliği başarıyla çalıştırıldı.",
        });
      } else {
        throw new Error(result.error || 'AI analysis failed');
      }
    } catch (error) {
      // Update status to error
      const errorFeatures = aiFeatures.map(f => 
        f.id === featureId 
          ? { ...f, status: 'error' as const }
          : f
      );
      setAiFeatures(errorFeatures);
      
      toast({
        title: "Hata",
        description: "AI özelliği çalıştırılırken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 text-green-600 animate-spin" />;
      case 'idle':
        return <Pause className="h-4 w-4 text-gray-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Yapay Zeka</h2>
          <p className="text-muted-foreground">Otomatik işlemler ve akıllı özellikler</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={realTimeUpdates}
              onCheckedChange={setRealTimeUpdates}
            />
            <Label>Anlık Güncellemeler</Label>
          </div>
          <Button onClick={() => window.location.reload()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </div>

      {/* AI Features */}
      <div className="grid gap-6 md:grid-cols-2">
        {aiFeatures.map((feature) => (
          <Card key={feature.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {feature.icon}
                  <span>{feature.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(feature.status)}
                  <Switch
                    checked={feature.isActive}
                    onCheckedChange={() => toggleFeature(feature.id)}
                    disabled={loading}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {feature.description}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Son Çalışma:</span>
                  <span>{new Date(feature.lastRun).toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Durum:</span>
                  <span className={`capitalize ${
                    feature.status === 'running' ? 'text-green-600' :
                    feature.status === 'error' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {feature.status === 'running' ? 'Çalışıyor' :
                     feature.status === 'idle' ? 'Beklemede' :
                     feature.status === 'error' ? 'Hata' : 'Bilinmiyor'}
                  </span>
                </div>
                <Button 
                  onClick={() => runFeature(feature.id)}
                  disabled={loading || !feature.isActive}
                  size="sm"
                  className="w-full"
                >
                  {loading && feature.status === 'running' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      İşleniyor...
                    </>
                  ) : (
                    'Şimdi Çalıştır'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Response */}
      {showResponse && aiResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bot className="mr-2 h-5 w-5" />
              AI Yanıtı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={aiResponse}
              readOnly
              className="min-h-[200px] font-mono text-sm"
              placeholder="AI yanıtı burada görünecek..."
            />
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Audit Log (İşlem Kayıtları)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{log.action}</h4>
                    <p className="text-sm text-muted-foreground">{log.details}</p>
                    {log.aiResponse && (
                      <details className="mt-2">
                        <summary className="text-sm text-blue-600 cursor-pointer">
                          AI Yanıtını Göster
                        </summary>
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          {log.aiResponse}
                        </div>
                      </details>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs ${getStatusColor(log.status)}`}>
                      {log.status === 'success' ? 'Başarılı' :
                       log.status === 'error' ? 'Hata' :
                       log.status === 'warning' ? 'Uyarı' : 'Bilinmiyor'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString('tr-TR')}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Kullanıcı: {log.user}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Updates Status */}
      {realTimeUpdates && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
              Anlık Güncellemeler Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sistem anlık güncellemeler alıyor. Tüm değişiklikler otomatik olarak kaydediliyor.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 