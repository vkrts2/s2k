"use client";

import { useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { getSaleById, getCustomerById } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Sale, Customer, QuotationItem } from '@/lib/types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { QuotationPrintView } from '@/components/quotations/quotation-print-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import BackToHomeButton from '@/components/common/back-to-home-button';

export default function SaleDetailPage() {
  const { id: customerId, saleId } = useParams() as { id: string, saleId: string };
  const { toast } = useToast();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Auth context'ten user bilgisini al
  const [customer, setCustomer] = useState<Customer | null>(null);

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
          // Müşteriyi de getir
          const cust = await getCustomerById(user.uid, customerId);
          if (cust) setCustomer(cust);
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

  const isInvoice = (sale as any).invoiceType === 'invoice';

  if (isInvoice) {
    // Faturalı satış görünümü (mevcut tasarım)
    const hasItems = Array.isArray((sale as any).items) && (sale as any).items.length > 0;
    const items: QuotationItem[] = hasItems
      ? (sale as any).items
      : [{
          id: '1',
          productName: sale.description || 'Satış',
          description: sale.description || 'Satış',
          quantity: typeof sale.quantity === 'number' ? sale.quantity : 1,
          unitPrice: typeof sale.unitPrice === 'number' ? sale.unitPrice : (typeof sale.amount === 'number' ? sale.amount : 0),
          total: typeof sale.subtotal === 'number' && sale.subtotal > 0 ? sale.subtotal : (typeof sale.amount === 'number' ? sale.amount : 0),
          taxRate: typeof sale.taxRate === 'number' ? sale.taxRate : 0,
          unit: 'adet',
        }];
    const subTotal = typeof sale.subtotal === 'number' && sale.subtotal > 0
      ? sale.subtotal
      : items.reduce((s, it) => s + (Number(it.quantity) * Number(it.unitPrice)), 0);
    const taxAmount = typeof sale.taxAmount === 'number' ? sale.taxAmount : (subTotal * ((typeof sale.taxRate === 'number' ? sale.taxRate : 0) / 100));
    const grandTotal = typeof sale.amount === 'number' && sale.amount > 0 ? sale.amount : (subTotal + taxAmount);

    return (
      <div className="container mx-auto p-6">
        <BackToHomeButton />
        <h1 className="text-3xl font-bold mb-6">Satış Detayı</h1>
        <QuotationPrintView quotation={{
          id: sale.id,
          quotationNumber: 'INV-' + sale.id,
          date: sale.date,
          customerName: customer?.name || '',
          customerAddress: customer?.address,
          customerPhone: customer?.phone,
          customerTaxOffice: customer?.taxOffice,
          items: items as any,
          subTotal,
          taxRate: typeof sale.taxRate === 'number' ? sale.taxRate : 0,
          taxAmount,
          grandTotal,
          currency: sale.currency as any,
          status: 'Gönderildi',
          notes: '',
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
        }} customer={customer} />
      </div>
    );
  }

  // Manuel satış görünümü (basit tasarım, KDV yok)
  const manualItems: QuotationItem[] = Array.isArray((sale as any).items) && (sale as any).items.length > 0
    ? (sale as any).items
    : [{
        id: '1',
        productName: sale.description || 'Satış',
        description: sale.description || 'Satış',
        quantity: typeof sale.quantity === 'number' ? sale.quantity : 1,
        unitPrice: typeof sale.unitPrice === 'number' ? sale.unitPrice : (typeof sale.amount === 'number' ? sale.amount : 0),
        total: typeof sale.amount === 'number' ? sale.amount : 0,
        taxRate: 0,
        unit: 'adet',
      }];
  const manualSubtotal = manualItems.reduce((s, it) => s + (Number(it.quantity) * Number(it.unitPrice)), 0);
  const manualGrandTotal = typeof sale.amount === 'number' && sale.amount > 0 ? sale.amount : manualSubtotal;

  return (
    <div className="container mx-auto p-6">
      <BackToHomeButton />
      <h1 className="text-3xl font-bold mb-6">Satış Detayı</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Genel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="font-medium">Müşteri:</span> {customer?.name || '-'}</div>
            <div><span className="font-medium">Tarih:</span> {format(new Date(sale.date), 'dd.MM.yyyy', { locale: tr })}</div>
            <div><span className="font-medium">Para Birimi:</span> {sale.currency}</div>
            {sale.description && <div><span className="font-medium">Açıklama:</span> {sale.description}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tutar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {manualGrandTotal.toLocaleString('tr-TR', { style: 'currency', currency: sale.currency })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Kalemler</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead className="text-right">Birim Fiyat</TableHead>
                <TableHead className="text-right">Toplam</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manualItems.map((it, idx) => (
                <TableRow key={it.id || idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{it.productName || it.description}</TableCell>
                  <TableCell className="text-right">{Number(it.quantity).toLocaleString('tr-TR')}</TableCell>
                  <TableCell className="text-right">{Number(it.unitPrice).toLocaleString('tr-TR', { style: 'currency', currency: sale.currency })}</TableCell>
                  <TableCell className="text-right">{(Number(it.quantity) * Number(it.unitPrice)).toLocaleString('tr-TR', { style: 'currency', currency: sale.currency })}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} className="text-right font-medium">Toplam</TableCell>
                <TableCell className="text-right font-bold">{manualGrandTotal.toLocaleString('tr-TR', { style: 'currency', currency: sale.currency })}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 