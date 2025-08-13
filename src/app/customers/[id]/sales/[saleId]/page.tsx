"use client";

import { useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { getSaleById } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Sale } from '@/lib/types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { QuotationPrintView } from '@/components/quotations/quotation-print-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SaleDetailPage() {
  const { id: customerId, saleId } = useParams() as { id: string, saleId: string };
  const { toast } = useToast();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Auth context'ten user bilgisini al

  useEffect(() => {
    if (!user) {
      setError("Kullanıcı oturumu bulunamadı.");
      setLoading(false);
      return;
    }

    if (!customerId || !saleId) {
      setError("Müşteri veya satış ID'si bulunamadı.");
      setLoading(false);
      return;
    }

    const fetchSale = async () => {
      try {
        // getSaleById fonksiyonunu user.uid ile çağır
        const fetchedSale = await getSaleById(user.uid, saleId);
        if (fetchedSale) {
          setSale(fetchedSale);
        } else {
          setError("Satış bulunamadı.");
        }
      } catch (err) {
        console.error("Satış getirilirken hata oluştu:", err);
        setError("Satış bilgileri alınırken bir hata oluştu.");
        toast({
          title: "Hata",
          description: "Satış bilgileri yüklenirken bir sorun oluştu.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [customerId, saleId, user, toast]);

  if (loading) {
    return <div className="container mx-auto p-6">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-6 text-red-500">Hata: {error}</div>;
  }

  if (!sale) {
    return <div className="container mx-auto p-6">Satış detayı bulunamadı.</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Satış Detayı</h1>
      {sale.invoiceType === 'invoice' && sale.items && sale.items.length > 0 ? (
        <QuotationPrintView quotation={{
          id: sale.id,
          quotationNumber: 'INV-'+sale.id,
          date: sale.date,
          customerName: '',
          items: sale.items as any,
          subTotal: sale.subtotal || 0,
          taxRate: 0,
          taxAmount: sale.taxAmount || 0,
          grandTotal: sale.amount || 0,
          currency: sale.currency as any,
          status: 'Gönderildi',
          notes: '',
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
        }} customer={null} />
      ) : (
        <div className="grid gap-4">
          <p><strong>Tutar:</strong> {sale.amount} {sale.currency}</p>
          <p><strong>Tarih:</strong> {format(new Date(sale.date), 'dd.MM.yyyy', { locale: tr })}</p>
          {sale.description && <p><strong>Açıklama:</strong> {sale.description}</p>}
          <p><strong>Oluşturulma Tarihi:</strong> {format(new Date(sale.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr })}</p>
          <p><strong>Son Güncelleme:</strong> {format(new Date(sale.updatedAt), 'dd.MM.yyyy HH:mm', { locale: tr })}</p>
        </div>
      )}
    </div>
  );
} 