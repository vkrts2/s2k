// src/app/(quotation-print)/quotations/[id]/print/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import type { Quotation, Customer } from '@/lib/types';
import { QuotationPrintView } from '@/components/quotations/quotation-print-view';
import { getCustomerByName } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';

export default function QuotationPrintPage() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get('data');
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (dataParam) {
      try {
        const parsedQuotation = JSON.parse(decodeURIComponent(dataParam));
        setQuotation(parsedQuotation);
        document.title = `Teklif: ${parsedQuotation.quotationNumber} | Yazdır | ERMAY`;
        
        // Müşteri bilgilerini çek
        if (user && parsedQuotation.customerName) {
          getCustomerByName(user.uid, parsedQuotation.customerName).then(fetchedCustomer => {
            setCustomer(fetchedCustomer);
            setIsLoading(false);
          }).catch(err => {
            console.error('Müşteri bilgileri çekilemedi:', err);
            setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      } catch {
        setError("Geçersiz veri formatı.");
        setIsLoading(false);
      }
      return;
    }
    setError("Teklif verisi bulunamadı.");
    setIsLoading(false);
  }, [dataParam, user]);

  if (isLoading) {
    return <div className="p-8 text-center text-lg">Yükleniyor...</div>;
  }
  if (error || !quotation) {
    return <div className="p-8 text-center text-lg text-red-500">{error || "Teklif bulunamadı"}</div>;
  }
  return <QuotationPrintView quotation={quotation} customer={customer} />;
}
