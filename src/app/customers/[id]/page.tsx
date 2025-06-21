"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Customer, Sale, Payment } from '@/lib/types';
import { getCustomerById, getSales, getPayments } from '@/lib/storage';
import { CustomerDetailPageClient } from '@/components/customers/customer-detail-page';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = typeof params.id === 'string' ? params.id : undefined;

  const { user, loading: authLoading } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCustomerFound, setIsCustomerFound] = useState(true);

  const router = useRouter();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (!user || !customerId) {
      setIsLoading(false);
      setError("Kullanıcı veya müşteri bilgisi eksik.");
      return;
    }
      try {
      setSales([]);
      setPayments([]);

        const fetchedCustomer = await getCustomerById(user.uid, customerId);
        if (fetchedCustomer) {
          setCustomer(fetchedCustomer);
          setSales(await getSales(user.uid, customerId));
          setPayments(await getPayments(user.uid, customerId));
          document.title = `${fetchedCustomer.name} | Müşteri Detayları | ERMAY`;
        } else {
          setIsCustomerFound(false);
        }
      } catch (e) {
        console.error("Error fetching customer data:", e);
        setError("Müşteri verileri yüklenirken bir hata oluştu.");
      } finally {
        setIsLoading(false);
      }
  }, [customerId, user?.uid]);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [fetchData, authLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Bir Hata Oluştu</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button asChild variant="outline">
          <Link href="/customers">Müşteriler Sayfasına Geri Dön</Link>
        </Button>
      </div>
    );
  }

  if (!isCustomerFound || !customer) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
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

  return (
    <CustomerDetailPageClient
      customer={customer}
      sales={sales}
      payments={payments}
      user={user}
      onDataUpdated={fetchData}
    />
  );
}
