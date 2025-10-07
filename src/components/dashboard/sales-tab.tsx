"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, BarChart, PieChart } from "@/components/ui/charts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface SalesTabProps {
  salesData: any[];
  dailySales: any[];
  productSales: any[];
  customerSales: any[];
}

export function SalesTab({ salesData, dailySales, productSales, customerSales }: SalesTabProps) {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  });
  const [viewType, setViewType] = useState("daily");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
        />
        <Select value={viewType} onValueChange={setViewType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Görünüm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Günlük</SelectItem>
            <SelectItem value="weekly">Haftalık</SelectItem>
            <SelectItem value="monthly">Aylık</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Toplam Satış</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {salesData.reduce((sum, sale) => sum + sale.amount, 0).toLocaleString('tr-TR')} ₺
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ortalama Satış</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(salesData.reduce((sum, sale) => sum + sale.amount, 0) / salesData.length).toLocaleString('tr-TR')} ₺
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Satış Adedi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{salesData.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Satış Trendi</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={dailySales} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ürün Bazlı Satışlar</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={productSales} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Müşteri Bazlı Satışlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <PieChart data={customerSales} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Son Satışlar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>Miktar</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesData.slice(0, 10).map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{format(sale.date.toDate(), 'dd MMMM yyyy', { locale: tr })}</TableCell>
                  <TableCell>{sale.customerName}</TableCell>
                  <TableCell>{sale.productName}</TableCell>
                  <TableCell>{sale.quantity}</TableCell>
                  <TableCell className="text-right">{sale.amount.toLocaleString('tr-TR')} ₺</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 