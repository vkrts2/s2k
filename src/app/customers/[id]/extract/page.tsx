"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import type { Customer, Sale, Payment, Currency } from '@/lib/types';
import { getCustomerById, getSales, getPayments } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Printer } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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

export default function CustomerExtractPage() {
  const params = useParams();
  const customerId = typeof params.id === 'string' ? params.id : undefined;
  const { user, loading: authLoading } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsLoading(false);
      setError("Bu sayfayı görüntülemek için giriş yapmalısınız.");
      return;
    }

    if (!customerId) {
      setIsLoading(false);
      setError("Müşteri ID'si bulunamadı.");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedCustomer = await getCustomerById(user.uid, customerId);
        if (fetchedCustomer) {
          setCustomer(fetchedCustomer);
          setSales(await getSales(user.uid, customerId));
          setPayments(await getPayments(user.uid, customerId));
          document.title = `${fetchedCustomer.name} | Müşteri Ekstresi | ERMAY`;
        } else {
          setError("Müşteri bulunamadı.");
        }
      } catch (e) {
        console.error("Error fetching customer data:", e);
        setError("Müşteri verileri yüklenirken bir hata oluştu.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [customerId, user, authLoading]);

  const unifiedTransactions = useMemo(() => {
    const transactions: Array<Sale | Payment> = [...sales, ...payments];
    return transactions.sort((a, b) => {
      const dateA = parseISO(a.date);
      const dateB = parseISO(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }, [sales, payments]);

  const { totalSales, totalPayments, balance } = useMemo(() => {
    const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const balance = totalSales - totalPayments;
    return { totalSales, totalPayments, balance };
  }, [sales, payments]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Hata</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Müşteri Bulunamadı</h1>
        <p className="text-muted-foreground mb-4">
          Aradığınız müşteri bulunamadı veya erişim sırasında bir sorun oluştu.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 print:p-0 print:m-0 print:w-full print:max-w-none">
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
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-3xl font-bold tracking-tight">Müşteri Ekstresi: {customer.name}</h1>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Yazdır
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Genel Bilgiler</CardTitle>
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
                  <TableHead className="print:text-black">İşlem Türü</TableHead>
                  <TableHead className="print:text-black">Açıklama</TableHead>
                  <TableHead className="text-right print:text-black">Tutar</TableHead>
                  <TableHead className="text-right print:text-black">Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="customer-extract-table">
                {unifiedTransactions.length > 0 ? (
                  (() => {
                    let runningTotal = 0;
                    return unifiedTransactions.map((transaction) => {
                      // Satışlar bakiyeyi artırır, ödemeler azaltır (tedarikçinin tersi)
                      runningTotal += (transaction.transactionType === 'sale' ? transaction.amount : -transaction.amount);
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell className="print:text-black">{safeFormatDate(transaction.date)}</TableCell>
                          <TableCell className="print:text-black">
                            {transaction.transactionType === 'sale' ? (
                              <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 print:bg-blue-500 print:text-white">Satış</Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-500 hover:bg-green-600 print:bg-green-500 print:text-white">Ödeme</Badge>
                            )}
                          </TableCell>
                          <TableCell className="print:text-black">
                            {transaction.description || '-'}
                            {transaction.transactionType === 'payment' && (transaction as Payment).method && (
                              ` (${(transaction as Payment).method === 'nakit' ? 'Nakit' :
                                  (transaction as Payment).method === 'krediKarti' ? 'Kredi Kartı' :
                                  (transaction as Payment).method === 'havale' ? 'Havale/EFT' :
                                  (transaction as Payment).method === 'cek' ? 'Çek' : 'Diğer'})`
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium print:text-black">
                            {formatCurrency(transaction.amount, transaction.currency)}
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
                      Bu müşteri için herhangi bir işlem bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 