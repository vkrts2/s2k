// src/components/stock/stock-item-detail-page.tsx
"use client";

import React from 'react';
import type { StockItem, StockTransaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import { Package, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';

interface StockItemDetailPageClientProps {
  stockItem: StockItem;
  transactions: StockTransaction[];
}

const safeFormatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, "dd.MM.yyyy", { locale: tr });
  } catch (e) {
    return "Geçersiz Tarih";
  }
};

const formatCurrency = (amount: number, currency: string): string => {
  try {
    return amount.toLocaleString('tr-TR', { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch (e) {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

export function StockItemDetailPageClient({ stockItem, transactions }: StockItemDetailPageClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Stok Listesine Geri Dön
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center">
                <Package className="mr-3 h-7 w-7 text-primary" /> {stockItem.name}
              </CardTitle>
              <CardDescription>{stockItem.description || "Açıklama yok"}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><strong>Mevcut Stok:</strong> {stockItem.currentStock} {stockItem.unit || "Adet"}</div>
          <div><strong>Birim:</strong> {stockItem.unit || "-"}</div>
          <div><strong>Eklenme Tarihi:</strong> {safeFormatDate(stockItem.createdAt)}</div>
          <div><strong>Son Güncelleme:</strong> {safeFormatDate(stockItem.updatedAt)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>İşlem Geçmişi</CardTitle>
          <CardDescription>Bu stok kalemiyle ilgili tüm satış ve alım hareketleri.</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Bu stok kalemi için henüz işlem geçmişi yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>İlgili Kişi/Firma</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead className="text-right">Birim Fiyat</TableHead>
                  <TableHead className="text-right">Toplam Tutar</TableHead>
                  <TableHead className="text-right">Para Birimi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{safeFormatDate(transaction.date)}</TableCell>
                    <TableCell>
                      {transaction.transactionType === 'sale' ? (
                        <span className="text-green-600">Satış</span>
                      ) : (
                        <span className="text-blue-600">Alım</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.transactionType === 'sale' 
                        ? (transaction as any).customerName 
                        : (transaction as any).supplierName}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.transactionType === 'sale'
                        ? (transaction as any).quantitySold
                        : (transaction as any).quantityPurchased}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.transactionType === 'sale'
                        ? formatCurrency((transaction as any).unitPrice || 0, transaction.currency)
                        : formatCurrency((transaction as any).unitPrice || 0, transaction.currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </TableCell>
                    <TableCell className="text-right">{transaction.currency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
