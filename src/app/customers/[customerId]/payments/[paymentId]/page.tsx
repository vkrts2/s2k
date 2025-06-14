'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getPaymentById } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { Payment, Currency } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import Image from 'next/image';

export default function PaymentDetailPage() {
  const params = useParams();
  const customerId = params.customerId as string;
  const paymentId = params.paymentId as string;
  const { user } = useAuth();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchPaymentDetails = useCallback(async () => {
    if (!user || !paymentId) return;
    setLoading(true);
    try {
      const fetchedPayment = await getPaymentById(user.uid, paymentId);
      if (fetchedPayment) {
        setPayment(fetchedPayment);
      } else {
        setError('Ödeme bulunamadı.');
      }
    } catch (err) {
      console.error('Ödeme detayları çekilirken hata:', err);
      setError('Ödeme detayları yüklenirken bir hata oluştu.');
      toast({
        title: "Hata",
        description: "Ödeme detayları yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, paymentId, toast]);

  useEffect(() => {
    fetchPaymentDetails();
  }, [fetchPaymentDetails]);

  const formatCurrency = (amount: number, currency: Currency): string => {
    return amount.toLocaleString('tr-TR', { style: 'currency', currency });
  };

  const safeFormatDate = (dateString: string | Date): string => {
    if (!dateString) return '-';
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return isValid(date) ? format(date, 'dd.MM.yyyy', { locale: tr }) : 'Geçersiz Tarih';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">Hata: {error}</div>;
  }

  if (!payment) {
    return <div className="flex justify-center items-center h-screen">Ödeme bilgisi bulunamadı.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Button onClick={() => router.back()} className="mb-4">Geri Dön</Button>
      <Card>
        <CardHeader>
          <CardTitle>Ödeme Detayları</CardTitle>
          <CardDescription>Bu ödeme işlemine ait detaylar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-semibold">Ödeme ID:</p>
            <p>{payment.id}</p>
          </div>
          <div>
            <p className="font-semibold">Müşteri ID:</p>
            <p>{payment.customerId}</p>
          </div>
          <div>
            <p className="font-semibold">Tutar:</p>
            <p>{formatCurrency(payment.amount, payment.currency)}</p>
          </div>
          <div>
            <p className="font-semibold">Ödeme Tarihi:</p>
            <p>{safeFormatDate(payment.date)}</p>
          </div>
          <div>
            <p className="font-semibold">Ödeme Yöntemi:</p>
            <p>{payment.method}</p>
          </div>
          {payment.referenceNumber && (
            <div>
              <p className="font-semibold">Referans No:</p>
              <p>{payment.referenceNumber}</p>
            </div>
          )}
          {payment.description && (
            <div>
              <p className="font-semibold">Açıklama:</p>
              <p>{payment.description}</p>
            </div>
          )}

          {payment.method === 'cek' && (
            <>
              {payment.checkDate && (
                <div>
                  <p className="font-semibold">Çek Tarihi:</p>
                  <p>{safeFormatDate(payment.checkDate)}</p>
                </div>
              )}
              {payment.checkInfo && (
                <div>
                  <p className="font-semibold">Çek Bilgileri:</p>
                  <p>{payment.checkInfo}</p>
                </div>
              )}
              {payment.checkImage1 && (
                <div>
                  <p className="font-semibold">Çek Görseli 1:</p>
                  <Image src={payment.checkImage1} alt="Çek Görseli 1" width={300} height={200} objectFit="contain" />
                </div>
              )}
              {payment.checkImage2 && (
                <div>
                  <p className="font-semibold">Çek Görseli 2:</p>
                  <Image src={payment.checkImage2} alt="Çek Görseli 2" width={300} height={200} objectFit="contain" />
                </div>
              )}
            </>
          )}

          <div>
            <p className="font-semibold">Oluşturulma Tarihi:</p>
            <p>{safeFormatDate(payment.createdAt)}</p>
          </div>
          <div>
            <p className="font-semibold">Son Güncelleme Tarihi:</p>
            <p>{safeFormatDate(payment.updatedAt)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 