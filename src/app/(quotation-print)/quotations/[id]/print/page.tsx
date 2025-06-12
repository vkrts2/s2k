// src/app/(quotation-print)/quotations/[id]/print/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Quotation, PortfolioItem } from '@/lib/types';
import { getQuotationById, getPortfolioItemById } from '@/lib/storage';
import { QuotationPrintView } from '@/components/quotations/quotation-print-view';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function QuotationPrintPage() {
  const params = useParams();
  const quotationId = typeof params.id === 'string' ? params.id : undefined;
  const { user } = useAuth();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [customer, setCustomer] = useState<PortfolioItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!quotationId) {
      setError("Teklif ID bulunamadı.");
      setIsLoading(false);
      return;
    }

    const fetchQuotationData = async (currentUid: string) => {
      setIsLoading(true);
      try {
        console.log("Fetching quotation with:", { uid: currentUid, quotationId });
        const fetchedQuotation = await getQuotationById(currentUid, quotationId);
        console.log("Fetched quotation:", fetchedQuotation);

        if (fetchedQuotation) {
          setQuotation(fetchedQuotation);
          if (fetchedQuotation.customerId) {
            console.log("Fetching customer with:", { uid: currentUid, customerId: fetchedQuotation.customerId });
            const fetchedCustomer = await getPortfolioItemById(currentUid, fetchedQuotation.customerId);
            console.log("Fetched customer:", fetchedCustomer);
            setCustomer(fetchedCustomer || null);
          }
          document.title = `Teklif: ${fetchedQuotation.quotationNumber} | Yazdır | ERMAY`;
        } else {
          setError("Teklif bulunamadı.");
        }
      } catch (e: any) {
        console.error("Teklif verileri yüklenirken hata:", e);
        setError(`Veri yüklenirken bir hata oluştu: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && user.uid) {
      fetchQuotationData(user.uid);
    } else {
      setError("Kullanıcı kimliği bulunamadı. Lütfen giriş yaptığınızdan emin olun.");
      setIsLoading(false);
    }
  }, [quotationId, user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Teklif verileri yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Bir Hata Oluştu</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button asChild variant="outline">
          <Link href="/quotations">Teklif Listesine Geri Dön</Link>
        </Button>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Teklif Bulunamadı</h1>
        <p className="text-muted-foreground mb-4">
          Bu ID ({quotationId || 'N/A'}) ile bir teklif bulunamadı.
        </p>
         <Button asChild variant="outline">
          <Link href="/quotations">Teklif Listesine Geri Dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <QuotationPrintView
      quotation={{ ...quotation, items: Array.isArray(quotation.items) ? quotation.items : [] }}
      customer={customer}
    />
  );
}
