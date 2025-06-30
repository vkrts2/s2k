"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportsTabProps {
  salesReports: any[];
  paymentReports: any[];
  stockReports: any[];
  profitLossReport: any;
}

export function ReportsTab({ salesReports, paymentReports, stockReports, profitLossReport }: ReportsTabProps) {
  const [reportType, setReportType] = useState("sales");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  });
  const reportRef = useRef<HTMLDivElement>(null);

  const generateReport = () => {
    // Implement report generation logic here (e.g., fetching data based on reportType and dateRange)
    console.log(`Generating ${reportType} report for ${format(dateRange.from || new Date(), 'PPP', { locale: tr })} - ${format(dateRange.to || new Date(), 'PPP', { locale: tr })}`);
  };

  const handleExportPdf = async () => {
    if (reportRef.current) {
      const input = reportRef.current;
      html2canvas(input, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
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
        pdf.save(`${reportType}-raporu-${format(new Date(), 'yyyyMMdd')}.pdf`);
      });
    }
  };

  const handleExportCsv = () => {
    let data: any[] = [];
    let filename = '';
    let headers: string[] = [];

    switch (reportType) {
      case "sales":
        data = salesReports;
        filename = `satis-raporu-${format(new Date(), 'yyyyMMdd')}.csv`;
        headers = ["Tarih", "Müşteri", "Ürün", "Miktar", "Tutar"];
        break;
      case "payments":
        data = paymentReports;
        filename = `odeme-raporu-${format(new Date(), 'yyyyMMdd')}.csv`;
        headers = ["Tarih", "Müşteri", "Ödeme Yöntemi", "Durum", "Tutar"];
        break;
      case "stock":
        data = stockReports;
        filename = `stok-raporu-${format(new Date(), 'yyyyMMdd')}.csv`;
        headers = ["Ürün Adı", "Kategori", "Miktar", "Birim Fiyat", "Toplam Değer"];
        break;
      case "profit_loss":
        data = [profitLossReport]; // Profit/Loss is a single object
        filename = `kar-zarar-raporu-${format(new Date(), 'yyyyMMdd')}.csv`;
        headers = ["Toplam Gelir", "Toplam Gider", "Net Kar/Zarar"];
        break;
      default:
        return;
    }

    if (data.length === 0) {
      console.warn("Dışa aktarılacak veri bulunamadı.");
      return;
    }

    const csvContent = [
      headers.join(';'), // CSV headers
      ...data.map(row => {
        if (reportType === "sales") {
          return `${format(row.date.toDate(), 'dd.MM.yyyy')};${row.customerName};${row.productName};${row.quantity};${row.amount}`;
        } else if (reportType === "payments") {
          return `${format(row.date.toDate(), 'dd.MM.yyyy')};${row.customerName};${row.paymentMethod};${row.status};${row.amount}`;
        } else if (reportType === "stock") {
          return `${row.productName};${row.category};${row.quantity};${row.unitPrice};${row.totalValue}`;
        } else if (reportType === "profit_loss") {
          return `${row.totalRevenue};${row.totalExpenses};${row.netProfitLoss}`;
        }
        return '';
      }).filter(Boolean)
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Rapor Tipi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sales">Satış Raporu</SelectItem>
            <SelectItem value="payments">Ödeme Raporu</SelectItem>
            <SelectItem value="stock">Stok Raporu</SelectItem>
            <SelectItem value="profit_loss">Kar/Zarar Raporu</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePicker
          value={dateRange}
          onChange={(value) => setDateRange(value || { from: new Date(), to: new Date() })}
        />
        <Button onClick={generateReport}>
          <FileText className="mr-2 h-4 w-4" /> Rapor Oluştur
        </Button>
        <Button onClick={handleExportPdf}>
          <Download className="mr-2 h-4 w-4" /> PDF İndir
        </Button>
        <Button onClick={handleExportCsv}>
          <Download className="mr-2 h-4 w-4" /> CSV İndir
        </Button>
      </div>

      <div ref={reportRef} className="report-content-to-pdf">
        <Card>
          <CardHeader>
            <CardTitle>Genel Kar/Zarar Durumu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col items-center justify-center p-4 border rounded-md">
                <span className="text-lg font-semibold">Toplam Gelir</span>
                <span className="text-2xl font-bold text-green-600">{profitLossReport?.totalRevenue?.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 border rounded-md">
                <span className="text-lg font-semibold">Toplam Gider</span>
                <span className="text-2xl font-bold text-red-600">{profitLossReport?.totalExpenses?.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 border rounded-md">
                <span className="text-lg font-semibold">Net Kar/Zarar</span>
                <span className={`text-2xl font-bold ${profitLossReport?.netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{profitLossReport?.netProfitLoss?.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {reportType === "sales" && (
          <Card>
            <CardHeader>
              <CardTitle>Satış Raporu Detayları</CardTitle>
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
                  {salesReports.slice(0, 10).map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{format(report.date.toDate(), 'dd MMMM yyyy', { locale: tr })}</TableCell>
                      <TableCell>{report.customerName}</TableCell>
                      <TableCell>{report.productName}</TableCell>
                      <TableCell>{report.quantity}</TableCell>
                      <TableCell className="text-right">{report.amount.toLocaleString('tr-TR')} ₺</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {reportType === "payments" && (
          <Card>
            <CardHeader>
              <CardTitle>Ödeme Raporu Detayları</CardTitle>
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
                  {paymentReports.slice(0, 10).map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{format(report.date.toDate(), 'dd MMMM yyyy', { locale: tr })}</TableCell>
                      <TableCell>{report.customerName}</TableCell>
                      <TableCell>{report.paymentMethod}</TableCell>
                      <TableCell>{report.status}</TableCell>
                      <TableCell className="text-right">{report.amount.toLocaleString('tr-TR')} ₺</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {reportType === "stock" && (
          <Card>
            <CardHeader>
              <CardTitle>Stok Raporu Detayları</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün Adı</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead className="text-right">Birim Fiyat</TableHead>
                    <TableHead className="text-right">Toplam Değer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockReports.slice(0, 10).map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{report.productName}</TableCell>
                      <TableCell>{report.category}</TableCell>
                      <TableCell>{report.quantity}</TableCell>
                      <TableCell className="text-right">{report.unitPrice.toLocaleString('tr-TR')} ₺</TableCell>
                      <TableCell className="text-right">{report.totalValue.toLocaleString('tr-TR')} ₺</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 