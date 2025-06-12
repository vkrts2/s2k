"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setIsLoading(false);
      setError("Bu sayfayı görüntülemek için giriş yapmalısınız.");
      return;
    }
    
    if (!customerId) {
      setIsLoading(false);
      setIsCustomerFound(false);
      document.title = "Müşteri Bulunamadı | ERMAY";
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
          setIsCustomerFound(true);
          document.title = `${fetchedCustomer.name} | Müşteri Detayları | ERMAY`;
        } else {
          setIsCustomerFound(false);
          document.title = "Müşteri Bulunamadı | ERMAY";
        }
      } catch (e) {
        console.error("Error fetching customer data:", e);
        setError("Müşteri verileri yüklenirken bir hata oluştu.");
        setIsCustomerFound(false);
        document.title = "Hata Oluştu | ERMAY";
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [customerId, user, authLoading]);

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Müşteri verileri yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Giriş Yapmanız Gerekiyor</h1>
        <p className="text-muted-foreground mb-4">
          Bu sayfayı görüntülemek için lütfen giriş yapın.
        </p>
        <Button asChild>
          <Link href="/login">Giriş Yap</Link>
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Bir Hata Oluştu</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button asChild>
          <Link href="/customers">Müşteriler Sayfasına Geri Dön</Link>
        </Button>
      </div>
    );
  }

  if (!isCustomerFound) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Müşteri Bulunamadı</h1>
        <p className="text-muted-foreground mb-4">
          Aradığınız ID ({customerId || 'N/A'}) ile bir müşteri bulunamadı veya erişim sırasında bir sorun oluştu.
        </p>
        <Button asChild className="mt-4">
          <Link href="/customers">Müşteriler Sayfasına Geri Dön</Link>
        </Button>
      </div>
    );
  }

  if (!customer) {
    console.error("Render condition error: Customer not found, but no specific error/not-found state was set appropriately.");
     return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Beklenmedik Bir Hata</h1>
        <p className="text-muted-foreground mb-4">Müşteri bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>
        <Button asChild className="mt-4">
          <Link href="/customers">Müşteriler Sayfasına Geri Dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <CustomerDetailPageClient
      customer={customer}
      initialSales={sales}
      initialPayments={payments}
      user={user}
    />
  );
}
