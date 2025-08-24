// src/components/portfolio/portfolio-list.tsx
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, Edit, Trash2, UserPlus, Check, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PortfolioItem } from '@/lib/types';

interface PortfolioListProps {
  items: PortfolioItem[];
  onEdit: (item: PortfolioItem) => void;
  onDelete: (itemId: string) => void;
  onAddToCustomers?: (item: PortfolioItem) => void;
  onContactedChange?: (item: PortfolioItem, contacted: boolean) => void;
}

export function PortfolioList({ items, onEdit, onDelete, onAddToCustomers, onContactedChange }: PortfolioListProps) {
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAddToCustomers = (item: PortfolioItem) => {
    setSelectedItem(item);
  };

  const handleConfirmAddToCustomers = () => {
    if (selectedItem && onAddToCustomers) {
      onAddToCustomers(selectedItem);
    }
    setSelectedItem(null);
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

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
    <>
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Portföy Kayıtları</CardTitle>
        <CardDescription>Eklenen tüm portföy kayıtlarınız (veya filtre sonuçlarınız) burada listelenir.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Firma İsmi</TableHead>
                <TableHead>Bulunduğu İl</TableHead>
                <TableHead>İlçe</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Sektör</TableHead>
                <TableHead>Görüşme</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
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
                  <TableCell>{item.district || "-"}</TableCell>
                  <TableCell>{item.phone || "-"}</TableCell>
                  <TableCell>{item.sector || "-"}</TableCell>
                  <TableCell>
                    {onContactedChange && (
                      <Button
                        variant={item.contacted ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onContactedChange(item, !item.contacted)}
                        aria-label={item.contacted ? "Görüşme Yapıldı" : "Görüşme Yapılmadı"}
                      >
                        {item.contacted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {onAddToCustomers && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary" 
                          onClick={() => handleAddToCustomers(item)}
                          aria-label="Müşterilere Ekle"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )}
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
                        onClick={() => setDeleteConfirmId(item.id)}
                        aria-label="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

      <AlertDialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Müşterilere Ekle</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedItem?.companyName} firmasını müşterilerinize eklemek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAddToCustomers}>
              Müşterilere Ekle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Silme Onayı</AlertDialogTitle>
            <AlertDialogDescription>
              Bu kaydı silmek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hayır</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Evet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
