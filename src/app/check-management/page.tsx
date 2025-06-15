'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPayments, getCustomerById } from '@/lib/storage';
import type { Payment, Customer, Currency } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Currency formatting utility (reused from extract page)
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

// Date formatting utility (reused from extract page)
const safeFormatDate = (dateString?: string | null, formatString: string = 'dd.MM.yyyy') => {
  if (!dateString) return '-';
  const date = parseISO(dateString);
  return isValid(date) ? format(date, formatString, { locale: tr }) : 'Geçersiz Tarih';
};

export default function CheckManagementPage() {
  const { user } = useAuth();
  const [checkPayments, setCheckPayments] = useState<Array<Payment & { customerName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setError("Kullanıcı oturumu bulunamadı. Lütfen giriş yapın.");
      setLoading(false);
      return;
    }

    const fetchCheckPayments = async () => {
      try {
        setLoading(true);
        const allPayments = await getPayments(user.uid);
        const filteredCheckPayments = allPayments.filter(payment => payment.method === 'cek');

        const paymentsWithCustomerNames = await Promise.all(
          filteredCheckPayments.map(async (payment) => {
            const customer = await getCustomerById(user.uid, payment.customerId);
            return {
              ...payment,
              customerName: customer ? customer.name : 'Bilinmeyen Müşteri',
            };
          })
        );
        setCheckPayments(paymentsWithCustomerNames);
      } catch (err) {
        console.error("Çek ödemeleri çekilirken hata oluştu:", err);
        setError("Çek ödemeleri yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchCheckPayments();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Çek ödemeleri yükleniyor...</p>
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

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Çek Yönetimi</h1>

      <Card>
        <CardHeader>
          <CardTitle>Müşteri Çekleri</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Müşteri Adı</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Çek Tarihi</TableHead>
                <TableHead>Çek Seri No</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkPayments.length > 0 ? (
                checkPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.customerName}</TableCell>
                    <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                    <TableCell>{safeFormatDate(payment.date)}</TableCell>
                    <TableCell>{safeFormatDate(payment.checkDate)}</TableCell>
                    <TableCell>{payment.checkSerialNumber || '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Henüz kaydedilmiş çek ödemesi bulunmamaktadır.
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