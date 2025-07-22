// src/lib/pdfUtils.ts
'use client';

import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Customer, Supplier, UnifiedTransaction, Currency, Quotation, QuotationItem, PortfolioItem } from './types';

// ŞİRKET BİLGİLERİ - Bu bilgileri kendi şirket bilgilerinizle güncelleyin veya bir ayar dosyasından çekin.
const companyDetails = {
  name: "ERMAY",
  address: "Merkez Ofis Adresiniz, Şehir, Posta Kodu",
  phone: "+90 (XXX) XXX XX XX",
  email: "info@example.com.tr",
  website: "www.example.com.tr",
  taxOffice: "Vergi Dairesi Adı",
  taxNumber: "Vergi Numarası",
};

const safeFormatDateForPdf = (dateString: string | undefined, formatStr: string = "dd.MM.yyyy", locale = tr) => {
  if (!dateString) return "Belirtilmemiş";
  try {
    const date = parseISO(dateString);
    return isValid(date) ? format(date, formatStr, { locale }) : "Geçersiz Tarih";
  } catch (error) {
    console.error("Error formatting date for PDF:", dateString, error);
    return "Hatalı Tarih";
  }
};

const formatCurrencyForPdf = (amount?: number, currency?: Currency): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }
  const resolvedCurrency = currency || 'TRY';
  try {
    return amount.toLocaleString('tr-TR', { style: 'currency', currency: resolvedCurrency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch (e) {
    console.error("Error formatting currency for PDF:", amount, resolvedCurrency, e);
    let symbol: string = resolvedCurrency;
    if (resolvedCurrency === 'TRY') symbol = '₺';
    else if (resolvedCurrency === 'USD') symbol = '$';
    else if (resolvedCurrency === 'EUR') symbol = '€';
    return `${symbol}${amount.toFixed(2)}`;
  }
};

export const generateStatementPdf = async (
  entity: Customer | Supplier | null,
  transactions: UnifiedTransaction[],
  balances: Record<Currency, number> | null,
  entityType: 'customer' | 'supplier'
) => {
  console.warn(
    "generateStatementPdf çağrıldı, ancak PDF oluşturma özelliği 'jspdf' modülü sorunları nedeniyle devre dışı bırakıldı. HTML yazdırma görünümü kullanılmalıdır."
  );
  if (typeof window !== 'undefined') {
    alert("PDF oluşturma özelliği şu anda devre dışıdır. Lütfen HTML yazdırma seçeneğini kullanın.");
  }
  // PDF generation logic using jspdf is removed to avoid module errors.
  // Users should use the HTML print view for statements.
  return;
};

export const generateQuotationPdf = async (
  quotation: Quotation | null,
  customer: PortfolioItem | null
) => {
  // IMPORTANT: This function is now effectively disabled due to persistent "jspdf" module issues.
  // The feature has been replaced with an HTML print view.
  console.warn(
    "generateQuotationPdf çağrıldı, ancak PDF oluşturma özelliği 'jspdf' modülü sorunları nedeniyle devre dışı bırakıldı. HTML yazdırma görünümü kullanılmalıdır."
  );

  if (typeof window !== 'undefined') {
     alert("PDF oluşturma özelliği 'jspdf' modülü sorunları nedeniyle devre dışı bırakılmıştır. Lütfen HTML yazdırma seçeneğini kullanın.");
  }
  // All jspdf and jspdf-autotable related code has been removed from here.
  return;
};
