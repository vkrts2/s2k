"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, BarChart, PieChart } from "@/components/ui/charts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle } from "lucide-react";

interface StockTabProps {
  stockData: any[];
  stockMovements: any[];
  lowStockItems: any[];
  categoryDistribution: any[];
}

export function StockTab({ stockData, stockMovements, lowStockItems, categoryDistribution }: StockTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStock = stockData.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input
          placeholder="Ürün veya kategori ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button variant="outline">
          <Search className="w-4 h-4 mr-2" />
          Ara
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Toplam Ürün</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stockData.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Toplam Stok Değeri</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stockData.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString('tr-TR')} ₺
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Düşük Stok Uyarısı</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{lowStockItems.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Stok Hareketleri</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={stockMovements} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kategori Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={categoryDistribution} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Düşük Stok Uyarıları</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Mevcut Stok</TableHead>
                <TableHead>Minimum Stok</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.minimumQuantity}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Kritik Seviye
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stok Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Miktar</TableHead>
                <TableHead>Birim Fiyat</TableHead>
                <TableHead className="text-right">Toplam Değer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStock.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.price.toLocaleString('tr-TR')} ₺</TableCell>
                  <TableCell className="text-right">
                    {(item.price * item.quantity).toLocaleString('tr-TR')} ₺
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 