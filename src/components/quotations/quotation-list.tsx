// src/components/quotations/quotation-list.tsx
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
import { FileText, Edit, Trash2, Printer } from "lucide-react"; // Download ikonu Printer ile değiştirildi
import type { Quotation, Currency } from "@/lib/types";
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
// PDF ile ilgili importlar kaldırıldı

interface QuotationListProps {
  quotations: Quotation[];
  onEdit: (quotation: Quotation) => void;
  onDelete: (quotationId: string) => void;
  isLoading?: boolean;
}

const formatCurrencyForList = (amount: number, currency: Currency) => {
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
    return `${amount.toFixed(2)} ${currency}`;
  }
};

const safeFormatDate = (dateString: string | undefined, formatStr: string = "dd.MM.yyyy") => {
  if (!dateString) return "-";
  try {
    const date = parseISO(dateString);
    return isValid(date) ? format(date, formatStr, { locale: tr }) : "Geçersiz Tarih";
  } catch {
    return "Hata";
  }
};

export function QuotationList({ quotations, onEdit, onDelete, isLoading }: QuotationListProps) {
  const { toast } = useToast();
  // PDF indirme ile ilgili state kaldırıldı
  // const [isDownloadingPdf, setIsDownloadingPdf] = useState<string | null>(null);

  // handleDownloadPdf fonksiyonu kaldırıldı.

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fiyat Teklifleri</CardTitle>
          <CardDescription>Teklifler yükleniyor...</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (quotations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fiyat Teklifleri</CardTitle>
          <CardDescription>Henüz oluşturulmuş bir fiyat teklifi yok.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Yeni bir fiyat teklifi oluşturarak başlayın.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Fiyat Teklifleri</CardTitle>
        <CardDescription>Oluşturulan tüm fiyat teklifleriniz burada listelenir.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teklif No</TableHead>
              <TableHead>Müşteri Adı</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead className="text-right">Toplam Tutar</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right w-[150px]">Eylemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations.map((quotation) => (
              <TableRow key={quotation.id}>
                <TableCell className="font-medium">{quotation.quotationNumber}</TableCell>
                <TableCell>{quotation.customerName}</TableCell>
                <TableCell>{safeFormatDate(quotation.date)}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrencyForList(quotation.grandTotal, quotation.currency)}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    quotation.status === 'Taslak' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100' :
                    quotation.status === 'Gönderildi' ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100' :
                    quotation.status === 'Kabul Edildi' ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' :
                    quotation.status === 'Reddedildi' ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100' :
                    quotation.status === 'Süresi Doldu' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100' : ''
                  }`}>
                    {quotation.status}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button asChild variant="outline" size="icon" className="h-8 w-8" title="Teklifi Yazdır/Görüntüle">
                    <Link href={`/quotations/${quotation.id}/print`} target="_blank">
                      <Printer className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => onEdit(quotation)}
                    title="Düzenle"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => onDelete(quotation.id)}
                    title="Sil"
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
