// src/components/quotations/quotation-print-view.tsx
"use client";

import React from 'react';
import type { Quotation, Customer } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

// Güncellenmiş Firma Bilgileri
const companyDetails = {
  name: "ERMAY TEKNIK TEKSTIL SAN. VE TIC. A.S.",
  address: "ORUCREIS MAH. TEKSTILKENT SAN. SIT. G2 BLOK KAT:3 NO:407 ESENLER/ ISTANBUL",
  phone: "(850) 762 60 05",
  fax: "",
  website: "www.ermaysanayi.com",
  email: "info@ermaysanayi.com",
  taxOffice: "ATISALANI VERGI DAIRESI",
  taxNumber: "3640652611",
};

const formatCurrency = (amount?: number, currency: string = 'TRY'): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }
  return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (currency === 'TRY' ? ' TL' : ` ${currency}`);
};

const safeFormatDate = (date: string | Date | undefined, formatStr: string = "dd.MM.yyyy", locale = tr) => {
  if (!date) return "";
  try {
    if (date instanceof Date) {
      return isValid(date) ? format(date, formatStr, { locale }) : "";
    }
    const parsedDate = parseISO(date);
    return isValid(parsedDate) ? format(parsedDate, formatStr, { locale }) : "";
  } catch (error) {
    return "";
  }
};

interface QuotationPrintViewProps {
  quotation: Quotation;
  customer?: Customer | null;
}

