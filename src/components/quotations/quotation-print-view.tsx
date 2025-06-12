// src/components/quotations/quotation-print-view.tsx
"use client";

import React from 'react';
import type { Quotation, PortfolioItem } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Güncellenmiş Firma Bilgileri
const companyDetails = {
  name: "ERMAY TEKNIK TEKSTIL SAN. VE TIC. A.$.",
  address: "ORUÇREIS MAH. TEKSTILKENT SAN. SIT. G2 BLOK KAT:3 NO:407 ESENLER/ ISTANBUL",
  phone: "(850) 762 60 05",
  fax: "",
  website: "www.ermaysanayi.com",
  email: "info@ermaysanayi.com",
  taxOffice: "ATISALANI VERGI DAiRESi",
  taxNumber: "3640652611",
};

const fixedQuotationText = `SEVKİYAT YERİ : İSTANBUL
PAKETLEME : Rulo ve P.e. Torba
QUANTITY : 10% +/- Acceptable
ÖDEME : NAKİT
COUNTRY OF ORIGIN : TURKEY

BANKA ADI : TÜRKİYE İŞ BANKASI A.Ş.
ŞUBE ADI : TEKSTİLKENT ŞB. (0064)
IBAN NO : TR12 0006 4000 0011 4420 1300 34
SWIFT CODE : ISBKTRIS
BANKA ADRESİ : Oruçreis, Tekstilkent Cd Tekstilkent Plaza D:NO:12/B, 34235 Esenler/İstanbul
             0212 438 25 61

NOT : Bu proforma fatura sadece usulüne uygun olarak imzalanmış, kaşelenmiş olarak geçerlidir.`;


const safeFormatDate = (dateString: string | undefined, formatStr: string = "dd MMMM yyyy", locale = tr) => {
  if (!dateString) return "Belirtilmemiş";
  try {
    const date = parseISO(dateString);
    return isValid(date) ? format(date, formatStr, { locale }) : "Geçersiz Tarih";
  } catch (error) {
    return "Hatalı Tarih";
  }
};

