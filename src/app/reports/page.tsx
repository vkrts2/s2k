"use client";

import React, { useState, useEffect } from 'react';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Sale, Payment, Purchase, PaymentToSupplier } from '@/lib/types';
import { format, getMonth, getYear, startOfMonth, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface MonthlyData {
  month: string;
  sales: number;
  purchases: number;
  profit: number;
}

const ReportsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [totalReceivables, setTotalReceivables] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [netStatus, setNetStatus] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    setIsLoading(true);
    let unsubscribeSales: (() => void) | null = null;
    let unsubscribePayments: (() => void) | null = null;
    let unsubscribePurchases: (() => void) | null = null;
    let unsubscribePaymentsToSuppliers: (() => void) | null = null;
    let sales: Sale[] = [];
    let payments: Payment[] = [];
    let purchases: Purchase[] = [];
    let paymentsToSuppliers: PaymentToSupplier[] = [];

    const fetchData = () => {
      // Calculate total receivables
      const totalSales = sales.reduce((acc, sale) => acc + sale.amount, 0);
      const totalPayments = payments.reduce((acc, payment) => acc + payment.amount, 0);
      const receivables = totalSales - totalPayments;
      setTotalReceivables(receivables);
      // Calculate total debt
      const totalPurchases = purchases.reduce((acc, purchase) => acc + purchase.amount, 0);
      const totalPaymentsToSuppliers = paymentsToSuppliers.reduce((acc, payment) => acc + payment.amount, 0);
      const debt = totalPurchases - totalPaymentsToSuppliers;
      setTotalDebt(debt);
      // Calculate net status
      setNetStatus(receivables - debt);
      // Populate available years for filter
      const years = new Set<number>();
      [...sales, ...purchases].forEach(item => {
        if (item.date) {
          years.add(getYear(new Date(item.date)));
        }
      });
      setAvailableYears(Array.from(years).sort((a, b) => b - a));
      setIsLoading(false);
    };

    unsubscribeSales = onSnapshot(collection(db, `users/${user.uid}/sales`), (snapshot: QuerySnapshot<DocumentData>) => {
      sales = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Sale));
      fetchData();
    });
    unsubscribePayments = onSnapshot(collection(db, `users/${user.uid}/payments`), (snapshot: QuerySnapshot<DocumentData>) => {
      payments = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Payment));
      fetchData();
    });
    unsubscribePurchases = onSnapshot(collection(db, `users/${user.uid}/purchases`), (snapshot: QuerySnapshot<DocumentData>) => {
      purchases = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Purchase));
      fetchData();
    });
    unsubscribePaymentsToSuppliers = onSnapshot(collection(db, `users/${user.uid}/paymentsToSuppliers`), (snapshot: QuerySnapshot<DocumentData>) => {
      paymentsToSuppliers = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as PaymentToSupplier));
      fetchData();
    });
    return () => {
      if (unsubscribeSales) unsubscribeSales();
      if (unsubscribePayments) unsubscribePayments();
      if (unsubscribePurchases) unsubscribePurchases();
      if (unsubscribePaymentsToSuppliers) unsubscribePaymentsToSuppliers();
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    let unsubscribeSales: (() => void) | null = null;
    let unsubscribePurchases: (() => void) | null = null;
    let sales: Sale[] = [];
    let purchases: Purchase[] = [];
    const calculateMonthlyData = () => {
      const data: MonthlyData[] = [];
      for (let i = 0; i < 12; i++) {
        const monthName = format(new Date(selectedYear, i), 'MMMM', { locale: tr });
        const monthlySales = sales
          .filter(sale => {
            const saleDate = new Date(sale.date);
            return getYear(saleDate) === selectedYear && getMonth(saleDate) === i;
          })
          .reduce((acc, sale) => acc + sale.amount, 0);
        const monthlyPurchases = purchases
          .filter(purchase => {
            const purchaseDate = new Date(purchase.date);
            return getYear(purchaseDate) === selectedYear && getMonth(purchaseDate) === i;
          })
          .reduce((acc, purchase) => acc + purchase.amount, 0);
        data.push({
          month: monthName,
          sales: monthlySales,
          purchases: monthlyPurchases,
          profit: monthlySales - monthlyPurchases,
        });
      }
      setMonthlyData(data);
    };
    unsubscribeSales = onSnapshot(collection(db, `users/${user.uid}/sales`), (snapshot: QuerySnapshot<DocumentData>) => {
      sales = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Sale));
      calculateMonthlyData();
    });
    unsubscribePurchases = onSnapshot(collection(db, `users/${user.uid}/purchases`), (snapshot: QuerySnapshot<DocumentData>) => {
      purchases = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Purchase));
      calculateMonthlyData();
    });
    return () => {
      if (unsubscribeSales) unsubscribeSales();
      if (unsubscribePurchases) unsubscribePurchases();
    };
  }, [user, authLoading, selectedYear]);

  if (authLoading || isLoading) {
    return <div>Yükleniyor...</div>;
  }
  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Giriş Yapmanız Gerekiyor</h1>
        <p className="text-muted-foreground mb-4">Bu sayfayı görüntülemek için lütfen giriş yapın.</p>
        <Link href="/login" className="px-4 py-2 bg-indigo-600 text-white rounded">Giriş Yap</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold">Genel Raporlar</h1>
      
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Toplam Alacak</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{totalReceivables.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Toplam Borç</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{totalDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Durum</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netStatus >= 0 ? 'text-green-600' : 'text-red-600'}`}>{netStatus.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            <p className="text-sm text-gray-500">{netStatus >= 0 ? 'Karlı Durumdasınız' : 'Zarar Durumundasınız'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Analysis Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Aylık Analiz</h2>
            <Select onValueChange={(value: string) => setSelectedYear(parseInt(value))} value={selectedYear.toString()}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Yıl Seçin" />
                </SelectTrigger>
                <SelectContent>
                    {availableYears.map((year: number) => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        {/* Monthly Data Table */}
        <Card className="mb-8">
            <CardHeader>
                <CardTitle>{selectedYear} Yılı Aylık Döküm</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ay</TableHead>
                            <TableHead className="text-right">Toplam Satış</TableHead>
                            <TableHead className="text-right">Toplam Alış</TableHead>
                            <TableHead className="text-right">Aylık Kar/Zarar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {monthlyData.map((data: MonthlyData) => (
                            <TableRow key={data.month}>
                                <TableCell>{data.month}</TableCell>
                                <TableCell className="text-right text-green-500">{data.sales.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</TableCell>
                                <TableCell className="text-right text-red-500">{data.purchases.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</TableCell>
                                <TableCell className={`text-right font-bold ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{data.profit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        
        {/* Monthly Chart */}
        <Card>
            <CardHeader>
                <CardTitle>{selectedYear} Yılı Satış ve Alış Grafiği</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', notation: 'compact' }).format(value)} />
                        <Tooltip formatter={(value: any) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value))} />
                        <Legend />
                        <Bar dataKey="sales" fill="#22C55E" name="Satışlar" />
                        <Bar dataKey="purchases" fill="#EF4444" name="Alışlar" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage; 