// src/app/(statements)/suppliers/[id]/statement/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import type { Supplier, Purchase, PaymentToSupplier, Currency, UnifiedTransaction } from '@/lib/types';
import { getSupplierById, getPurchases, getPaymentsToSuppliers } from '@/lib/storage';
import { StatementView } from '@/components/common/statement-view';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { parseISO, isValid } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export default function SupplierStatementPage() {
  const params = useParams();
  const supplierId = typeof params.id === 'string' ? params.id : undefined;

  const { user, loading: authLoading } = useAuth();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [paymentsToSuppliers, setPaymentsToSuppliers] = useState<PaymentToSupplier[]>([]);
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

    if (!supplierId) {
      setError("Tedarikçi ID bulunamadı.");
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
        console.log("Fetching supplier data for ID:", supplierId);
        const fetchedSupplier = await getSupplierById(user.uid, supplierId);
        console.log("Fetched supplier:", fetchedSupplier);
        
        if (fetchedSupplier) {
          setSupplier(fetchedSupplier);
          
          console.log("Fetching purchases data...");
          const purchasesData = await getPurchases(user.uid, supplierId);
          console.log("Fetched purchases:", purchasesData);
          setPurchases(purchasesData || []);
          
          console.log("Fetching payments to supplier data...");
          const paymentsData = await getPaymentsToSuppliers(user.uid, supplierId);
          console.log("Fetched payments to supplier:", paymentsData);
          setPaymentsToSuppliers(paymentsData || []);
          
          document.title = `${fetchedSupplier.name} - Hesap Ekstresi | ERMAY`;
        } else {
          console.error("Supplier not found for ID:", supplierId);
          setError("Tedarikçi bulunamadı.");
        }
      } catch (e: any) {
        console.error("Ekstre verileri yüklenirken hata:", e);
        setError(`Veri yüklenirken bir hata oluştu: ${e.message}. Lütfen giriş yaptığınızdan ve yeterli izne sahip olduğunuzdan emin olun.`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supplierId, user, authLoading]);

  const unifiedTransactions: UnifiedTransaction[] = useMemo(() => {
    if (!supplier) return [];
    
    const safePurchases = Array.isArray(purchases) ? purchases : [];
    const safePaymentsToSuppliers = Array.isArray(paymentsToSuppliers) ? paymentsToSuppliers : [];

    const typedPurchases: UnifiedTransaction[] = safePurchases.map(p => ({ ...p, transactionType: 'purchase' as 'purchase' }));
    const typedPayments: UnifiedTransaction[] = safePaymentsToSuppliers.map(p => ({ ...p, transactionType: 'paymentToSupplier' as 'paymentToSupplier' }));
    
    return [...typedPurchases, ...typedPayments].sort((a, b) => {
      const dateA = parseISO(a.date);
      const dateB = parseISO(b.date);
      if (!isValid(dateA) && !isValid(dateB)) return 0;
      if (!isValid(dateA)) return 1; 
      if (!isValid(dateB)) return -1;
      return dateA.getTime() - dateB.getTime();
    });
  }, [purchases, paymentsToSuppliers, supplier]);

  const balances = useMemo(() => {
    const newBalances: Record<Currency, number> = { USD: 0, TRY: 0 };
    if (!supplier) return newBalances;

    const safePurchases = Array.isArray(purchases) ? purchases : [];
    const safePaymentsToSuppliers = Array.isArray(paymentsToSuppliers) ? paymentsToSuppliers : [];

    safePurchases.forEach(purchase => {
      if (purchase.currency && typeof purchase.amount === 'number') {
        newBalances[purchase.currency] = (newBalances[purchase.currency] || 0) + purchase.amount;
      }
    });

    safePaymentsToSuppliers.forEach(payment => {
      if (payment.currency && typeof payment.amount === 'number') {
        newBalances[payment.currency] = (newBalances[payment.currency] || 0) - payment.amount;
      }
    });

    return newBalances;
  }, [purchases, paymentsToSuppliers, supplier]);

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
          <Link href={supplierId ? `/suppliers/${supplierId}` : "/suppliers"}>Tedarikçi Detaylarına Geri Dön</Link>
        </Button>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Tedarikçi Bulunamadı</h1>
        <p className="text-muted-foreground mb-4">
          Bu ID ({supplierId || 'N/A'}) ile bir tedarikçi bulunamadı.
        </p>
        <Button asChild variant="outline">
          <Link href="/suppliers">Tedarikçiler Sayfasına Geri Dön</Link>
        </Button>
      </div>
    );
  }

  console.log("Rendering StatementView with:", {
    supplier,
    unifiedTransactions,
    balances
  });

  return (
    <div className="min-h-screen bg-background">
      <StatementView
        entity={supplier}
        transactions={unifiedTransactions}
        balances={balances}
        entityType="supplier"
      />
    </div>
  );
}
