// src/app/(quotation-print)/quotations/[id]/print/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import type { Quotation } from '@/lib/types';
import { QuotationPrintView } from '@/components/quotations/quotation-print-view';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function QuotationPrintPage() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get('data');
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dataParam) {
      try {
        const parsedQuotation = JSON.parse(decodeURIComponent(dataParam));
        setQuotation(parsedQuotation);
        setIsLoading(false);
        document.title = `Teklif: ${parsedQuotation.quotationNumber} | Yazdır | ERMAY`;
      } catch {
        setError("Geçersiz veri formatı.");
        setIsLoading(false);
      }
      return;
    }
    setError("Teklif verisi bulunamadı.");
    setIsLoading(false);
  }, [dataParam]);

  if (isLoading) {
    return <div className="p-8 text-center text-lg">Yükleniyor...</div>;
  }
  if (error || !quotation) {
    return <div className="p-8 text-center text-lg text-red-500">{error || "Teklif bulunamadı"}</div>;
  }
  return <QuotationPrintView quotation={quotation} customer={quotation.customer || null} />;
}
