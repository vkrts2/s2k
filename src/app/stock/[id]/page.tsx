// src/app/stock/[id]/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { StockItem, StockTransaction } from '@/lib/types';
import { getStockItemById, getSales, getPurchases } from '@/lib/storage';
import { StockItemDetailPageClient } from '@/components/stock/stock-item-detail-page';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function StockItemPage() {
  const { user, loading: authLoading } = useAuth();
  const [stockItem, setStockItem] = useState<StockItem | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isItemFound, setIsItemFound] = useState(true);

  const stockItemId = useParams()?.id as string;

  useEffect(() => {
    if (authLoading || !user) {
      setIsLoading(false);
      if (!user && !authLoading) {
        setError("Bu sayfayı görüntülemek için giriş yapmalısınız.");
      }
      return;
    }

    if (!stockItemId) {
      setIsLoading(false);
      setIsItemFound(false);
      document.title = "Stok Kalemi Bulunamadı | ERMAY";
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedStockItem = await getStockItemById(user.uid, stockItemId);
        if (fetchedStockItem) {
          setStockItem(fetchedStockItem);
          
          // Satış işlemlerini getir
          const sales = await getSales(user.uid);
          const stockSales = sales.filter(sale => sale.stockItemId === stockItemId);
          
          // Alım işlemlerini getir
          const purchases = await getPurchases(user.uid);
          const stockPurchases = purchases.filter(purchase => purchase.stockItemId === stockItemId);
          
          // İşlemleri birleştir ve tarihe göre sırala
          const allTransactions: StockTransaction[] = [
            ...stockSales.map(sale => ({
              ...sale,
              transactionType: 'sale' as const,
              customerName: sale.customerName || 'Bilinmeyen Müşteri'
            })),
            ...stockPurchases.map(purchase => ({
              ...purchase,
              transactionType: 'purchase' as const,
              supplierName: purchase.supplierName || 'Bilinmeyen Tedarikçi'
            }))
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setTransactions(allTransactions);
          setIsItemFound(true);
          document.title = `${fetchedStockItem.name} | Stok Detayı | ERMAY`;
        } else {
          setIsItemFound(false);
          document.title = "Stok Kalemi Bulunamadı | ERMAY";
        }
      } catch (e: any) {
        console.error("Error fetching stock item data:", e);
        setError("Stok kalemi verileri yüklenirken bir hata oluştu.");
        setIsItemFound(false);
        document.title = "Hata Oluştu | ERMAY";
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [stockItemId, user, authLoading]);

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Stok kalemi verileri yükleniyor...</p>
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
          <Link href="/stock">Stok Listesine Geri Dön</Link>
        </Button>
      </div>
    );
  }

  if (!isItemFound) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Stok Kalemi Bulunamadı</h1>
        <p className="text-muted-foreground mb-4">
          Aradığınız ID ({stockItemId || 'N/A'}) ile bir stok kalemi bulunamadı veya erişim sırasında bir sorun oluştu.
        </p>
        <Button asChild className="mt-4">
          <Link href="/stock">Stok Listesine Geri Dön</Link>
        </Button>
      </div>
    );
  }

  if (!stockItem) {
     return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Beklenmedik Bir Hata</h1>
        <p className="text-muted-foreground mb-4">Stok kalemi bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>
        <Button asChild className="mt-4">
          <Link href="/stock">Stok Listesine Geri Dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <StockItemDetailPageClient
      stockItem={stockItem}
      transactions={transactions}
    />
  );
}
