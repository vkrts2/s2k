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
import { Truck, Edit, Trash2, Search } from "lucide-react";
import type { Supplier, Purchase, PaymentToSupplier, Currency } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const formatCurrency = (amount: number, currency: Currency = 'TRY') => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export function SupplierList({
  suppliers,
  allPurchases,
  allPaymentsToSuppliers,
  isLoading,
  onEdit,
  onDelete,
  title = "Tedarikçiler",
}: SupplierListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortField, setSortField] = React.useState<"name" | "balance">("name");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const calculateBalancesForSupplier = (supplierId: string): Record<Currency, number> => {
    const supplierPurchases = allPurchases.filter(p => p.supplierId === supplierId);
    const supplierPayments = allPaymentsToSuppliers.filter(p => p.supplierId === supplierId);
    
    const balances: Record<Currency, number> = { TRY: 0, USD: 0, EUR: 0 };

    supplierPurchases.forEach(purchase => {
      balances[purchase.currency] = (balances[purchase.currency] || 0) + purchase.amount;
    });
    supplierPayments.forEach(payment => {
      balances[payment.currency] = (balances[payment.currency] || 0) - payment.amount;
    });
    return balances;
  };

  const filteredAndSortedSuppliers = React.useMemo(() => {
    let filtered = suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (sortField === "name") {
        return sortDirection === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        const balanceA = calculateBalancesForSupplier(a.id)[a.defaultCurrency || 'TRY'];
        const balanceB = calculateBalancesForSupplier(b.id)[b.defaultCurrency || 'TRY'];
        return sortDirection === "asc" ? balanceA - balanceB : balanceB - balanceA;
      }
    });
  }, [suppliers, searchQuery, sortField, sortDirection, calculateBalancesForSupplier]);

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

  if (suppliers.length === 0 && searchQuery === "") {
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

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tedarikçi ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer"
                onClick={() => {
                  if (sortField === "name") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortField("name");
                    setSortDirection("asc");
                  }
                }}
              >
                Tedarikçi Adı {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead 
                className="text-right cursor-pointer"
                onClick={() => {
                  if (sortField === "balance") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortField("balance");
                    setSortDirection("asc");
                  }
                }}
              >
                Bakiye {sortField === "balance" && (sortDirection === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead className="text-right w-[150px]">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">Tedarikçi bulunamadı.</TableCell>
              </TableRow>
            ) : (
              filteredAndSortedSuppliers.map((supplier) => {
              const balances = calculateBalancesForSupplier(supplier.id);
              const defaultCurrency = supplier.defaultCurrency || 'TRY';
              const displayBalance = balances[defaultCurrency];

              return (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/suppliers/${supplier.id}`}
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      {supplier.name}
                    </Link>
                  </TableCell>
                    <TableCell>{supplier.email}</TableCell>
                    <TableCell>{supplier.phone}</TableCell>
                  <TableCell className={cn(
                    "text-right font-mono",
                    displayBalance > 0 ? "text-red-600" : displayBalance < 0 ? "text-green-600" : ""
                  )}>
                    {formatCurrency(displayBalance, defaultCurrency)}
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
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
