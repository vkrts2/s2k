// src/components/common/statement-view.tsx
"use client";

import React, { useMemo } from 'react';
import type { Customer, Supplier, Sale, Payment, Purchase, PaymentToSupplier, Currency, UnifiedTransaction } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Printer, FileDown } from "lucide-react";
// AppLogo importu kaldırıldı

interface StatementViewProps {
  entity: Customer | Supplier;
  transactions: UnifiedTransaction[];
  balances: Record<Currency, number>;
  entityType: 'customer' | 'supplier';
}

const formatCurrencyForStatement = (amount: number, currency: Currency): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }
  try {
    return amount.toLocaleString('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch (e) {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

const safeFormatDate = (dateString: string, formatString: string = "dd.MM.yyyy HH:mm", locale = tr) => {
  try {
    const parsedDate = parseISO(dateString);
    if (isValid(parsedDate)) {
      return format(parsedDate, formatString, { locale });
    }
    return "Geçersiz Tarih";
  } catch (error) {
    return "Geçersiz Tarih";
  }
};

export function StatementView({ entity, transactions, balances, entityType }: StatementViewProps) {
  const statementDate = format(new Date(), "dd.MM.yyyy", { locale: tr });
  
  // console.log("StatementView props:", {
  //   entity,
  //   transactions,
  //   balances,
  //   entityType
  // });

  // Veri kontrolü
  if (!entity) {
    console.error("Entity is missing in StatementView");
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Veri yüklenirken bir hata oluştu.</p>
      </div>
    );
  }

  // İşlemleri sırala (en yeni en üstte)
  const sortedTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) {
      console.error("Transactions is not an array:", transactions);
      return [];
    }
    return [...transactions].sort((a, b) => {
      const dateA = parseISO(a.date);
      const dateB = parseISO(b.date);
      if (!isValid(dateA) && !isValid(dateB)) return 0;
      if (!isValid(dateA)) return 1;
      if (!isValid(dateB)) return -1;
      return dateB.getTime() - dateA.getTime();
    });
  }, [transactions]);

  // console.log("Sorted transactions:", sortedTransactions);

  // Bakiye hesaplama
  const calculatedBalances = useMemo(() => {
    const newBalances: Record<Currency, number> = { USD: 0, TRY: 0, EUR: 0 };
    
    if (!Array.isArray(transactions)) {
      console.error("Transactions is not an array for balance calculation");
      return newBalances;
    }

    transactions.forEach(transaction => {
      const cur = (transaction as any).currency as Currency | undefined;
      const amt = typeof (transaction as any).amount === 'number' ? (transaction as any).amount as number : 0;
      if (!cur || isNaN(amt)) return;
      if (entityType === 'customer') {
        const tType = (transaction as any).transactionType as string;
        if (tType === 'sale') {
          newBalances[cur] = (newBalances[cur] || 0) + amt;
        } else if (tType === 'payment') {
          newBalances[cur] = (newBalances[cur] || 0) - amt;
        }
      } else {
        // supplier: purchases increase debt, payments to supplier decrease debt
        const tType = (transaction as any).transactionType as string;
        if (tType === 'purchase') {
          newBalances[cur] = (newBalances[cur] || 0) + amt;
        } else if (tType === 'paymentToSupplier') {
          newBalances[cur] = (newBalances[cur] || 0) - amt;
        }
      }
    });

    return newBalances;
  }, [transactions, entityType]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    try {
      // Create a hidden iframe-based print flow (more reliable on mobile than window.open)
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) throw new Error('Print iframe document not available');

      const content = document.querySelector('html')?.innerHTML ?? '';

      doc.open();
      doc.write(`
        <html>
          <head>
            <title>${entity.name} - Hesap Ekstresi</title>
            <style>
              ${document.querySelector('style')?.innerHTML || ''}
              @media print {
                @page { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `);
      doc.close();

      const onLoadAndPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          // Clean up the iframe after a short delay to allow print dialog
          setTimeout(() => {
            iframe.parentNode && iframe.parentNode.removeChild(iframe);
          }, 1500);
        }
      };

      // If the iframe loads synchronously, call immediately; otherwise wait for load
      if ((iframe.contentDocument || iframe.contentWindow?.document)?.readyState === 'complete') {
        onLoadAndPrint();
      } else {
        iframe.onload = onLoadAndPrint;
      }
    } catch (err) {
      console.error('Print/PDF export failed:', err);
      // As a last resort, attempt direct window.print
      try { window.print(); } catch {}
    }
  };

  const getTransactionTypeLabel = (type: any) => {
    if (entityType === 'customer') {
      return type === 'sale' ? 'Satış' : 'Ödeme';
    } else {
      // supplier
      return type === 'purchase' ? 'Satın Alma' : 'Ödeme';
    }
  };

  const allCurrencies = useMemo(() => {
    const currenciesFromTransactions = new Set(transactions.map(t => t.currency));
    Object.keys(calculatedBalances).forEach(currency => {
      if (calculatedBalances[currency as Currency] !== 0) {
        currenciesFromTransactions.add(currency as Currency);
      }
    });
    if (currenciesFromTransactions.size === 0) {
      currenciesFromTransactions.add('TRY'); // Varsayılan olarak TRY ekle
    }
    return Array.from(currenciesFromTransactions) as Currency[];
  }, [transactions, calculatedBalances]);

  const calculateTotalForCurrency = (currency: Currency): { inc: number; dec: number } => {
    // inc: increases balance (sales for customers, purchases for suppliers)
    // dec: decreases balance (payments)
    return transactions.reduce((acc, t) => {
      const cur = (t as any).currency as Currency | undefined;
      if (cur !== currency) return acc;
      const amt = Number((t as any).amount || 0);
      const tType = (t as any).transactionType as string;
      if (entityType === 'customer') {
        if (tType === 'sale') acc.inc += amt;
        else if (tType === 'payment') acc.dec += amt;
      } else {
        if (tType === 'purchase') acc.inc += amt;
        else if (tType === 'paymentToSupplier') acc.dec += amt;
      }
      return acc;
    }, { inc: 0, dec: 0 });
  };

  return (
    <div className="bg-background text-foreground min-h-screen p-4 sm:p-6 md:p-8 print:p-0">
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            background-color: white !important; /* Arka planı beyaz yap */
            color: black !important; /* Yazı rengini siyah yap */
          }
          .no-print {
            display: none !important;
          }
          /* Removed print-p-0 and print-m-0 as they can cause issues */
          .print-text-sm { font-size: 0.8rem !important; line-height: 1rem !important; }
          .print-break-inside-avoid { page-break-inside: avoid !important; }
          /* Table specific styles for print */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
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
          /* Specific column widths for statement view table */
          .statement-table-date { width: 15% !important; }
          .statement-table-type { width: 10% !important; } /* Tür sütununu daralt */
          .statement-table-description { width: 55% !important; } /* Açıklama sütununu genişlet */
          .statement-table-amount { width: 20% !important; }
        }
      `}</style>

      <header className="mb-8 print:mb-4">
        <div className="flex justify-end items-center mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="no-print">
                <Printer className="mr-2 h-4 w-4" />
                Yazdır / PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Direkt Yazdır
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileDown className="mr-2 h-4 w-4" />
                PDF Olarak Kaydet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Separator />
      </header>

      <section className="mb-8 print:mb-4 print:break-inside-avoid">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h2 className="text-xl print:text-lg font-semibold mb-2">
              {entityType === 'customer' ? 'Müşteri Bilgileri' : 'Tedarikçi Bilgileri'}
            </h2>
            <p className="print:text-sm"><strong>İsim:</strong> {entity.name}</p>
            {entity.email && <p className="print:text-sm"><strong>E-posta:</strong> {entity.email}</p>}
            {entity.phone && <p className="print:text-sm"><strong>Telefon:</strong> {entity.phone}</p>}
            {entity.address && <p className="print:text-sm"><strong>Adres:</strong> {entity.address}</p>}
            {entity.taxId && <p className="print:text-sm"><strong>Vergi/TC No:</strong> {entity.taxId}</p>}
          </div>
          <div className="text-right md:text-left print:text-sm"> 
            <h2 className="text-xl print:text-lg font-semibold mb-2">Hesap Ekstresi</h2>
            <p><strong>Ekstre Tarihi:</strong> {statementDate}</p>
            <p><strong>Oluşturulma Tarihi:</strong> {safeFormatDate(entity.createdAt, "dd.MM.yyyy")}</p>
          </div>
        </div>
      </section>
      
      <Separator className="my-6 print:my-3"/>

      <section className="mb-8 print:mb-4 print:break-inside-avoid">
        <h2 className="text-xl print:text-lg font-semibold mb-3">Bakiye Özeti</h2>
        {allCurrencies.map(currency => {
          const { inc, dec } = calculateTotalForCurrency(currency);
          const totalSalesOrPurchases = inc;
          const totalPaymentsReceivedOrMade = dec;
          const netBalance = calculatedBalances[currency] || 0;
          
          if (totalSalesOrPurchases === 0 && totalPaymentsReceivedOrMade === 0 && netBalance === 0) {
            return null;
          }

          return (
            <Card key={currency} className="mb-4 print:shadow-none print:border-0">
              <CardHeader className="pb-2 pt-4 print:pb-1 print:pt-2">
                <CardTitle className="text-lg print:text-base">Bakiye ({currency})</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 text-sm print:text-xs print:pb-2">
                <div>
                  <p className="text-muted-foreground">{entityType === 'customer' ? 'Toplam Satış' : 'Toplam Satış'}:</p>
                  <p className="font-semibold">{formatCurrencyForStatement(totalSalesOrPurchases, currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{entityType === 'customer' ? 'Toplam Tahsilat' : 'Toplam Tahsilat'}:</p>
                  <p className="font-semibold">{formatCurrencyForStatement(totalPaymentsReceivedOrMade, currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Net Bakiye:</p>
                  <p className={cn(
                    "font-bold text-lg print:text-base",
                    entityType === 'customer' ? (netBalance >= 0 ? 'text-green-600' : 'text-red-600') : (netBalance > 0 ? 'text-red-600' : 'text-green-600')
                  )}>
                    {formatCurrencyForStatement(netBalance, currency)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({entityType === 'customer' ? (netBalance >= 0 ? 'Alacaklı' : 'Borçlu') : (netBalance > 0 ? 'Borçlusunuz' : 'Alacaklısınız')})
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Separator className="my-6 print:my-3"/>

      <section className="mb-8 print:mb-4 print:break-inside-avoid">
        <h2 className="text-xl print:text-lg font-semibold mb-3">Hesap Hareketleri</h2>
        {sortedTransactions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="statement-table-date">Tarih</TableHead>
                <TableHead className="statement-table-type">Tür</TableHead>
                <TableHead className="statement-table-description">Açıklama</TableHead>
                <TableHead className="text-right statement-table-amount">Tutar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="statement-table-date">{safeFormatDate(item.date, "dd.MM.yyyy")}</TableCell>
                  <TableCell className="statement-table-type">{getTransactionTypeLabel(item.transactionType)}</TableCell>
                  <TableCell className="statement-table-description">
                    {item.transactionType === 'sale' ? (item as Sale).description :
                     item.transactionType === 'payment' ? (item as Payment).method :
                     '-'}
                  </TableCell>
                  <TableCell className="text-right statement-table-amount font-mono">
                    {formatCurrencyForStatement(item.amount, item.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground">Hesap hareketi bulunmamaktadır.</p>
        )}
      </section>

      <footer className="mt-12 print:mt-6 pt-4 border-t print:text-xs text-center text-muted-foreground">
        <p>
          Bu ekstre {statementDate} tarihinde ERMAY tarafından oluşturulmuştur.
        </p>
      </footer>
    </div>
  );
}
