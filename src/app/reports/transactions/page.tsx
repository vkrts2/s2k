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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Transaction {
  id: string;
  type: 'Fatura' | 'Ödeme (Gelen)' | 'Ödeme (Giden)' | 'Stok Girişi' | 'Stok Çıkışı';
  partyName: string;
  amount: number; // For monetary transactions
  quantity?: number; // For stock movements
  date: any; // Firebase Timestamp
  description?: string;
}

interface Party {
  id: string;
  name: string;
  type: 'Müşteri' | 'Tedarikçi';
}

export default function PartyTransactionReportsPage() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedPartyId, setSelectedPartyId] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedPartyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const fetchedTransactions: Transaction[] = [];

      // Fetch Customers and Suppliers
      const customersSnapshot = await getDocs(collection(db, "customers"));
      const customersList = customersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, type: 'Müşteri' })) as Party[];

      const suppliersSnapshot = await getDocs(collection(db, "suppliers"));
      const suppliersList = suppliersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, type: 'Tedarikçi' })) as Party[];

      setParties([{ id: "all", name: "Tüm Taraflar", type: 'Müşteri' }, ...customersList, ...suppliersList]); // Add 'all' option

      // Fetch Invoices
      let invoicesQuery = query(collection(db, "invoices"), orderBy("date", "desc"));
      if (dateRange?.from && dateRange?.to) {
        invoicesQuery = query(invoicesQuery, where("date", ">=", dateRange.from), where("date", "<=", dateRange.to));
      }
      if (selectedPartyId !== "all") {
        const selectedParty = [...customersList, ...suppliersList].find(p => p.id === selectedPartyId);
        if (selectedParty && selectedParty.type === 'Müşteri') {
          invoicesQuery = query(invoicesQuery, where("customerId", "==", selectedPartyId));
        } else { // If a supplier is selected, invoices won't apply directly
          invoicesQuery = query(invoicesQuery, where("nonExistentField", "==", true)); // Return no results for suppliers
        }
      }
      const invoicesSnapshot = await getDocs(invoicesQuery);
      invoicesSnapshot.forEach(doc => {
        const data = doc.data();
        fetchedTransactions.push({
          id: doc.id,
          type: 'Fatura',
          partyName: data.customerName,
          amount: data.totalAmount,
          date: data.date.toDate(),
          description: `Fatura No: ${data.invoiceNumber}, Durum: ${data.status}`,
        });
      });

      // Fetch Payment Movements
      let paymentsQuery = query(collection(db, "paymentMovements"), orderBy("date", "desc"));
      if (dateRange?.from && dateRange?.to) {
        paymentsQuery = query(paymentsQuery, where("date", ">=", dateRange.from), where("date", "<=", dateRange.to));
      }
      if (selectedPartyId !== "all") {
        paymentsQuery = query(paymentsQuery, where("partyId", "==", selectedPartyId));
      }
      const paymentsSnapshot = await getDocs(paymentsQuery);
      paymentsSnapshot.forEach(doc => {
        const data = doc.data();
        fetchedTransactions.push({
          id: doc.id,
          type: data.type === 'Gelen' ? 'Ödeme (Gelen)' : 'Ödeme (Giden)',
          partyName: data.partyName,
          amount: data.amount,
          date: data.date.toDate(),
          description: data.description || '-',
        });
      });

      // Fetch Stock Movements (only if they are associated with a party, otherwise they are general)
      // Assuming stock movements don't have a direct party association for now. If they did, similar filtering logic would apply.

      fetchedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
      setTransactions(fetchedTransactions);

    } catch (error) {
      console.error("İşlem raporları yüklenirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "İşlem raporları yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadPDF = () => {
    const input = document.getElementById('transactions-report-content');
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

        pdf.save('islem_raporu.pdf');
        toast({
          title: "Başarılı",
          description: "İşlem raporu PDF olarak indirildi.",
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
        <h2 className="text-3xl font-bold tracking-tight">Müşteri/Tedarikçi İşlem Raporları</h2>
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
            placeholder="Taraf Adı veya Açıklama Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <Select value={selectedPartyId} onValueChange={setSelectedPartyId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Taraf Seçin" />
            </SelectTrigger>
            <SelectContent>
              {parties.map(party => (
                <SelectItem key={party.id} value={party.id}>
                  {party.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => {
            setSearchTerm("");
            setDateRange(undefined);
            setSelectedPartyId("all");
          }}>Filtreleri Temizle</Button>
        </CardContent>
      </Card>

      <Card id="transactions-report-content">
        <CardHeader>
          <CardTitle>İşlem Detayları</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Taraf</TableHead>
                <TableHead>İşlem Tipi</TableHead>
                <TableHead className="text-right">Tutar/Miktar</TableHead>
                <TableHead>Açıklama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Gösterilecek işlem bulunamadı.</TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{format(transaction.date, 'dd MMMM yyyy', { locale: tr })}</TableCell>
                    <TableCell>{transaction.partyName}</TableCell>
                    <TableCell>{transaction.type}</TableCell>
                    <TableCell className="text-right">
                      {transaction.amount !== undefined && transaction.amount !== 0 ? 
                        transaction.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : 
                        transaction.quantity !== undefined ? `${transaction.quantity} adet` : '-'}
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
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