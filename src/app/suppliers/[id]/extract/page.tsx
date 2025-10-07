'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSupplierById, getPurchases, getPaymentsToSuppliers } from '@/lib/storage';
import type { Supplier, Purchase, PaymentToSupplier, Currency } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExtractPageProps {
  params: {
    id: string;
  };
}

// Re-using formatCurrencyForPdf and adapting it for general use
const formatCurrency = (amount?: number, currency?: Currency): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }
  const resolvedCurrency = currency || 'TRY';
  try {
    return amount.toLocaleString('tr-TR', { style: 'currency', currency: resolvedCurrency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch (e) {
    console.error("Error formatting currency:", amount, resolvedCurrency, e);
    let symbol: string = resolvedCurrency;
    if (resolvedCurrency === 'TRY') symbol = '₺';
    else if (resolvedCurrency === 'USD') symbol = '$';
    return `${symbol}${amount.toFixed(2)}`;
  }
};

const safeFormatDate = (dateString?: string | null, formatString: string = 'dd.MM.yyyy') => {
  if (!dateString) return '-';
  const date = parseISO(dateString);
  return isValid(date) ? format(date, formatString, { locale: tr }) : 'Geçersiz Tarih';
};

type UnifiedTransaction = (Purchase & { transactionType: 'purchase' }) | (PaymentToSupplier & { transactionType: 'paymentToSupplier' });

export default function ExtractPage({ params }: ExtractPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { id: supplierId } = params;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<PaymentToSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!supplierId) {
      setError("Tedarikçi ID'si bulunamadı.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const fetchedSupplier = await getSupplierById(user.uid, supplierId);
        if (fetchedSupplier) {
          setSupplier(fetchedSupplier);
        } else {
          setError("Tedarikçi bulunamadı.");
        }

        const fetchedPurchases = await getPurchases(user.uid, supplierId);
        setPurchases(fetchedPurchases);

        const fetchedPayments = await getPaymentsToSuppliers(user.uid, supplierId);
        setPayments(fetchedPayments);

      } catch (err) {
        console.error("Ekstre verileri çekilirken hata oluştu:", err);
        setError("Ekstre verileri çekilirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, supplierId, router]);

  const unifiedTransactions = useMemo(() => {
    const purchaseTx: UnifiedTransaction[] = purchases.map(p => ({ ...p, transactionType: 'purchase' as const }));
    const paymentTx: UnifiedTransaction[] = payments.map(p => ({ ...p, transactionType: 'paymentToSupplier' as const }));
    const transactions: UnifiedTransaction[] = [...purchaseTx, ...paymentTx];
    return transactions.sort((a, b) => {
      const dateA = parseISO(a.date);
      const dateB = parseISO(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }, [purchases, payments]);

  const totalPurchases = useMemo(() => {
    return purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  }, [purchases]);

  const totalPayments = useMemo(() => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [payments]);

  const balance = useMemo(() => {
    // For suppliers, balance = total purchases - total payments
    return totalPurchases - totalPayments;
  }, [totalPurchases, totalPayments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Tedarikçi bilgisi yüklenemedi.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 print:p-0 print:m-0 print:w-full print:max-w-none">
      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 0; }
          .container { margin: 0; padding: 0; width: 100% !important; max-width: none !important; }
          .print\:hidden { display: none !important; }
          .print\:block { display: block !important; }
          .print\:text-black { color: black !important; }
          .print\:bg-white { background-color: white !important; }
          h1 { font-size: 1.2rem !important; margin-bottom: 0.2rem !important; }
          h2, h3, h4, h5, h6 { font-size: 0.95rem !important; color: black !important; }
          p, span, div, table, th, td { color: black !important; font-size: 0.7rem !important; line-height: 1.0 !important; }
          .bg-card, .bg-background { background-color: white !important; }
          .text-muted-foreground, .text-gray-500 { color: #333 !important; }
          .text-red-500 { color: #cc0000 !important; }
          .text-green-500 { color: #008000 !important; }
          .border { border: 1px solid #ddd !important; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #eee; padding: 2px; text-align: left; }
          thead { background-color: #f9f9f9; }
          .badge { padding: 0px 3px; border-radius: 1px; font-size: 0.55rem; display: inline-block; }
          .badge.bg-blue-500 { background-color: #3b82f6 !important; color: white !important; }
          .badge.bg-green-500 { background-color: #22c55e !important; color: white !important; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          .space-y-4 > *:not(:last-child) { margin-bottom: 0.1rem; }
          .mb-6 { margin-bottom: 0.5rem; }
          .p-4 { padding: 0.2rem; }
          .md\:p-8 { padding: 0.5rem; }
        }
      `}</style>
      <h1 className="text-3xl font-bold mb-6">Tedarikçi Ekstresi: {supplier.name}</h1>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Genel Bilgiler</CardTitle>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Yazdır
            </Button>
            <Button variant="outline" onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Tedarikçi Ekstresi: ${supplier.name}`,
                  text: 'Tedarikçi ekstresi detaylarını paylaşıyorum.',
                  url: window.location.href
                });
              } else {
                alert('Tarayıcınız paylaşım özelliğini desteklemiyor.');
              }
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-3A2.25 2.25 0 008.25 5.25V9m7.5 0v10.5A2.25 2.25 0 0113.5 21h-3a2.25 2.25 0 01-2.25-2.25V9m7.5 0h-7.5" /></svg>
              Paylaş
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 8l-3-3m3 3l3-3m-9 4.5A2.25 2.25 0 006.75 21h10.5A2.25 2.25 0 0019.5 18.75V9.75A2.25 2.25 0 0017.25 7.5H6.75A2.25 2.25 0 004.5 9.75v9A2.25 2.25 0 006.75 21z" /></svg>
              İndir
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <p className="font-medium">Tedarikçi Adı:</p>
          <p className="print:text-black">{supplier.name}</p>
          <p className="font-medium">Toplam Satın Alma:</p>
          <p className="print:text-black">{formatCurrency(totalPurchases, 'TRY')}</p>
          <p className="font-medium">Toplam Ödeme:</p>
          <p className="print:text-black">{formatCurrency(totalPayments, 'TRY')}</p>
          <p className="font-medium">Bakiye:</p>
          <p className={cn(
            balance > 0 ? "text-red-500 font-bold" : "text-green-500 font-bold",
            "print:text-black"
          )}>
            {formatCurrency(balance, 'TRY')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>İşlem Detayları</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="print:text-black">Tarih</TableHead>
                <TableHead className="print:text-black">İşlem Tipi</TableHead>
                <TableHead className="print:text-black">Açıklama</TableHead>
                <TableHead className="text-right print:text-black">Tutar</TableHead>
                <TableHead className="text-right print:text-black">Toplam</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unifiedTransactions.length > 0 ? (
                (() => {
                  let runningTotal = 0;
                  return unifiedTransactions.map((item) => {
                    // Purchases increase what you owe; payments decrease it
                    runningTotal += item.transactionType === 'purchase' ? item.amount : -item.amount;
                    return (
                      <TableRow key={`${item.transactionType}-${item.id}`}>
                        <TableCell className="print:text-black">{safeFormatDate(item.date, 'dd.MM.yyyy')}</TableCell>
                        <TableCell className="print:text-black">
                          {item.transactionType === 'purchase' ? (
                            <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 print:bg-blue-500 print:text-white">Satın Alma</Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600 print:bg-green-500 print:text-white">Ödeme</Badge>
                          )}
                        </TableCell>
                        <TableCell className="print:text-black">
                          {item.description || '-'}
                          {'method' in item && item.method ? ` (${
                            item.method === 'nakit' ? 'Nakit' :
                            item.method === 'banka' ? 'Banka Havalesi' :
                            item.method === 'krediKarti' ? 'Kredi Kartı' :
                            item.method === 'cek' ? 'Çek' : 'Diğer'
                          })` : ''}
                        </TableCell>
                        <TableCell className="text-right font-medium print:text-black">
                          {formatCurrency(item.amount, item.currency)}
                        </TableCell>
                        <TableCell className="text-right font-bold print:text-black">
                          {formatCurrency(runningTotal, 'TRY')}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 print:text-black">
                    Bu tedarikçi için herhangi bir işlem bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 