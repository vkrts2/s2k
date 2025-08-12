"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Edit, Trash2, Search, Home } from "lucide-react";
import type { Customer, Sale, Payment, Currency } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CustomerListProps {
  customers: Customer[];
  sales: Sale[];
  payments: Payment[];
  isLoading: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
  title?: string;
}

const formatCurrency = (amount: number, currency: Currency) => {
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
    console.error("Error formatting currency:", error, {amount, currency});
    // Fallback for invalid currency code, though 'TRY' and 'USD' should be valid
    if (currency === 'TRY') return `₺${amount.toFixed(2)}`;
    if (currency === 'USD') return `$${amount.toFixed(2)}`;
    return `${amount.toFixed(2)} ${currency}`;
  }
};

export function CustomerList({
  customers,
  sales,
  payments,
  isLoading,
  onEdit,
  onDelete,
  title = "Tüm Müşteriler",
}: CustomerListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  if (customers.length === 0 && !isLoading && searchTerm === "") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Henüz müşteri kaydedilmemiş.</p>
          <p className="text-sm text-muted-foreground mt-2">Yeni bir müşteri ekleyerek başlayın.</p>
        </CardContent>
      </Card>
    );
  }

  const calculateBalancesForCustomer = (customerId: string): Record<Currency, number> => {
    const customerSales = sales.filter(s => s.customerId === customerId);
    const customerPayments = payments.filter(p => p.customerId === customerId);
    
    const balances: Record<Currency, number> = { TRY: 0, USD: 0, EUR: 0 };

    customerSales.forEach(sale => {
      balances[sale.currency] = (balances[sale.currency] || 0) + sale.amount;
    });
    customerPayments.forEach(payment => {
      balances[payment.currency] = (balances[payment.currency] || 0) - payment.amount;
    });
    return balances;
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  .sort((a, b) => {
    // Bakiye hesapla (TRY + USD)
    const aBalance = (sales.filter(s => s.customerId === a.id).reduce((sum, s) => sum + (s.amount || 0), 0) - payments.filter(p => p.customerId === a.id).reduce((sum, p) => sum + (p.amount || 0), 0));
    const bBalance = (sales.filter(s => s.customerId === b.id).reduce((sum, s) => sum + (s.amount || 0), 0) - payments.filter(p => p.customerId === b.id).reduce((sum, p) => sum + (p.amount || 0), 0));
    
    // Önce bakiyeye göre sırala (en yüksek bakiye üstte)
    if (aBalance !== bBalance) {
      return bBalance - aBalance; // Azalan sıralama (yüksekten düşüğe)
    }
    
    // Bakiye eşitse alfabetik sırala
    return a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' });
  });

  // Toplam bakiyeleri hesapla
  const totalBalances = customers.reduce((acc, customer) => {
    const balances = calculateBalancesForCustomer(customer.id);
    acc.TRY += balances.TRY || 0;
    acc.USD += balances.USD || 0;
    return acc;
  }, { TRY: 0, USD: 0 });

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Link href="/" passHref legacyBehavior>
            <Button variant="ghost" size="icon" className="h-8 w-8 mr-2" title="Ana Sayfa">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 flex flex-col items-center">
            <CardTitle className="text-3xl font-bold text-center w-full">{title}</CardTitle>
          </div>
          <div className="flex-shrink-0 ml-4">
            <div className="flex flex-col items-end">
              <div className="bg-neutral-900/95 rounded-xl shadow-lg px-6 py-3 border border-gray-700 min-w-[260px] max-w-full space-y-3 mt-0">
                <span className="text-base font-bold text-white flex items-center">
                  Toplam Bakiye (TRY):
                  <span className={
                    totalBalances.TRY > 0 ? "text-xl font-bold text-green-400 ml-2" :
                    totalBalances.TRY < 0 ? "text-xl font-bold text-red-400 ml-2" :
                    "text-xl font-bold text-gray-400 ml-2"
                  }>
                    {formatCurrency(totalBalances.TRY, 'TRY')}
                  </span>
                </span>
                <span className="text-base font-bold text-white flex items-center">
                  Toplam Bakiye (USD):
                  <span className={
                    totalBalances.USD > 0 ? "text-xl font-bold text-green-400 ml-2" :
                    totalBalances.USD < 0 ? "text-xl font-bold text-red-400 ml-2" :
                    "text-xl font-bold text-gray-400 ml-2"
                  }>
                    {formatCurrency(totalBalances.USD, 'USD')}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Input
            placeholder="Müşteri ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Müşteri Adı</TableHead>
              {/* <TableHead>E-posta</TableHead> */}
              {/* <TableHead>Telefon</TableHead> */}
              <TableHead className="text-right">Bakiye (TRY)</TableHead>
              <TableHead className="text-right">Bakiye (USD)</TableHead>
              <TableHead className="text-right w-[150px]">Eylemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Yükleniyor...</TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Müşteri bulunamadı.</TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => {
              const balances = calculateBalancesForCustomer(customer.id);
              return (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    <Link href={`/customers/${customer.id}`} className="hover:underline text-primary">
                      {customer.name}
                    </Link>
                  </TableCell>
                  {/* <TableCell>{customer.email}</TableCell> */}
                  {/* <TableCell>{customer.phone}</TableCell> */}
                  <TableCell className={cn(
                      "text-right font-mono",
                      balances.TRY > 0 ? "text-green-600" : balances.TRY < 0 ? "text-red-600" : ""
                    )}>
                    {formatCurrency(balances.TRY, "TRY")}
                  </TableCell>
                  <TableCell className={cn(
                      "text-right font-mono",
                      balances.USD > 0 ? "text-green-600" : balances.USD < 0 ? "text-red-600" : ""
                    )}>
                    {formatCurrency(balances.USD, "USD")}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => onEdit(customer)}
                      title="Düzenle"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => onDelete(customer.id)}
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
