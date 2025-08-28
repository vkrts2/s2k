"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getPurchases, getSupplierById } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

export default function PurchaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState<any | null>(null);
  const [supplierName, setSupplierName] = useState<string>("");

  const purchaseId = params?.id as string;

  useEffect(() => {
    const load = async () => {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const purchases = await getPurchases(user.uid);
        const found = purchases.find((p: any) => p.id === purchaseId) || null;
        setPurchase(found);
        if (found?.supplierId) {
          try {
            const s = await getSupplierById(user.uid, found.supplierId);
            if (s) setSupplierName(s.name);
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, authLoading, purchaseId]);

  const title = useMemo(() => {
    if (!purchase) return "Alış Detayı";
    return purchase.manualProductName || purchase.description || "Alış Detayı";
    // Çok kalemli ise üst başlık yine genel açıklama olarak kalır
  }, [purchase]);

  if (loading) return <div className="p-6">Yükleniyor...</div>;
  if (!user) return <div className="p-6">Bu sayfayı görüntülemek için giriş yapmalısınız.</div>;
  if (!purchase) return <div className="p-6">Kayıt bulunamadı.</div>;

  const hasItems = Array.isArray(purchase.invoiceItems) && purchase.invoiceItems.length > 0;

  return (
    <div className="flex-1 space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Geri</Button>
          <Link href="/purchases">
            <Button variant="secondary">Alış Listesi</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Özet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Tarih:</span> {purchase.date ? format(parseISO(purchase.date), 'dd MMMM yyyy', { locale: tr }) : '-'}
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Tedarikçi:</span> {supplierName || '-'}
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Para Birimi:</span> {purchase.currency || '-'}
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Tutar:</span> {(purchase.amount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>

      {hasItems ? (
        <Card>
          <CardHeader>
            <CardTitle>Fatura Kalemleri</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead>Birim</TableHead>
                  <TableHead className="text-right">Birim Fiyat</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.invoiceItems.map((it: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{it.productName || '-'}</TableCell>
                    <TableCell className="text-right">{it.quantity ?? '-'}</TableCell>
                    <TableCell>{it.unit || '-'}</TableCell>
                    <TableCell className="text-right">{(it.unitPrice ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">{((it.quantity || 0) * (it.unitPrice || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Ürün</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Ad/Açıklama:</span> {purchase.manualProductName || purchase.description || '-'}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Miktar:</span> {purchase.quantityPurchased ?? '-'}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Birim Fiyat:</span> {(purchase.unitPrice ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
