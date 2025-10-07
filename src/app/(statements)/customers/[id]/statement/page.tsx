// src/app/(statements)/customers/[id]/statement/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import type { Customer, Sale, Payment, Currency, UnifiedTransaction } from '@/lib/types';
import { getCustomerById, getSales, getPayments } from '@/lib/storage';
import { StatementView } from '@/components/common/statement-view';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { parseISO, isValid } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomerStatementPage() {
  const params = useParams();
  const customerId = typeof params.id === 'string' ? params.id : undefined;

  const { user, loading: authLoading } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (authLoading) {
      return;
    }

    if (!user) {
      setIsLoading(false);
      setError("Bu sayfayı görüntülemek için giriş yapmalısınız.");
      return;
    }

    if (!customerId) {
      setError("Müşteri ID bulunamadı.");
      setIsLoading(false);
      return;
    }

    if (!user.uid) {
      setError("Kullanıcı kimliği bulunamadı. Lütfen giriş yaptığınızdan emin olun.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log("Fetching customer data for ID:", customerId);
        const fetchedCustomer = await getCustomerById(user.uid, customerId);
        console.log("Fetched customer:", fetchedCustomer);
        
        if (fetchedCustomer) {
          setCustomer(fetchedCustomer);
          
          console.log("Fetching sales data...");
          const salesData = await getSales(user.uid, customerId);
          console.log("Fetched sales:", salesData);
          setSales(salesData || []);
          
          console.log("Fetching payments data...");
          const paymentsData = await getPayments(user.uid, customerId);
          console.log("Fetched payments:", paymentsData);
          setPayments(paymentsData || []);
          
          document.title = `${fetchedCustomer.name} - Hesap Ekstresi | ERMAY`;
        } else {
          console.error("Customer not found for ID:", customerId);
          setError("Müşteri bulunamadı.");
        }
      } catch (e: any) {
        console.error("Ekstre verileri yüklenirken hata:", e);
        setError(`Veri yüklenirken bir hata oluştu: ${e.message}. Lütfen giriş yaptığınızdan ve yeterli izne sahip olduğunuzdan emin olun.`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [customerId, user, authLoading]);

  const unifiedTransactions: UnifiedTransaction[] = useMemo(() => {
    if (!customer) return [];
    
    const safeSales = Array.isArray(sales) ? sales : [];
    const safePayments = Array.isArray(payments) ? payments : [];

    const typedSales: UnifiedTransaction[] = safeSales.map(s => ({ ...s, transactionType: 'sale' as 'sale' }));
    const typedPayments: UnifiedTransaction[] = safePayments.map(p => ({ ...p, transactionType: 'payment' as 'payment' }));
    
    return [...typedSales, ...typedPayments].sort((a, b) => {
      const dateA = parseISO(a.date);
      const dateB = parseISO(b.date);
      if (!isValid(dateA) && !isValid(dateB)) return 0;
      if (!isValid(dateA)) return 1; 
      if (!isValid(dateB)) return -1;
      return dateA.getTime() - dateB.getTime(); 
    });
  }, [sales, payments, customer]);

  const balances = useMemo(() => {
    const newBalances: Record<Currency, number> = { USD: 0, TRY: 0 };
    if (!customer) return newBalances;

    const safeSales = Array.isArray(sales) ? sales : [];
    const safePayments = Array.isArray(payments) ? payments : [];

    safeSales.forEach(sale => {
      if (sale.currency && typeof sale.amount === 'number') {
        newBalances[sale.currency] = (newBalances[sale.currency] || 0) + sale.amount;
      }
    });

    safePayments.forEach(payment => {
      if (payment.currency && typeof payment.amount === 'number') {
        newBalances[payment.currency] = (newBalances[payment.currency] || 0) - payment.amount;
      }
    });

    return newBalances;
  }, [sales, payments, customer]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Ekstre verileri yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Bir Hata Oluştu</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button asChild variant="outline">
          <Link href={customerId ? `/customers/${customerId}` : "/customers"}>Müşteri Detaylarına Geri Dön</Link>
        </Button>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Müşteri Bulunamadı</h1>
        <p className="text-muted-foreground mb-4">
          Bu ID ({customerId || 'N/A'}) ile bir müşteri bulunamadı.
        </p>
        <Button asChild variant="outline">
          <Link href="/customers">Müşteriler Sayfasına Geri Dön</Link>
        </Button>
      </div>
    );
  }

  console.log("Rendering StatementView with:", {
    customer,
    unifiedTransactions,
    balances
  });

  return (
    <div className="min-h-screen bg-background">
      <StatementView
        entity={customer}
        transactions={unifiedTransactions}
        balances={balances}
        entityType="customer"
      />
    </div>
  );
}
