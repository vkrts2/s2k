"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Supplier, Purchase, PaymentToSupplier } from '@/lib/types';
import { getSupplierById, getPurchases, getPaymentsToSuppliers } from '@/lib/storage';
import { SupplierDetailPageClient } from '@/components/suppliers/supplier-detail-page';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function SupplierDetailPage() {
  const params = useParams();
  const supplierId = typeof params.id === 'string' ? params.id : undefined;

  const { user, loading: authLoading } = useAuth();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [paymentsToSuppliers, setPaymentsToSuppliers] = useState<PaymentToSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSupplierFound, setIsSupplierFound] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setIsLoading(false);
      setError("Bu sayfayı görüntülemek için giriş yapmalısınız.");
      return;
    }
    
    if (!supplierId) {
      setIsLoading(false);
      setIsSupplierFound(false);
      document.title = "Tedarikçi Bulunamadı | ERMAY";
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedSupplier = await getSupplierById(user.uid, supplierId);
        if (fetchedSupplier) {
          setSupplier(fetchedSupplier);
          setPurchases(await getPurchases(user.uid, supplierId));
          setPaymentsToSuppliers(await getPaymentsToSuppliers(user.uid, supplierId));
          setIsSupplierFound(true);
          document.title = `${fetchedSupplier.name} | Tedarikçi Detayları | ERMAY`;
        } else {
          setIsSupplierFound(false);
          document.title = "Tedarikçi Bulunamadı | ERMAY";
        }
      } catch (e) {
        console.error("Error fetching supplier data:", e);
        setError("Tedarikçi verileri yüklenirken bir hata oluştu.");
        setIsSupplierFound(false);
        document.title = "Hata Oluştu | ERMAY";
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supplierId, user, authLoading]);

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Tedarikçi verileri yükleniyor...</p>
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
          <Link href="/suppliers">Tedarikçiler Sayfasına Geri Dön</Link>
        </Button>
      </div>
    );
  }

  if (!isSupplierFound) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Tedarikçi Bulunamadı</h1>
        <p className="text-muted-foreground mb-4">
          Aradığınız ID ({supplierId || 'N/A'}) ile bir tedarikçi bulunamadı veya erişim sırasında bir sorun oluştu.
        </p>
        <Button asChild className="mt-4">
          <Link href="/suppliers">Tedarikçiler Sayfasına Geri Dön</Link>
        </Button>
      </div>
    );
  }

  if (!supplier) {
    console.error("Render condition error: Supplier not found, but no specific error/not-found state was set appropriately.");
     return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Beklenmedik Bir Hata</h1>
        <p className="text-muted-foreground mb-4">Tedarikçi bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>
        <Button asChild className="mt-4">
          <Link href="/suppliers">Tedarikçiler Sayfasına Geri Dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <SupplierDetailPageClient
      supplier={supplier}
      initialPurchases={purchases}
      initialPaymentsToSupplier={paymentsToSuppliers}
      user={user}
    />
  );
}
