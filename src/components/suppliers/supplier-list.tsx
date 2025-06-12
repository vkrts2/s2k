"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Edit, Trash2 } from "lucide-react";
import type { Supplier, Purchase, PaymentToSupplier, Currency } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SupplierListProps {
  suppliers: Supplier[];
  allPurchases: Purchase[];
  allPaymentsToSuppliers: PaymentToSupplier[];
  isLoading: boolean;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplierId: string) => void;
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
    if (currency === 'TRY') return `₺${amount.toFixed(2)}`;
    if (currency === 'USD') return `$${amount.toFixed(2)}`;
    return `${amount.toFixed(2)} ${currency}`;
  }
};

export function SupplierList({
  suppliers,
  allPurchases,
  allPaymentsToSuppliers,
  isLoading,
  onEdit,
  onDelete,
  title = "Tüm Tedarikçiler",
}: SupplierListProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (suppliers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <Truck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Henüz tedarikçi kaydedilmemiş.</p>
          <p className="text-sm text-muted-foreground mt-2">Yeni bir tedarikçi ekleyerek başlayın.</p>
        </CardContent>
      </Card>
    );
  }

  const calculateBalancesForSupplier = (supplierId: string): Record<Currency, number> => {
    const supplierPurchases = allPurchases.filter(p => p.supplierId === supplierId);
    const supplierPayments = allPaymentsToSuppliers.filter(p => p.supplierId === supplierId);
    
    const balances: Record<Currency, number> = { TRY: 0, USD: 0 };

    // For suppliers, purchases increase what you owe them (positive balance from your perspective of debt)
    // Payments to suppliers decrease what you owe them.
    supplierPurchases.forEach(purchase => {
      balances[purchase.currency] = (balances[purchase.currency] || 0) + purchase.amount;
    });
    supplierPayments.forEach(payment => {
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
              <TableHead>Tedarikçi Adı</TableHead>
              <TableHead className="text-right">Bakiye (TRY)</TableHead>
              <TableHead className="text-right">Bakiye (USD)</TableHead>
              <TableHead className="text-right w-[150px]">Eylemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => {
              const balances = calculateBalancesForSupplier(supplier.id);
              // For suppliers, a positive balance means you owe them.
              // A negative balance means you've overpaid or they owe you (less common in this simple model).
              // We can keep the same color logic: red if you owe (positive), green if they owe you (negative).
              // Or reverse it: green if you owe (it's a liability on your books), red if they owe you.
              // Let's keep it consistent with customer: positive is green, negative is red.
              // For a supplier, balance = (payments_to_them - purchases_from_them).
              // Or if balance = purchases_from_them - payments_to_them, then positive balance means you owe them.
              // Let's stick to the latter for now: positive = owe them (red).
              const displayBalances = {
                TRY: balances.TRY, // if positive, you owe TRY
                USD: balances.USD  // if positive, you owe USD
              };

              return (
                <TableRow
                  key={supplier.id}
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/suppliers/${supplier.id}`}
                      className="text-primary underline hover:text-primary/80 transition-colors"
                    >
                      {supplier.name}
                    </Link>
                  </TableCell>
                  <TableCell className={cn(
                      "text-right font-mono",
                      displayBalances.TRY > 0 ? "text-red-600" : displayBalances.TRY < 0 ? "text-green-600" : ""
                    )}>
                    {formatCurrency(displayBalances.TRY, "TRY")}
                  </TableCell>
                  <TableCell className={cn(
                      "text-right font-mono",
                      displayBalances.USD > 0 ? "text-red-600" : displayBalances.USD < 0 ? "text-green-600" : ""
                    )}>
                    {formatCurrency(displayBalances.USD, "USD")}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onEdit(supplier);
                      }}
                      title="Düzenle"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onDelete(supplier.id);
                      }}
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
