"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Receipt, Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PaymentMovement {
  id: string;
  partyId: string;
  partyName: string;
  partyType: 'Müşteri' | 'Tedarikçi';
  type: 'Gelen' | 'Giden'; // Gelen for customer payments, Giden for supplier payments
  amount: number;
  paymentMethod: string;
  date: any; // Firebase Timestamp
  description?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  date: any; // Firebase Timestamp
  status: 'Ödendi' | 'Ödenmedi' | 'Kısmi Ödendi';
}

interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  date: any; // Firebase Timestamp
  status: 'Ödendi' | 'Ödenmedi' | 'Kısmi Ödendi';
}

interface PaymentStatusSummary {
  status: string;
  amount: number;
}

interface ReportEntry {
  id: string;
  date: Date;
  documentNumber: string;
  partyName: string;
  partyType: 'Müşteri' | 'Tedarikçi';
  amount: number;
  status: 'Ödendi' | 'Ödenmedi' | 'Kısmi Ödendi';
  transactionType: 'Fatura' | 'Alış Faturası';
}

export default function PaymentStatusReportsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentMovement[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedPartyType, setSelectedPartyType] = useState<string>("all");
  const [paymentStatusSummary, setPaymentStatusSummary] = useState<PaymentStatusSummary[]>([]);
  const [reportTransactions, setReportTransactions] = useState<ReportEntry[]>([]);

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedPartyType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let invoicesQuery = query(collection(db, "invoices"), orderBy("date", "desc"));
      let purchasesQuery = query(collection(db, "purchases"), orderBy("date", "desc"));

      if (dateRange?.from && dateRange?.to) {
        invoicesQuery = query(invoicesQuery, where("date", ">=", dateRange.from), where("date", "<=", dateRange.to));
        purchasesQuery = query(purchasesQuery, where("date", ">=", dateRange.from), where("date", "<=", dateRange.to));
      }

      if (selectedPartyType !== "all") {
        if (selectedPartyType === "Müşteri") {
          purchasesQuery = query(purchasesQuery, where("nonExistentField", "==", true)); // Return no results for purchases if customer selected
        } else { // Tedarikçi
          invoicesQuery = query(invoicesQuery, where("nonExistentField", "==", true)); // Return no results for invoices if supplier selected
        }
      }

      const invoicesSnapshot = await getDocs(invoicesQuery);
      const invoicesList = invoicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
      setInvoices(invoicesList);

      const purchasesSnapshot = await getDocs(purchasesQuery);
      const purchasesList = purchasesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Purchase[];
      setPurchases(purchasesList);

      // Map to common ReportEntry interface
      const mappedInvoices: ReportEntry[] = invoicesList.map(inv => ({
        id: inv.id,
        date: inv.date.toDate(),
        documentNumber: inv.invoiceNumber,
        partyName: inv.customerName,
        partyType: 'Müşteri',
        amount: inv.totalAmount,
        status: inv.status,
        transactionType: 'Fatura',
      }));

      const mappedPurchases: ReportEntry[] = purchasesList.map(pur => ({
        id: pur.id,
        date: pur.date.toDate(),
        documentNumber: pur.purchaseNumber,
        partyName: pur.supplierName,
        partyType: 'Tedarikçi',
        amount: pur.totalAmount,
        status: pur.status,
        transactionType: 'Alış Faturası',
      }));

      const combinedTransactions = [...mappedInvoices, ...mappedPurchases];
      combinedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
      setReportTransactions(combinedTransactions);

      // Calculate payment status summary
      const summary: { [key: string]: number } = {};

      invoicesList.forEach(invoice => {
        summary[invoice.status] = (summary[invoice.status] || 0) + invoice.totalAmount;
      });

      purchasesList.forEach(purchase => {
        summary[purchase.status] = (summary[purchase.status] || 0) + purchase.totalAmount;
      });

      const summaryArray = Object.keys(summary).map(status => ({
        status,
        amount: summary[status],
      }));
      setPaymentStatusSummary(summaryArray);

    } catch (error) {
      console.error("Ödeme durumu raporları yüklenirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Ödeme durumu raporları yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredReportTransactions = reportTransactions.filter(transaction =>
    transaction.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadPDF = () => {
    const input = document.getElementById('payment-status-report-content');
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

        pdf.save('odeme_durumu_raporu.pdf');
        toast({
          title: "Başarılı",
          description: "Ödeme durumu raporu PDF olarak indirildi.",
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
        <h2 className="text-3xl font-bold tracking-tight">Ödeme Durumu Raporları</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" /> PDF İndir
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtreler ve Özet</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Input
            placeholder="Taraf Adı veya Belge No Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <Select value={selectedPartyType} onValueChange={(value) => setSelectedPartyType(value as "all" | "Müşteri" | "Tedarikçi")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Taraf Tipi Seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Tipler</SelectItem>
              <SelectItem value="Müşteri">Müşteri</SelectItem>
              <SelectItem value="Tedarikçi">Tedarikçi</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => {
            setSearchTerm("");
            setDateRange(undefined);
            setSelectedPartyType("all");
          }}>Filtreleri Temizle</Button>

          <div className="ml-auto flex items-center space-x-4">
            {paymentStatusSummary.map((summary, index) => (
              <div key={index} className="flex flex-col items-center">
                <span className="text-sm font-medium">{summary.status}</span>
                <span className="text-lg font-bold">
                  {summary.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card id="payment-status-report-content">
        <CardHeader>
          <CardTitle>Ödeme Detayları</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Belge No</TableHead>
                <TableHead>Taraf</TableHead>
                <TableHead>Taraf Tipi</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>İşlem Tipi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReportTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Gösterilecek ödeme durumu bulunamadı.</TableCell>
                </TableRow>
              ) : (
                filteredReportTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{format(transaction.date, 'dd MMMM yyyy', { locale: tr })}</TableCell>
                    <TableCell>{transaction.documentNumber}</TableCell>
                    <TableCell>{transaction.partyName}</TableCell>
                    <TableCell>{transaction.partyType}</TableCell>
                    <TableCell className="text-right">{transaction.amount.toLocaleString('tr-TR')} ₺</TableCell>
                    <TableCell>{transaction.status}</TableCell>
                    <TableCell>{transaction.transactionType}</TableCell>
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