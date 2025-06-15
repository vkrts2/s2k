"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, BarChart, PieChart } from "@/components/ui/charts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface PaymentsTabProps {
  paymentsData: any[];
  dailyPayments: any[];
  customerPayments: any[];
  paymentStatus: any[];
}

export function PaymentsTab({ paymentsData, dailyPayments, customerPayments, paymentStatus }: PaymentsTabProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  });
  const [viewType, setViewType] = useState("daily");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Ödendi":
        return <Badge className="bg-green-500">Ödendi</Badge>;
      case "Beklemede":
        return <Badge className="bg-yellow-500">Beklemede</Badge>;
      case "Gecikmiş":
        return <Badge className="bg-red-500">Gecikmiş</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <DateRangePicker
          value={dateRange}
          onChange={(value) => setDateRange(value || { from: new Date(), to: new Date() })}
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
            <CardTitle>Toplam Ödeme</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {paymentsData.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString('tr-TR')} ₺
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bekleyen Ödeme</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">
              {paymentsData
                .filter(payment => payment.status === "Beklemede")
                .reduce((sum, payment) => sum + payment.amount, 0)
                .toLocaleString('tr-TR')} ₺
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gecikmiş Ödeme</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">
              {paymentsData
                .filter(payment => payment.status === "Gecikmiş")
                .reduce((sum, payment) => sum + payment.amount, 0)
                .toLocaleString('tr-TR')} ₺
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Ödeme Trendi</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={dailyPayments} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ödeme Durumu</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={paymentStatus} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Müşteri Bazlı Ödemeler</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={customerPayments} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Son Ödemeler</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Ödeme Yöntemi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsData.slice(0, 10).map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{format(payment.date.toDate(), 'dd MMMM yyyy', { locale: tr })}</TableCell>
                  <TableCell>{payment.customerName}</TableCell>
                  <TableCell>{payment.paymentMethod}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell className="text-right">{payment.amount.toLocaleString('tr-TR')} ₺</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 