const formatCurrency = (amount?: number, currency?: string): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }
  const resolvedCurrency = currency || 'TRY';
  try {
    return amount.toLocaleString('tr-TR', { style: 'currency', currency: resolvedCurrency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch (e) {
    let symbol = resolvedCurrency;
    if (resolvedCurrency === 'TRY') symbol = '₺';
    else if (resolvedCurrency === 'USD') symbol = '$';
    return `${symbol}${amount.toFixed(2)}`;
  }
};


interface QuotationPrintViewProps {
  quotation: Quotation;
  customer: PortfolioItem | null;
}

export function QuotationPrintView({ quotation, customer }: QuotationPrintViewProps) {
  const printDate = format(new Date(), "dd MMMM yyyy, HH:mm", { locale: tr });

  return (
    <div className="bg-white text-black min-h-screen p-4 print:p-0">
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            background-color: #fff !important;
            color: #000 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-text-sm { font-size: 9pt !important; line-height: 1.2 !important; }
          .print-text-xs { font-size: 7pt !important; line-height: 1.1 !important; }
          .print-font-bold { font-weight: bold !important; }
          .print-break-inside-avoid { page-break-inside: avoid !important; }
          .print-bg-transparent { background-color: transparent !important; }
          .print-border { border: 1px solid #ccc !important; }
          .print-p-2 { padding: 0.5rem !important; }
          .print-p-4 { padding: 1rem !important; }
          .print-mb-1 { margin-bottom: 0.25rem !important; }
          .print-mb-2 { margin-bottom: 0.5rem !important; }
          .print-mb-4 { margin-bottom: 1rem !important; }
          .print-mt-4 { margin-top: 1rem !important; }
          .print-mt-8 { margin-top: 2rem !important; }
          /* Table specific styles for print */
           table { width: 100% !important; border-collapse: collapse !important; }
           th, td {
             border: 1px solid #ddd !important;
             padding: 2px 4px !important; /* Satır yüksekliğini ve iç boşluğu azalt */
             text-align: left !important;
             height: auto !important; /* Otomatik yüksekliğe ayarla */
             min-height: unset !important;
           }
           th {
             background-color: #f2f2f2 !important;
             color: black !important;
           }
           /* Specific column widths for quotation print view table */
           .quotation-table-product { width: 45% !important; } /* Ürün/Hizmet Adı sütununu genişlet */
           .quotation-table-quantity { width: 15% !important; } /* Miktar sütununu daralt */
           .quotation-table-unit-price { width: 20% !important; }
           .quotation-table-total { width: 20% !important; }
        }
      `}</style>

      <header className="mb-6 print:mb-4 flex justify-between items-start">
        <div>
          <img 
            src="/images/2.png"
            alt="ERMAY SANAYI Logo" 
            className="mb-2 print:mb-1" 
            style={{ height: '240px', width: 'auto', objectFit: 'contain' }} 
          />
          <p className="print-text-sm print-font-bold text-base font-semibold mb-1">{companyDetails.name}</p>
          <p className="print-text-xs">{companyDetails.address}</p>
          <p className="print-text-xs">Tel: {companyDetails.phone} {companyDetails.fax && `Fax: ${companyDetails.fax}`}</p>
          <p className="print-text-xs">Web: {companyDetails.website} | E-Posta: {companyDetails.email}</p>
          {companyDetails.taxOffice && companyDetails.taxNumber && (
            <p className="print-text-xs">
              {companyDetails.taxOffice} - VKN: {companyDetails.taxNumber}
            </p>
          )}
        </div>
        <div className="text-right">
          <h1 className="text-2xl print:text-xl print-font-bold mb-1">FİYAT TEKLİFİ</h1>
          <p className="print-text-sm"><strong>Teklif No:</strong> {quotation.quotationNumber}</p>
          <p className="print-text-sm"><strong>Tarih:</strong> {safeFormatDate(quotation.date)}</p>
          {quotation.validUntilDate && (
            <p className="print-text-sm"><strong>Geçerlilik Tarihi:</strong> {safeFormatDate(quotation.validUntilDate)}</p>
          )}
           <Button onClick={() => window.print()} className="mt-4 no-print">
            Yazdır
          </Button>
        </div>
      </header>

      <Separator className="my-4 print:my-2" />

      <section className="mb-6 print:mb-4 print:break-inside-avoid">
        <h2 className="text-lg print:text-base print-font-bold mb-2">Müşteri Bilgileri</h2>
        <p className="print-text-sm"><strong>Firma/Kişi:</strong> {quotation.customerName || (customer?.companyName) || 'N/A'}</p>
        { (quotation.customerAddress || customer?.address) && <p className="print-text-sm"><strong>Adres:</strong> {quotation.customerAddress || customer?.address}</p>}
        { (quotation.customerEmail) && <p className="print-text-sm"><strong>E-posta:</strong> {quotation.customerEmail}</p>}
        { (quotation.customerPhone || customer?.phone) && <p className="print-text-sm"><strong>Telefon:</strong> {quotation.customerPhone || customer?.phone}</p>}
      </section>

      <Separator className="my-4 print:my-2" />

      <section className="mb-6 print:mb-4">
        <h2 className="text-lg print:text-base print-font-bold mb-2">Teklif Kalemleri</h2>
        <Table className="print-text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="print-font-bold quotation-table-product">Ürün/Hizmet Adı</TableHead>
              <TableHead className="text-right print-font-bold quotation-table-quantity">Miktar</TableHead>
              <TableHead className="text-right print-font-bold quotation-table-unit-price">Birim Fiyat ({quotation.currency})</TableHead>
              <TableHead className="text-right print-font-bold quotation-table-total">Toplam ({quotation.currency})</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotation.items.map((item) => (
              <TableRow key={item.id} className="print:break-inside-avoid">
                <TableCell className="quotation-table-product">{item.productName}</TableCell>
                <TableCell className="text-right quotation-table-quantity">{item.quantity.toLocaleString('tr-TR')}</TableCell>
                <TableCell className="text-right quotation-table-unit-price">{formatCurrency(item.unitPrice, quotation.currency).replace(quotation.currency, '').trim()}</TableCell>
                <TableCell className="text-right print-font-bold quotation-table-total">{formatCurrency(item.total, quotation.currency).replace(quotation.currency, '').trim()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="mt-6 print:mt-4 flex justify-end print:break-inside-avoid">
        <div className="w-full md:w-1/2 lg:w-1/3 space-y-1 print-text-sm">
          <div className="flex justify-between">
            <span>Alt Toplam:</span>
            <span className="print-font-bold">{formatCurrency(quotation.subTotal, quotation.currency)}</span>
          </div>
          {quotation.taxAmount !== undefined && quotation.taxRate !== undefined && quotation.taxRate > 0 && (
            <div className="flex justify-between">
              <span>KDV (%{quotation.taxRate.toFixed(0)}):</span>
              <span className="print-font-bold">{formatCurrency(quotation.taxAmount, quotation.currency)}</span>
            </div>
          )}
          <Separator className="my-1" />
          <div className="flex justify-between text-lg print:text-base print-font-bold">
            <span>GENEL TOPLAM:</span>
            <span className="print-font-bold">{formatCurrency(quotation.grandTotal, quotation.currency)}</span>
          </div>
        </div>
      </section>

      <section className="mt-8 print:mt-4 print:break-inside-avoid print-text-xs">
         <h3 className="text-md print:text-sm print-font-bold mb-1">Teklif Şartları ve Banka Bilgileri:</h3>
         <pre className="whitespace-pre-wrap p-2 border rounded-md bg-muted/30 print:bg-transparent print:border-none print:p-0 font-sans">
            {fixedQuotationText}
         </pre>
      </section>


      <footer className="mt-10 print:mt-6 pt-4 border-t text-center print:text-xs text-muted-foreground">
        <p>Bu teklif {safeFormatDate(quotation.date)} tarihinde {companyDetails.name} tarafından oluşturulmuştur.</p>
        <p className="print-text-xs">Yazdırılma Tarihi: {printDate}</p>
      </footer>
    </div>
  );
}
