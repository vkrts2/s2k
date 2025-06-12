// src/components/portfolio/portfolio-list.tsx
"use client";

import React from "react";
import Link from "next/link"; // Link import edildi
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
import { Briefcase, Edit, Trash2 } from "lucide-react";
import type { PortfolioItem } from "@/lib/types";

interface PortfolioListProps {
  items: PortfolioItem[];
  onEdit: (item: PortfolioItem) => void;
  onDelete: (itemId: string) => void;
}

export function PortfolioList({ items, onEdit, onDelete }: PortfolioListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portföy Kayıtları</CardTitle>
          <CardDescription>Filtre kriterlerine uygun portföy kaydı bulunmamaktadır veya henüz kayıt eklenmemiştir.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Görüntülenecek portföy kaydı yok.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Portföy Kayıtları</CardTitle>
        <CardDescription>Eklenen tüm portföy kayıtlarınız (veya filtre sonuçlarınız) burada listelenir.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Firma İsmi</TableHead>
              <TableHead>Bulunduğu İl</TableHead>
              <TableHead>Sektör</TableHead>
              <TableHead className="text-right w-[100px]">Eylemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <Link href={`/portfolio/${item.id}`} className="hover:underline text-primary">
                    {item.companyName}
                  </Link>
                </TableCell>
                <TableCell>{item.city || "-"}</TableCell>
                <TableCell>{item.sector}</TableCell>
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