export function QuotationPrintView({ quotation, customer }: QuotationPrintViewProps) {
  return (
    <div id="quotation-print-root" className="print-scale print:single-page print:bg-white print:text-black print:w-[210mm] print:h-[297mm] print:mx-auto print:p-0 print:shadow-none print:overflow-hidden" style={{ height: '297mm', minHeight: '297mm', maxHeight: '297mm', overflow: 'hidden', margin: 0, padding: 0, boxSizing: 'border-box', background: '#fff', color: '#000' }}>
      <div className="w-full max-w-[210mm] bg-white text-black print:shadow-none print:border print:rounded-none print:box-border print:overflow-hidden" style={{ height: '297mm', minHeight: '297mm', maxHeight: '297mm', overflow: 'hidden', margin: 0, padding: 0, boxSizing: 'border-box', background: '#fff', color: '#000' }}>
        <div className="flex flex-col w-full bg-white text-black" style={{ height: '297mm', minHeight: '297mm', maxHeight: '297mm', overflow: 'hidden', margin: 0, padding: 0, boxSizing: 'border-box' }}>
          {/* Top Border (Kırmızı Çizgi kaldırıldı) */}
          {/* <div className="border-t-4 border-red-700 w-full mb-0" /> */}

          {/* Logo ve Teklif Bilgileri hizalı */}
          <div className="flex flex-row justify-between items-center mb-0" style={{ minHeight: 100 }}>
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="Logo"
                width={240}
                height={96}
                className="object-contain ml-[-12px]"
                priority
              />
            </div>
          </div>

          {/* Siyah Çizgi */}
          <div className="border-t-2 border-b-2 border-black py-0.5 mb-0" />

          {/* Firma ve Müşteri Bilgileri - Kutulu ve hizalı */}
          <div className="grid grid-cols-2 gap-4 items-start mb-6 mt-2">
            {/* Firma Bilgileri Kutusu */}
            <div className="flex flex-col justify-start leading-tight border border-black p-3 min-h-[140px]">
              <p>{companyDetails.name}</p>
              <p>Adres: {companyDetails.address}</p>
              <p>VKN: {companyDetails.taxNumber}</p>
              <p>Vergi Dairesi: {companyDetails.taxOffice}</p>
              <p>Telefon: {companyDetails.phone}</p>
              <p>Web Sitesi: {companyDetails.website}</p>
              <p>E-Posta: {companyDetails.email}</p>
            </div>
            {/* Müşteri Bilgileri Kutusu */}
            <div className="flex flex-col justify-start leading-tight border border-black p-3 min-h-[140px]">
              {customer ? (
                <>
                  <p>{customer.name}</p>
                  {customer.address && <p>Adres: {customer.address}</p>}
                  {customer.taxNumber && <p>VKN: {customer.taxNumber}</p>}
                  {customer.taxOffice && <p>Vergi Dairesi: {customer.taxOffice}</p>}
                  {customer.phone && <p>Telefon: {customer.phone}</p>}
                  {customer.email && <p>E-Posta: {customer.email}</p>}
                </>
              ) : (
                <>
                  <p>{quotation.customerName}</p>
                  {quotation.customerAddress && <p>Adres: {quotation.customerAddress}</p>}
                  {quotation.customerTaxOffice && <p>Vergi Dairesi: {quotation.customerTaxOffice}</p>}
                  {quotation.customerPhone && <p>Telefon: {quotation.customerPhone}</p>}
                </>
              )}
            </div>
          </div>

          {/* Middle Border */}
          <div className="border-t-2 border-b-2 border-black py-0.5 mb-4" />

          {/* Items Table */}
          <table className="w-full mb-2 border-collapse print:overflow-visible" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', fontSize: '11px' }}>
            <thead>
              <tr>
                <th className="border border-black py-1 px-2 text-left font-normal w-12">NO.</th>
                <th className="border border-black py-1 px-2 text-left font-normal">AÇIKLAMA</th>
                <th className="border border-black py-1 px-2 text-right font-normal w-20">ADET</th>
                <th className="border border-black py-1 px-2 text-right font-normal w-32">BİRİM FİYATI</th>
                <th className="border border-black py-1 px-2 text-right font-normal w-24">KDV ORANI</th>
                <th className="border border-black py-1 px-2 text-right font-normal w-32">TOPLAM FİYAT</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item, index) => {
                // taxRate her zaman string veya number olabilir, eksikse '0' kabul et
                const taxRate = item.taxRate !== undefined && item.taxRate !== null && String(item.taxRate) !== '' ? Number(item.taxRate) : 0;
                const quantity = Number(item.quantity) || 0;
                const unitPrice = Number(item.unitPrice) || 0;
                return (
                  <tr key={index}>
                    <td className="border border-black py-1 px-2">{index + 1}.</td>
                    <td className="border border-black py-1 px-2">{item.description || item.productName}</td>
                    <td className="border border-black py-1 px-2 text-right">{quantity} {item.unit || 'adet'}</td>
                    <td className="border border-black py-1 px-2 text-right">{formatCurrency(unitPrice, quotation.currency)}</td>
                    <td className="border border-black py-1 px-2 text-right">{taxRate}</td>
                    <td className="border border-black py-1 px-2 text-right">{formatCurrency(quantity * unitPrice, quotation.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-0 print:mb-0">
            {(() => {
              // Ara toplam
              const subTotal = quotation.items.reduce((sum, item) => sum + (Number(item.unitPrice) * Number(item.quantity)), 0);
              // KDV oranlarına göre gruplama
              const kdvMap = new Map<number, { base: number; tax: number }>();
              quotation.items.forEach(item => {
                const itemTotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
                const taxRate = item.taxRate !== undefined && item.taxRate !== null && String(item.taxRate) !== '' ? Number(item.taxRate) : 0;
                const itemTax = itemTotal * (taxRate / 100);
                if (!kdvMap.has(taxRate)) {
                  kdvMap.set(taxRate, { base: 0, tax: 0 });
                }
                const prev = kdvMap.get(taxRate)!;
                kdvMap.set(taxRate, {
                  base: prev.base + itemTotal,
                  tax: prev.tax + itemTax,
                });
              });
              // Genel toplam
              const totalTax = Array.from(kdvMap.values()).reduce((sum, v) => sum + v.tax, 0);
              const grandTotal = subTotal + totalTax;
              // KDV satırı her zaman görünsün, oran 0 olsa bile
              const kdvEntries = Array.from(kdvMap.entries());
              const kdvRows: [number, { tax: number }][] = kdvEntries.length > 0
                ? kdvEntries.map(([rate, obj]) => [rate, { tax: obj.tax }])
                : [[0, { tax: 0 }]];
              return (
                <table className="border border-black border-collapse print:overflow-visible" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', fontSize: '11px', minWidth: 220 }}>
                  <tbody>
                    <tr>
                      <td className="border border-black py-1 px-2 text-left align-middle">ARA TOPLAM</td>
                      <td className="border border-black py-1 px-2 text-right w-40 align-middle">{formatCurrency(subTotal, quotation.currency)}</td>
                    </tr>
                    {kdvRows.map(([rate, obj]) => (
                      <tr key={rate}>
                        <td className="border border-black py-1 px-2 text-left align-middle">KDV %{rate}</td>
                        <td className="border border-black py-1 px-2 text-right align-middle">{formatCurrency(obj.tax ?? 0, quotation.currency)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="border border-black py-1 px-2 text-left align-middle">GENEL TOPLAM</td>
                      <td className="border border-black py-1 px-2 text-right align-middle">{formatCurrency(grandTotal, quotation.currency)}</td>
                    </tr>
                  </tbody>
                </table>
              );
            })()}
          </div>

          {/* Bank Details with Labels */}
          <div className="space-y-0.5 mb-6" style={{ fontSize: '11px', fontFamily: 'inherit' }}>
            <div className="grid grid-cols-[120px,auto] gap-1">
              <p>SEVKİYAT YERİ</p>
              <p>:İSTANBUL</p>
              <p>PAKETLEME</p>
              <p>:Rulo ve P.e. Torba</p>
              <p>QUANTITY</p>
              <p>:10% +/- Acceptable</p>
              <p>ÖDEME</p>
              <p>:90 GÜN VADE VEYA KREDİ KARTI 3 TAKSİT</p>
              <p>MENŞEİ</p>
              <p>:COUNTRY OF ORIGINAL TURKEY</p>
              <p>BANKA ADI</p>
              <p>:KUVEYTTÜRK</p>
              <p>ŞUBE ADI</p>
              <p>:TEKSTİLKENT ŞUBE</p>
              <p>ŞUBE KODU</p>
              <p>:485</p>
              <p>IBAN NO</p>
              <p>:TR34 0020 5000 0998 0123 4000 01</p>
              <p>SWIFT CODE</p>
              <p>:KTEFTRISXXX</p>
              <p>BANKA ADRESİ</p>
              <p>:Oruçreis Mah. Tekstilkent Cad. Tekstilkent Ticaret Merkezi Çarşı Blok No:10-U/Z-02-03-04</p>
              <p></p>
              <p className="pl-[8px]">ESENLER / İstanbul</p>
            </div>
          </div>

          {/* Bottom Border */}
          <div className="border-t-2 border-b-2 border-black py-0.5 mb-4" />

          {/* Notes */}
          <div className="mb-6">
            <p className="font-bold mb-1">NOTLAR:</p>
            <p>Bu proforma fatura sadece usulüne uygun imzalanmış, kaşelenmiş olarak geçerlidir.</p>
            <p>Merkez Bankası Satış Kuru Uygulanmaktadır.</p>
            <p>Kur Fatura Kesim Günü Merkez Bankası Kuru Alınacaktır.</p>
          </div>

          {/* Bottom Border */}
          <div className="border-t-2 border-b-2 border-black py-0.5 mb-4" />
        </div>
      </div>
    </div>
  );
}

/* PRINT CSS: Tek sayfa ve taşma engelleme + Otomatik ölçekleme */
<style jsx global>{`
  @media print {
    html, body {
      width: 210mm;
      height: 297mm;
      min-height: 297mm !important;
      max-height: 297mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      background: #fff !important;
      box-sizing: border-box !important;
      font-size: 11px !important;
    }
    #quotation-print-root,
    #quotation-print-root > div,
    #quotation-print-root > div > div {
      width: 210mm !important;
      max-width: 210mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      background: #fff !important;
      color: #000 !important;
      display: block !important;
      min-height: unset !important;
      max-height: unset !important;
      height: unset !important;
      overflow: visible !important;
    }
    .print-scale {
      transform-origin: top left !important;
    }
    .print-signature-page-break {
      page-break-before: always !important;
      break-before: page !important;
      display: block !important;
    }
    /* Diğer mevcut print ayarları burada kalacak */
    table, th, td {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      font-size: 11px !important;
      margin: 0 !important;
      padding: 2px 4px !important;
      border-collapse: collapse !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .mb-6, .mb-4, .mb-2, .mb-0, .mt-2, .mt-0, .my-0, .py-0\.5, .p-2, .p-3, .space-y-0\.5, .space-y-2, .space-y-1, .space-y-4 {
      margin-bottom: 0 !important;
      margin-top: 0 !important;
      padding: 0 !important;
    }
    .flex, .grid, .items-center, .items-start, .justify-between, .justify-end, .justify-center {
      gap: 0 !important;
      display: block !important;
    }
    .text-[12px], .text-[14px] {
      font-size: 11px !important;
    }
    .min-h-screen, .min-h-[297mm], .min-h-[29.7cm] {
      min-height: 0 !important;
      height: auto !important;
    }
    .max-w-[210mm] {
      max-width: 210mm !important;
    }
    .w-full {
      width: 100% !important;
    }
    .overflow-hidden {
      overflow: visible !important;
    }
  }
`}</style>

// Ölçekleme için dinamik bir script ekliyorum
{typeof window !== 'undefined' && (
  <script dangerouslySetInnerHTML={{
    __html: `
      function fitToPage() {
        var root = document.getElementById('quotation-print-root');
        if (!root) return;
        var pageWidth = 210 * 3.7795275591; // mm to px
        var pageHeight = 297 * 3.7795275591;
        var rect = root.getBoundingClientRect();
        var scaleX = pageWidth / rect.width;
        var scaleY = pageHeight / rect.height;
        var scale = Math.min(scaleX, scaleY, 1);
        root.style.transform = 'scale(' + scale + ')';
      }
      window.addEventListener('beforeprint', fitToPage);
      window.addEventListener('afterprint', function() {
        var root = document.getElementById('quotation-print-root');
        if (root) root.style.transform = '';
      });
      setTimeout(fitToPage, 100);
    `
  }} />
)}
