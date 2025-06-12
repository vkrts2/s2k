// src/components/stock/stock-list.tsx
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Edit, Trash2 } from "lucide-react";
import type { StockItem } from "@/lib/types";
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

interface StockListProps {
  items: StockItem[];
  onEdit: (item: StockItem) => void;
  onDelete: (itemId: string) => void;
}

export function StockList({ items, onEdit, onDelete }: StockListProps) {
  if (!Array.isArray(items)) {
    console.error("StockList: 'items' prop is not an array.", items);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stok Kalemleri</CardTitle>
          <CardDescription>Stok kalemleri yüklenirken bir sorun oluştu veya hiç stok kalemi bulunamadı.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Görüntülenecek stok kalemi yok.</p>
          <p className="text-sm text-muted-foreground mt-2">Yeni bir stok kalemi ekleyerek başlayın.</p>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stok Kalemleri</CardTitle>
          <CardDescription>Henüz stok kalemi eklenmemiş.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Görüntülenecek stok kalemi yok.</p>
          <p className="text-sm text-muted-foreground mt-2">Yeni bir stok kalemi ekleyerek başlayın.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Stok Kalemleri</CardTitle>
        <CardDescription>Eklenen tüm stok kalemleriniz burada listelenir.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ürün Adı</TableHead>
              <TableHead className="text-right">Mevcut Stok</TableHead>
              <TableHead>Birim</TableHead>
              <TableHead>Eklenme Tarihi</TableHead>
              <TableHead className="text-right w-[100px]">Eylemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <Link href={`/stock/${item.id}`} className="hover:underline text-primary">
                    {item.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right">{item.currentStock}</TableCell>
                <TableCell>{item.unit || "-"}</TableCell>
                <TableCell>{format(parseISO(item.createdAt), "dd MMM yyyy", { locale: tr })}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => onEdit(item)}
                    aria-label="Düzenle"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => onDelete(item.id)}
                    aria-label="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
