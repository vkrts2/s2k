'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getSaleById, getStockItemById } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { Sale, StockItem, Currency } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

export default function SaleDetailPage() {
  const params = useParams();
  const customerId = params.customerId as string;
  const saleId = params.saleId as string;
  const { user } = useAuth();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockItem, setStockItem] = useState<StockItem | null>(null);
  const router = useRouter();

  const fetchSaleDetails = useCallback(async () => {
    if (!user || !saleId) return;
    setLoading(true);
    try {
      const fetchedSale = await getSaleById(user.uid, saleId);
      if (fetchedSale) {
        setSale(fetchedSale);
        if (fetchedSale.stockItemId && fetchedSale.stockItemId !== 'none') {
          const fetchedStockItem = await getStockItemById(user.uid, fetchedSale.stockItemId);
          setStockItem(fetchedStockItem);
        }
      } else {
        setError('Satış bulunamadı.');
      }
    } catch (err) {
      console.error('Satış detayları çekilirken hata:', err);
      setError('Satış detayları yüklenirken bir hata oluştu.');
      toast({
        title: "Hata",
        description: "Satış detayları yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, saleId, toast]);

  useEffect(() => {
    fetchSaleDetails();
  }, [fetchSaleDetails]);

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

  if (!sale) {
    return <div className="flex justify-center items-center h-screen">Satış bilgisi bulunamadı.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Button onClick={() => router.back()} className="mb-4">Geri Dön</Button>
      <Card>
        <CardHeader>
          <CardTitle>Satış Detayları</CardTitle>
          <CardDescription>Bu satış işlemine ait detaylar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-semibold">Satış ID:</p>
            <p>{sale.id}</p>
          </div>
          <div>
            <p className="font-semibold">Müşteri ID:</p>
            <p>{sale.customerId}</p>
          </div>
          <div>
            <p className="font-semibold">Tutar:</p>
            <p>{formatCurrency(sale.price.amount, sale.price.currency)}</p>
          </div>
          <div>
            <p className="font-semibold">Satış Tarihi:</p>
            <p>{safeFormatDate(sale.date)}</p>
          </div>
          {sale.description && (
            <div>
              <p className="font-semibold">Açıklama:</p>
              <p>{sale.description}</p>
            </div>
          )}
          {sale.stockItemId && sale.stockItemId !== 'none' && (
            <div>
              <p className="font-semibold">Stok Kalemi:</p>
              <p>{stockItem ? `${stockItem.name} (${stockItem.unit || 'Adet'})` : 'Yükleniyor...'}</p>
            </div>
          )}
          {sale.quantitySold && (
            <div>
              <p className="font-semibold">Satılan Miktar:</p>
              <p>{sale.quantitySold}</p>
            </div>
          )}
          {sale.unitPrice && (
            <div>
              <p className="font-semibold">Birim Fiyat:</p>
              <p>{formatCurrency(sale.unitPrice.amount, sale.unitPrice.currency)}</p>
            </div>
          )}
          <div>
            <p className="font-semibold">Oluşturulma Tarihi:</p>
            <p>{safeFormatDate(sale.createdAt)}</p>
          </div>
          <div>
            <p className="font-semibold">Son Güncelleme Tarihi:</p>
            <p>{safeFormatDate(sale.updatedAt)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 