"use client";

import { useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { getPaymentById } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Payment } from '@/lib/types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

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

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Ödeme Detayı</h1>
      <div className="grid gap-4">
        <p><strong>Tutar:</strong> {payment.amount} {payment.currency}</p>
        <p><strong>Tarih:</strong> {format(new Date(payment.date), 'dd.MM.yyyy', { locale: tr })}</p>
        <p><strong>Yöntem:</strong> {payment.method}</p>
        {payment.referenceNumber && <p><strong>Referans No:</strong> {payment.referenceNumber}</p>}
        {payment.description && <p><strong>Açıklama:</strong> {payment.description}</p>}
        {payment.checkSerialNumber && <p><strong>Çek Seri No:</strong> {payment.checkSerialNumber}</p>}
        {payment.checkDate && <p><strong>Çek Tarihi:</strong> {format(new Date(payment.checkDate), 'dd.MM.yyyy', { locale: tr })}</p>}
        {(payment as any).checkImageUrl && (
          <div>
            <strong>Çek Görseli:</strong>
            <div className="mt-2">
              <a href={(payment as any).checkImageUrl as string} target="_blank" className="text-blue-500 underline">Görseli yeni sekmede aç</a>
              <div className="mt-3">
                {/* Görsel ise küçük önizleme göster */}
                {(payment as any).checkImageUrl.match(/\.(png|jpe?g|gif|webp)$/i) ? (
                  <img src={(payment as any).checkImageUrl as string} alt="Çek Görseli" className="max-h-64 rounded border" />
                ) : (
                  <iframe src={(payment as any).checkImageUrl as string} className="w-full h-64 border rounded" />
                )}
              </div>
            </div>
          </div>
        )}
        {!((payment as any).checkImageUrl) && (payment as any).checkImageData && (
          <div>
            <strong>Çek Görseli:</strong>
            <div className="mt-3">
              {String((payment as any).checkImageData).startsWith('data:application/pdf') ? (
                <iframe src={(payment as any).checkImageData as string} className="w-full h-64 border rounded" />
              ) : (
                <img src={(payment as any).checkImageData as string} alt="Çek Görseli" className="max-h-64 rounded border" />
              )}
            </div>
          </div>
        )}
        {!((payment as any).checkImageUrl) && !((payment as any).checkImageData) && (
          <div className="text-sm text-muted-foreground">Çek görseli eklenmemiş veya henüz yüklenmemiş.</div>
        )}
        <p><strong>Oluşturulma Tarihi:</strong> {format(new Date(payment.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr })}</p>
        <p><strong>Son Güncelleme:</strong> {format(new Date(payment.updatedAt), 'dd.MM.yyyy HH:mm', { locale: tr })}</p>
      </div>
    </div>
  );
} 