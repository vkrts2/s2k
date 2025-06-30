"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Package, BellRing } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  description?: string;
}

interface StockAlert {
  id: string;
  productName: string;
  currentQuantity: number;
  threshold: number;
  message: string;
}

const LOW_STOCK_THRESHOLD = 10; // Define your low stock threshold here

export default function AlertsPage() {
  const { toast } = useToast();
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockAlerts();
  }, []);

  const fetchStockAlerts = async () => {
    setLoading(true);
    try {
      const productsCollection = collection(db, "products");
      const productSnapshot = await getDocs(productsCollection);
      const productsList = productSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      const alerts: StockAlert[] = [];
      productsList.forEach(product => {
        if (product.quantity <= LOW_STOCK_THRESHOLD) {
          alerts.push({
            id: product.id,
            productName: product.name,
            currentQuantity: product.quantity,
            threshold: LOW_STOCK_THRESHOLD,
            message: `${product.name} ürününde stok düşük! Mevcut miktar: ${product.quantity} (Eşik: ${LOW_STOCK_THRESHOLD})`,
          });
        }
      });
      setStockAlerts(alerts);

    } catch (error) {
      console.error("Stok uyarıları yüklenirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Stok uyarıları yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Uyarılar</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchStockAlerts}>
            <BellRing className="mr-2 h-4 w-4" /> Uyarıları Yenile
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Düşük Stok Uyarıları</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün Adı</TableHead>
                <TableHead className="text-right">Mevcut Miktar</TableHead>
                <TableHead className="text-right">Eşik</TableHead>
                <TableHead>Mesaj</TableHead>
                <TableHead className="text-center">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mb-2" />
                      <p>Şu anda düşük stok uyarısı bulunmamaktadır.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                stockAlerts.map((alert) => (
                  <TableRow key={alert.id} className="bg-red-50/50 dark:bg-red-900/10">
                    <TableCell className="font-medium text-red-700 dark:text-red-300">{alert.productName}</TableCell>
                    <TableCell className="text-right">{alert.currentQuantity}</TableCell>
                    <TableCell className="text-right">{alert.threshold}</TableCell>
                    <TableCell>{alert.message}</TableCell>
                    <TableCell className="text-center">
                      <Link href={`/products/${alert.id}`}>
                        <Button variant="outline" size="sm">
                          <AlertCircle className="mr-2 h-4 w-4" /> Ürüne Git
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 