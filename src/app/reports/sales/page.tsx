"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, FileText, Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from 'react-day-picker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  date: any; // Firebase Timestamp
  status: 'Ödendi' | 'Ödenmedi' | 'Kısmi Ödendi';
}

interface DailySalesData {
  date: string;
  sales: number;
}

export default function SalesReportsPage() {
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dailySalesData, setDailySalesData] = useState<DailySalesData[]>([]);

  useEffect(() => {
    fetchSales();
  }, [dateRange]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, "invoices"), orderBy("date", "desc"));

      if (dateRange?.from && dateRange?.to) {
        q = query(q, where("date", ">=", dateRange.from), where("date", "<=", dateRange.to));
      }

      const salesSnapshot = await getDocs(q);
      const salesList = salesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sale[];
      setSales(salesList);

      // Prepare data for daily sales chart
      const salesByDate: { [key: string]: number } = {};
      salesList.forEach(sale => {
        const saleDate = sale.date.toDate();
        const formattedDate = format(saleDate, 'dd.MM');
        salesByDate[formattedDate] = (salesByDate[formattedDate] || 0) + sale.totalAmount;
      });
      const sortedSalesData = Object.keys(salesByDate).map(date => ({
        date,
        sales: salesByDate[date],
      })).sort((a, b) => {
        const [dayA, monthA] = a.date.split('.');
        const [dayB, monthB] = b.date.split('.');
        const dateA = `2000-${monthA}-${dayA}`; 
        const dateB = `2000-${monthB}-${dayB}`;
        return parseISO(dateA).getTime() - parseISO(dateB).getTime();
      });
      setDailySalesData(sortedSalesData);

    } catch (error) {
      console.error("Satış raporları yüklenirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Satış raporları yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale =>
    sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadPDF = () => {
    const input = document.getElementById('sales-report-content');
    if (input) {
      html2canvas(input, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; 
        const pageHeight = 297; 
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save('satis_raporu.pdf');
        toast({
          title: "Başarılı",
          description: "Satış raporu PDF olarak indirildi.",
        });
      }).catch(error => {
        console.error("PDF oluşturulurken hata oluştu:", error);
        toast({
          title: "Hata",
          description: "PDF raporu oluşturulurken bir hata oluştu.",
          variant: "destructive",
        });
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Satış Raporları</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" /> PDF İndir
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtreler ve Araçlar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Input
            placeholder="Fatura No veya Müşteri Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <Button onClick={() => {
            setSearchTerm("");
            setDateRange(undefined);
          }}>Filtreleri Temizle</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Günlük Satış Trendi</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          {dailySalesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={dailySalesData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-md text-muted-foreground">
              Grafik için yeterli satış verisi bulunmamaktadır.
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="sales-report-content">
        <CardHeader>
          <CardTitle>Satış Detayları</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fatura No</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Gösterilecek satış bulunamadı.</TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{sale.invoiceNumber}</TableCell>
                    <TableCell>{sale.customerName}</TableCell>
                    <TableCell>{format(sale.date.toDate(), 'dd MMMM yyyy', { locale: tr })}</TableCell>
                    <TableCell className="text-right">{sale.totalAmount.toLocaleString('tr-TR')} ₺</TableCell>
                    <TableCell>{sale.status}</TableCell>
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