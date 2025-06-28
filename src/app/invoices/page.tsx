"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Eye, Edit, Trash2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import Link from 'next/link';
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  date: any; // Firebase Timestamp
  status: 'Ödendi' | 'Ödenmedi' | 'Kısmi Ödendi';
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const invoicesCollection = collection(db, "invoices");
      const invoiceSnapshot = await getDocs(invoicesCollection);
      const invoicesList = invoiceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
      setInvoices(invoicesList.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()));
    } catch (error) {
      console.error("Faturalar yüklenirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Faturalar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (confirm("Bu faturayı silmek istediğinizden emin misiniz?")) {
      try {
        await deleteDoc(doc(db, "invoices", id));
        toast({
          title: "Başarılı",
          description: "Fatura başarıyla silindi.",
        });
        fetchInvoices();
      } catch (error) {
        console.error("Fatura silinirken hata oluştu: ", error);
        toast({
          title: "Hata",
          description: "Fatura silinirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Faturalar</h2>
        <Link href="/invoices/create">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Yeni Fatura Oluştur
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fatura Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fatura No</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">Toplam Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Fatura bulunamadı.</TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.customerName}</TableCell>
                    <TableCell>{format(invoice.date.toDate(), 'dd MMMM yyyy', { locale: tr })}</TableCell>
                    <TableCell className="text-right">{invoice.totalAmount.toLocaleString('tr-TR')} ₺</TableCell>
                    <TableCell>{invoice.status}</TableCell>
                    <TableCell className="text-right flex justify-end items-center space-x-2">
                      <Link href={`/invoices/${invoice.id}`} passHref>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/invoices/edit/${invoice.id}`} passHref>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="destructive" size="sm"
                        onClick={() => handleDeleteInvoice(invoice.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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