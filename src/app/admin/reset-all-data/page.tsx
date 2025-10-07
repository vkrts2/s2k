"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as storage from '@/lib/storage';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function ResetAllDataPage() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState("Bekleniyor...");
  const [error, setError] = useState<string | null>(null);
  const [deletedCounts, setDeletedCounts] = useState({ sales: 0, payments: 0 });
  const [totalCounts, setTotalCounts] = useState({ sales: 0, payments: 0 });
  const [isRunning, setIsRunning] = useState(false);

  const startReset = async () => {
      if (!user) {
        setStatus("Giriş yapılmamış. Lütfen önce giriş yapın.");
        setError("Bu işlemi yapmak için yetkiniz yok.");
        return;
      }

      if (!window.confirm("EMİN MİSİNİZ?\n\nBu işlem, hesabınıza ait TÜM satış ve ödeme kayıtlarını Firestore veritabanından kalıcı olarak silecek ve GERİ ALINAMAZ.")) {
        setStatus("İşlem kullanıcı tarafından iptal edildi.");
        return;
      }
      
      setIsRunning(true);
      setError(null);
      
      try {
        setStatus("Tüm satış kayıtları sayılıyor...");
        const allSales = await storage.getSales(user.uid);
        setTotalCounts(prev => ({...prev, sales: allSales.length}));
        
        setStatus("Tüm ödeme kayıtları sayılıyor...");
        const allPayments = await storage.getPayments(user.uid);
        setTotalCounts(prev => ({...prev, payments: allPayments.length}));
        
        setStatus(`Silme işlemi başlıyor: ${allSales.length} satış, ${allPayments.length} ödeme.`);

        for (let i = 0; i < allSales.length; i++) {
          const sale = allSales[i];
          await storage.storageDeleteSale(user.uid, sale.id);
          setDeletedCounts(prev => ({ ...prev, sales: prev.sales + 1 }));
          setStatus(`Satış siliniyor: ${i + 1} / ${allSales.length}`);
        }

        for (let i = 0; i < allPayments.length; i++) {
            const payment = allPayments[i];
            await storage.storageDeletePayment(user.uid, payment.id);
            setDeletedCounts(prev => ({ ...prev, payments: prev.payments + 1 }));
            setStatus(`Ödeme siliniyor: ${i + 1} / ${allPayments.length}`);
        }

        setStatus("Tüm işlemler başarıyla silindi!");
        
      } catch (err: any) {
        console.error("Veri sıfırlama hatası:", err);
        setError(`Bir hata oluştu: ${err.message}`);
        setStatus("İşlem sırasında bir hata oluştu.");
      } finally {
        setIsRunning(false);
      }
  };

  const progress = totalCounts.sales + totalCounts.payments === 0 ? 0 :
    ((deletedCounts.sales + deletedCounts.payments) / (totalCounts.sales + totalCounts.payments)) * 100;

  if (authLoading) {
    return <p>Kullanıcı doğrulanıyor...</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-2xl text-center shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-destructive">VERİ SIFIRLAMA EKRANI</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
            {!isRunning && status === 'Bekleniyor...' && (
                <>
                    <p className="mb-4">Bu aracı kullanarak Firestore veritabanındaki tüm satış ve ödeme verilerinizi kalıcı olarak silebilirsiniz.</p>
                    <Button 
                        size="lg"
                        variant="destructive"
                        onClick={startReset}
                        disabled={!user}
                    >
                        Veritabanını Sıfırla
                    </Button>
                    {!user && <p className="text-sm text-muted-foreground mt-2">Bu işlemi yapmak için giriş yapmış olmalısınız.</p>}
                </>
            )}

            {isRunning && (
                <div className="space-y-4">
                    <p className="text-xl font-mono p-4 bg-background rounded-lg">{status}</p>
                    <Progress value={progress} className="w-full" />
                    <div className="text-lg">
                        <p>Silinen Satış / Toplam: <span className="font-bold">{deletedCounts.sales} / {totalCounts.sales}</span></p>
                        <p>Silinen Ödeme / Toplam: <span className="font-bold">{deletedCounts.payments} / {totalCounts.payments}</span></p>
                    </div>
                </div>
            )}
            
            {!isRunning && status.includes("başarıyla silindi") && (
                 <div className="mt-6 text-center">
                    <p className="text-2xl text-green-600 mb-4 animate-pulse">✓ İşlem Tamamlandı!</p>
                    <p className="mb-4">Tüm veriler temizlendi. Artık bu sayfayı kapatabilir ve normal kullanıma devam edebilirsiniz.</p>
                    <Button asChild>
                        <Link href="/dashboard">Ana Sayfaya Dön</Link>
                    </Button>
                </div>
            )}

            {!isRunning && (status.includes("iptal edildi") || status.includes("hata oluştu")) && (
                <div className="mt-6 text-center">
                    <p className="text-xl text-yellow-500 mb-4">{status}</p>
                     <Button asChild variant="outline">
                        <Link href="/dashboard">Ana Sayfaya Dön</Link>
                    </Button>
                </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
                <p className="font-bold">HATA!</p>
                <p>{error}</p>
              </div>
            )}
            
            <p className="mt-8 text-xs text-muted-foreground">Bu sayfa geçici bir araçtır. İşlem bittikten sonra geliştiricinizden bu sayfayı kaldırmasını isteyin.</p>
        </CardContent>
      </Card>
    </div>
  );
} 