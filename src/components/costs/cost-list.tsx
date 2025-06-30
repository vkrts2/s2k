"use client";

import React from "react";
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
import { Edit, Trash2, ClipboardList } from "lucide-react";
import type { Cost } from "@/lib/types";
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

interface CostListProps {
  items: Cost[];
  onEdit: (item: Cost) => void;
  onDelete: (itemId: string) => void;
}

export function CostList({ items, onEdit, onDelete }: CostListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Maliyetler</CardTitle>
          <CardDescription>Henüz maliyet eklenmemiş.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Görüntülenecek maliyet yok.</p>
          <p className="text-sm text-muted-foreground mt-2">Yeni bir maliyet ekleyerek başlayın.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maliyetler</CardTitle>
        <CardDescription>Eklenen tüm maliyetleriniz burada listelenir.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Açıklama</TableHead>
              <TableHead className="w-[150px]">Oluşturma Tarihi</TableHead>
              <TableHead className="text-right w-[100px]">Eylemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.description}</TableCell>
                <TableCell>{format(parseISO(item.createdAt), "dd.MM.yyyy", { locale: tr })}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(item)}
                    aria-label="Düzenle"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
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