import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Supplier, Purchase, PaymentToSupplier, Currency } from '@/lib/types';

type UnifiedTransactionForSupplier = (Purchase & { transactionType: 'purchase' }) |
                                    (PaymentToSupplier & { transactionType: 'paymentToSupplier' });

interface PrintViewProps {
  supplier: Supplier;
  filteredAndSortedTransactions: UnifiedTransactionForSupplier[];
  totalPurchases: number;
  totalPaymentsToSupplier: number;
  balance: number;
  dateRange?: { from?: Date; to?: Date };
}

export function PrintView({
  supplier,
  filteredAndSortedTransactions,
  totalPurchases,
  totalPaymentsToSupplier,
  balance,
  dateRange,
}: PrintViewProps) {
  const safeFormatDate = (dateString: string, formatString: string) => {
    if (!dateString) return "Tarih Yok";
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, formatString, { locale: tr });
      }
      return "Geçersiz Tarih";
    } catch (error) {
      return "Tarih Format Hatası";
    }
  };

  const formatCurrency = (amount: number, currency: Currency): string => {
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
      console.error("Error formatting currency:", e);
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">{supplier.name}</h1>
        <p className="text-sm text-muted-foreground">
          {dateRange?.from && dateRange?.to
            ? `${safeFormatDate(dateRange.from.toISOString(), 'dd.MM.yyyy')} - ${safeFormatDate(dateRange.to.toISOString(), 'dd.MM.yyyy')}`
            : 'Tüm İşlemler'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Toplam Alış</div>
          <div className="text-xl font-bold text-blue-600">{formatCurrency(totalPurchases, 'TRY')}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Toplam Ödeme</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(totalPaymentsToSupplier, 'TRY')}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Bakiye</div>
          <div className={cn(
            "text-xl font-bold",
            balance > 0 ? "text-red-600" : "text-green-600"
          )}>
            {formatCurrency(balance, 'TRY')}
          </div>
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Tarih</th>
            <th className="text-left p-2">İşlem</th>
            <th className="text-right p-2">Tutar</th>
            <th className="text-left p-2">Detay</th>
          </tr>
        </thead>
        <tbody>
          {filteredAndSortedTransactions.map((item) => (
            <tr key={`${item.transactionType}-${item.id}`} className="border-b">
              <td className="p-2">{safeFormatDate(item.date, 'dd.MM.yyyy')}</td>
              <td className="p-2">{item.transactionType === 'purchase' ? 'Alış' : 'Ödeme'}</td>
              <td className="p-2 text-right">{formatCurrency(item.amount, item.currency)}</td>
              <td className="p-2">
                {item.transactionType === 'purchase' && 'quantityPurchased' in item && 'unitPrice' in item && item.quantityPurchased && item.unitPrice && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Detay:</span>
                    <span className="text-sm">
                      {(item as Purchase).quantityPurchased} adet × {formatCurrency((item as Purchase).unitPrice ?? 0, (item as Purchase).currency)}
                    </span>
                  </div>
                )}
                {item.transactionType === 'paymentToSupplier' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ödeme Yöntemi:</span>
                    <span className="text-sm">{(item as PaymentToSupplier).method}</span>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 