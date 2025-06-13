"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Customer, Sale, Payment } from '@/lib/types';
import { getCustomerById, getSales, getPayments } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
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

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'dd.MM.yyyy', { locale: tr });
  };

  const calculateTotals = () => {
    const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const balance = totalSales - totalPayments;
    return { totalSales, totalPayments, balance };
  };

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

  const { totalSales, totalPayments, balance } = calculateTotals();

  return (
    <div className="container mx-auto p-6 space-y-6 print:p-0">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-3xl font-bold tracking-tight">Müşteri Ekstresi</h1>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Yazdır
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Müşteri Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">{customer.name}</p>
                {customer.email && <p className="text-muted-foreground">{customer.email}</p>}
                {customer.phone && <p className="text-muted-foreground">{customer.phone}</p>}
                {customer.address && <p className="text-muted-foreground">{customer.address}</p>}
              </div>
              <div className="text-right">
                <p className="font-semibold">Tarih: {format(new Date(), 'dd.MM.yyyy', { locale: tr })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Özet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Satış</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSales, 'TRY')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toplam Ödeme</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPayments, 'TRY')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bakiye</p>
                <p className={`text-2xl font-bold ${balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {formatCurrency(balance, 'TRY')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>İşlem Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlem Türü</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="customer-extract-table">
                {[...sales, ...payments]
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell>
                        {transaction.transactionType === 'sale' ? 'Satış' : 'Ödeme'}
                      </TableCell>
                      <TableCell>
                        {transaction.description || '-'}
                        {transaction.transactionType === 'payment' && (transaction as Payment).method && (
                          <span className="text-muted-foreground ml-2">
                            ({(transaction as Payment).method})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 