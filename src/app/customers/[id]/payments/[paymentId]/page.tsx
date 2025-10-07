"use client";

import { useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { getPaymentById } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Payment } from '@/lib/types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import BackToHomeButton from '@/components/common/back-to-home-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaymentDetailPage() {
  const { id: customerId, paymentId } = useParams() as { id: string, paymentId: string };
  const { toast } = useToast();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Auth context'ten user bilgisini al

  useEffect(() => {
    if (!user) {
      setError("Kullanıcı oturumu bulunamadı.");
      setLoading(false);
      return;
    }

    if (!customerId || !paymentId) {
      setError("Müşteri veya ödeme ID'si bulunamadı.");
      setLoading(false);
      return;
    }

    const fetchPayment = async () => {
      try {
        // getPaymentById fonksiyonunu user.uid ile çağır
        const fetchedPayment = await getPaymentById(user.uid, paymentId);
        if (fetchedPayment) {
          setPayment(fetchedPayment);
        } else {
          setError("Ödeme bulunamadı.");
        }
      } catch (err) {
        console.error("Ödeme getirilirken hata oluştu:", err);
        setError("Ödeme bilgileri alınırken bir hata oluştu.");
        toast({
          title: "Hata",
          description: "Ödeme bilgileri yüklenirken bir sorun oluştu.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [customerId, paymentId, user, toast]);

  if (loading) {
    return <div className="container mx-auto p-6">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-6 text-red-500">Hata: {error}</div>;
  }

  if (!payment) {
    return <div className="container mx-auto p-6">Ödeme detayı bulunamadı.</div>;
  }

  const methodLabel = payment.method === 'nakit' ? 'Nakit'
    : payment.method === 'krediKarti' ? 'Kredi Kartı'
    : payment.method === 'havale' ? 'Havale/EFT'
    : payment.method === 'cek' ? 'Çek'
    : payment.method === 'diger' ? 'Diğer'
    : payment.method;

  return (
    <div className="container mx-auto p-6">
      <BackToHomeButton />
      <h1 className="text-3xl font-bold mb-6">Ödeme Detayı</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Genel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="font-medium">Tarih:</span> {format(new Date(payment.date), 'dd.MM.yyyy', { locale: tr })}</div>
            <div><span className="font-medium">Yöntem:</span> {methodLabel}</div>
            {payment.referenceNumber && <div><span className="font-medium">Referans No:</span> {payment.referenceNumber}</div>}
            {payment.description && <div><span className="font-medium">Açıklama:</span> {payment.description}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tutar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Number(payment.amount).toLocaleString('tr-TR', { style: 'currency', currency: payment.currency })}</div>
          </CardContent>
        </Card>
      </div>

      {payment.method === 'cek' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Çek Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payment.checkSerialNumber && <div><span className="font-medium">Çek Seri No:</span> {payment.checkSerialNumber}</div>}
            {payment.checkDate && <div><span className="font-medium">Çek Tarihi:</span> {format(new Date(payment.checkDate), 'dd.MM.yyyy', { locale: tr })}</div>}

            {(payment as any).checkImageUrl && (
              <div>
                <div className="font-medium mb-2">Çek Görseli</div>
                <a href={(payment as any).checkImageUrl as string} target="_blank" className="text-blue-500 underline">Görseli yeni sekmede aç</a>
                <div className="mt-3">
                  {(payment as any).checkImageUrl.match(/\.(png|jpe?g|gif|webp)$/i) ? (
                    <img src={(payment as any).checkImageUrl as string} alt="Çek Görseli" className="max-h-64 rounded border" />
                  ) : (
                    <iframe src={(payment as any).checkImageUrl as string} className="w-full h-64 border rounded" />
                  )}
                </div>
              </div>
            )}

            {!((payment as any).checkImageUrl) && (payment as any).checkImageData && (
              <div>
                <div className="font-medium mb-2">Çek Görseli</div>
                {String((payment as any).checkImageData).startsWith('data:application/pdf') ? (
                  <iframe src={(payment as any).checkImageData as string} className="w-full h-64 border rounded" />
                ) : (
                  <img src={(payment as any).checkImageData as string} alt="Çek Görseli" className="max-h-64 rounded border" />
                )}
              </div>
            )}

            {payment.method === 'cek' && !((payment as any).checkImageUrl) && !((payment as any).checkImageData) && (
              <div className="text-sm text-muted-foreground">Çek görseli eklenmemiş veya henüz yüklenmemiş.</div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Kayıt Zamanı</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="font-medium">Oluşturulma:</span> {format(new Date(payment.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr })}</div>
          <div><span className="font-medium">Son Güncelleme:</span> {format(new Date(payment.updatedAt), 'dd.MM.yyyy HH:mm', { locale: tr })}</div>
        </CardContent>
      </Card>
    </div>
  );
} 