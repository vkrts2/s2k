"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomerById, getSales, getPayments } from '@/lib/storage';
import type { Customer, Sale, Payment, Currency } from '@/lib/types';
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

type UnifiedTransaction = (Sale & { transactionType: 'sale' }) | (Payment & { transactionType: 'payment' });

// Ödeme yöntemi Türkçeleştirme fonksiyonu
const getPaymentMethodLabel = (method?: string) => {
  switch (method) {
    case 'nakit':
      return 'Nakit';
    case 'krediKarti':
      return 'Kredi Kartı';
    case 'havale':
      return 'Havale';
    case 'cek':
      return 'Çek';
    case 'diger':
      return 'Diğer';
    default:
      return '-';
  }
};

export default function CustomerExtractPage({ params }: ExtractPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { id: customerId } = params;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!customerId) {
      setError("Müşteri ID'si bulunamadı.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const fetchedCustomer = await getCustomerById(user.uid, customerId);
        if (fetchedCustomer) {
          setCustomer(fetchedCustomer);
        } else {
          setError("Müşteri bulunamadı.");
        }

        const fetchedSales = await getSales(user.uid, customerId);
        setSales(fetchedSales.filter(s => typeof s.amount === 'number'));

        const fetchedPayments = await getPayments(user.uid, customerId);
        setPayments(fetchedPayments.filter(p => typeof p.amount === 'number'));

      } catch (err) {
        console.error("Ekstre verileri çekilirken hata oluştu:", err);
        setError("Ekstre verileri çekilirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, customerId, router]);

  // Basit mobil tespiti
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    setIsMobile(mobile);
  }, []);

  // ?print=1 geldiğinde, veri yüklendikten sonra ve kaynaklar hazır olunca yazdırmayı tetikle
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const wantsPrint = params.get('print') === '1';
    if (!wantsPrint) return;
    if (loading) return;
    const waitForResources = async () => {
      // Yazı tipleri
      try { await (document as any).fonts?.ready; } catch {}
      // Görseller
      const imgs = Array.from(document.images || []);
      await Promise.allSettled(
        imgs.map(img => (img.complete && img.naturalWidth > 0) ? Promise.resolve(true) : new Promise(res => {
          img.addEventListener('load', () => res(true), { once: true });
          img.addEventListener('error', () => res(true), { once: true });
        }))
      );
      // Reflow için küçük gecikme
      await new Promise(res => setTimeout(res, 200));
    };

    const run = async () => {
      await waitForResources();
      // iOS için biraz daha bekleme
      await new Promise(res => setTimeout(res, 400));
      try {
        window.print();
      } catch (e) {
        console.warn('window.print çağrısı başarısız oldu:', e);
      } finally {
        params.delete('print');
        const clean = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        window.history.replaceState({}, '', clean);
      }
    };

    const timer = setTimeout(run, 100);
    return () => clearTimeout(timer);
  }, [loading]);

  const unifiedTransactions = useMemo(() => {
    const transactions: UnifiedTransaction[] = [...sales, ...payments];
    return transactions.sort((a, b) => {
      const dateA = parseISO(a.date);
      const dateB = parseISO(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }, [sales, payments]);

  const totalSales = useMemo(() => {
    return sales.reduce((sum, sale) => sum + sale.amount, 0);
  }, [sales]);

  const totalPayments = useMemo(() => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [payments]);

  const balance = useMemo(() => {
    return totalSales - totalPayments;
  }, [totalSales, totalPayments]);

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

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Müşteri bilgisi yüklenemedi.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 print:p-0 print:m-0 print:w-full print:max-w-none pb-[calc(env(safe-area-inset-bottom,0)+16px)]">
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
      <h1 className="text-3xl font-bold mb-6">Müşteri Ekstresi: {customer.name}</h1>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Genel Bilgiler</CardTitle>
          <div className="flex gap-2 flex-wrap print:hidden">
            <Button
              variant="outline"
              onClick={() => {
                if (typeof window === 'undefined') return;
                if (isMobile) {
                  const params = new URLSearchParams(window.location.search);
                  params.set('print', '1');
                  const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
                  // iOS Safari'de aynı sekmede gezinmek daha güvenilir
                  window.location.assign(url);
                } else {
                  window.print();
                }
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Yazdır
            </Button>
            <Button variant="outline" onClick={async () => {
              try {
                const shareUrl = window.location.origin + window.location.pathname + '?print=1';
                if ((navigator as any).share) {
                  await (navigator as any).share({
                    title: `Müşteri Ekstresi: ${customer.name}`,
                    text: 'Müşteri ekstresi detaylarını paylaşıyorum.',
                    url: shareUrl,
                  });
                } else {
                  // Fallback: linki panoya kopyala
                  await navigator.clipboard.writeText(shareUrl);
                  alert('Paylaşım desteklenmiyor. Bağlantı panoya kopyalandı.');
                }
              } catch (e) {
                // iOS veya permission hatalarında kopyalama fallback
                try {
                  const fallbackUrl = window.location.origin + window.location.pathname;
                  await navigator.clipboard.writeText(fallbackUrl);
                  alert('Paylaşım başarısız. Bağlantı panoya kopyalandı.');
                } catch {}
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
          <p className="font-medium">Müşteri Adı:</p>
          <p className="print:text-black">{customer.name}</p>
          <p className="font-medium">Toplam Satış:</p>
          <p className="print:text-black">{formatCurrency(totalSales, 'TRY')}</p>
          <p className="font-medium">Toplam Ödeme:</p>
          <p className="print:text-black">{formatCurrency(totalPayments, 'TRY')}</p>
          <p className="font-medium">Bakiye:</p>
          <p className={cn(
            "font-bold",
            balance > 0 ? "text-red-500" : "text-green-500",
            "print:text-black"
          )}>
            {formatCurrency(balance, 'TRY')}
            {balance > 0 ? " (Borçlu)" : " (Alacaklı)"}
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
                <TableHead>Tarih</TableHead>
                <TableHead>İşlem Tipi</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Ödeme Yöntemi</TableHead>
                <TableHead className="text-right">Borç</TableHead>
                <TableHead className="text-right">Alacak</TableHead>
                <TableHead className="text-right">Bakiye</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unifiedTransactions.length > 0 ? (
                (() => {
                  let runningTotal = 0;
                  return unifiedTransactions.map((item) => {
                    const isSale = item.transactionType === 'sale';
                    runningTotal += isSale ? item.amount : -item.amount;
                    return (
                      <TableRow key={`${item.transactionType}-${item.id}`}>
                        <TableCell>{safeFormatDate(item.date, 'dd.MM.yyyy')}</TableCell>
                        <TableCell>
                          {isSale ? (
                            <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Satış</Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">Ödeme</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.description || '-'}
                        </TableCell>
                        <TableCell>
                          {!isSale ? getPaymentMethodLabel(item.method) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {isSale ? formatCurrency(item.amount, item.currency) : '-'}
                        </TableCell>
                         <TableCell className="text-right font-medium text-green-600">
                          {!isSale ? formatCurrency(item.amount, item.currency) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(runningTotal, 'TRY')}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Bu müşteri için herhangi bir işlem bulunamadı.
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