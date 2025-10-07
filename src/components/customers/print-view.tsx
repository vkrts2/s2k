import React from 'react';
import type { Customer, UnifiedTransaction, Currency } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';

interface PrintViewProps {
  customer: Customer;
  transactions: UnifiedTransaction[];
  onClose: () => void;
}

export function PrintView({ customer, transactions, onClose }: PrintViewProps) {
  const formatCurrency = (amount: number, currency: Currency): string => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      amount = 0;
    }
    try {
      return amount.toLocaleString("tr-TR", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch (error) {
      console.error("Error formatting currency:", error, { amount, currency });
      if (currency === 'TRY') return `₺${amount.toFixed(2)}`;
      if (currency === 'USD') return `$\${amount.toFixed(2)}`;
      if (currency === 'EUR') return `€${amount.toFixed(2)}`;
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  const safeFormatDate = (dateString: string, formatString: string) => {
    const date = parseISO(dateString);
    return isValid(date) ? format(date, formatString, { locale: tr }) : "Geçersiz Tarih";
  };

  const totalSales = transactions.filter(t => t.transactionType === 'sale').reduce((sum, sale) => sum + sale.amount, 0);
  const totalPayments = transactions.filter(t => t.transactionType === 'payment').reduce((sum, payment) => sum + payment.amount, 0);
  const balance = totalSales - totalPayments;

  return (
    <div className="p-8 print:p-0">
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-2xl font-bold">Müşteri Ekstresi</h1>
      </div>

      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-3xl font-bold">Ekstre Görünümü: {customer.name}</h1>
        <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Kapat</button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Müşteri Bilgileri</h2>
        <p><strong>Adı:</strong> {customer.name}</p>
        <p><strong>E-posta:</strong> {customer.email || '-'}</p>
        <p><strong>Telefon:</strong> {customer.phone || '-'}</p>
        <p><strong>Adres:</strong> {customer.address || '-'}</p>
        <p><strong>Vergi Numarası:</strong> {customer.taxNumber || '-'}</p>
        <p><strong>Vergi Dairesi:</strong> {customer.taxOffice || '-'}</p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Genel Bakiyeler</h2>
        {Object.entries(
          transactions.reduce((acc, t) => {
            if (!acc[t.currency]) acc[t.currency] = 0;
            if (t.transactionType === 'sale') {
              acc[t.currency] += t.amount;
            } else {
              acc[t.currency] -= t.amount;
            }
            return acc;
          }, {} as Record<Currency, number>)
        ).map(([currency, amount]) => (
          <p key={currency}><strong>{currency} Bakiyesi:</strong> {formatCurrency(amount, currency as Currency)}</p>
        ))}
        <p><strong>Genel Bakiye ({customer.defaultCurrency || 'TRY'}):</strong> {formatCurrency(balance, customer.defaultCurrency || 'TRY')}</p>
      </div>

      <h2 className="text-xl font-semibold mb-2">İşlem Detayları</h2>
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
            <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((item) => (
            <tr key={`${item.transactionType}-${item.id}`}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{safeFormatDate(item.date, 'dd.MM.yyyy')}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.transactionType === 'sale' ? 'Satış' : 'Ödeme'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatCurrency(item.amount, item.currency)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.description || '-'}</td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Hiç işlem bulunamadı.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-8 text-sm text-gray-600 print:hidden">
        <p>Ekstre tarihi: {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: tr })}</p>
      </div>
    </div>
  );
} 