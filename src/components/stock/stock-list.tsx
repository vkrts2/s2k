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
import { Badge } from "@/components/ui/badge";

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
          <CardTitle>Ürünler</CardTitle>
          <CardDescription>Ürünler yüklenirken bir sorun oluştu veya hiç ürün bulunamadı.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Görüntülenecek ürün yok.</p>
          <p className="text-sm text-muted-foreground mt-2">Yeni bir ürün ekleyerek başlayın.</p>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ürünler</CardTitle>
          <CardDescription>Henüz ürün eklenmemiş.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Görüntülenecek ürün yok.</p>
          <p className="text-sm text-muted-foreground mt-2">Yeni bir ürün ekleyerek başlayın.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-3">
            Ürünler
            <Badge variant="secondary" className="text-xs font-normal">{items.length}</Badge>
          </CardTitle>
        </div>
        <CardDescription>Eklenen tüm ürünleriniz burada listelenir.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[56px]">#</TableHead>
              <TableHead>Ürün Adı</TableHead>
              <TableHead>Stok Miktarı</TableHead>
              <TableHead>Eklenme Tarihi</TableHead>
              <TableHead className="text-right w-[100px]">Eylemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-medium">
                  <Link href={`/stock/${item.id}`} className="hover:underline text-primary">
                    {item.name}
                  </Link>
                </TableCell>
                <TableCell>{typeof item.currentStock === 'number' ? item.currentStock : 0}</TableCell>
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
