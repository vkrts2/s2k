"use client";

import React from "react";
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
import { Users, Edit, Trash2 } from "lucide-react";
import type { Customer, Sale, Payment, Currency } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  if (customers.length === 0) {
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
    
    const balances: Record<Currency, number> = { TRY: 0, USD: 0 };

    customerSales.forEach(sale => {
      balances[sale.currency] = (balances[sale.currency] || 0) + sale.amount;
    });
    customerPayments.forEach(payment => {
      balances[payment.currency] = (balances[payment.currency] || 0) - payment.amount;
    });
    return balances;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Müşteri Adı</TableHead>
              <TableHead className="text-right">Bakiye (TRY)</TableHead>
              <TableHead className="text-right">Bakiye (USD)</TableHead>
              <TableHead className="text-right w-[150px]">Eylemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const balances = calculateBalancesForCustomer(customer.id);
              return (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    <Link href={`/customers/${customer.id}`} className="hover:underline text-primary">
                      {customer.name}
                    </Link>
                  </TableCell>
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
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
