"use client";

import { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from 'next/navigation';
import { ChevronLeft, Printer, Download } from 'lucide-react';
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  date: any; // Firebase Timestamp
  status: 'Ödendi' | 'Ödenmedi' | 'Kısmi Ödendi';
  invoiceItems: InvoiceItem[];
  description?: string;
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const invoiceRef = doc(db, "invoices", id);
      const invoiceDoc = await getDoc(invoiceRef);

      if (invoiceDoc.exists()) {
        setInvoice({ id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice);
      } else {
        toast({
          title: "Hata",
          description: "Fatura bulunamadı.",
          variant: "destructive",
        });
        router.push('/invoices');
      }
    } catch (error) {
      console.error("Fatura yüklenirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Fatura yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (contentRef.current) {
      const printContent = contentRef.current.innerHTML;
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = printContent;
      window.print();
      document.body.innerHTML = originalContent; // Restore original content after print
      window.location.reload(); // Reload to properly restore event listeners and state
    }
  };

  const handleDownloadPdf = async () => {
    if (contentRef.current) {
      setLoading(true); // Indicate loading for PDF generation
      try {
        const canvas = await html2canvas(contentRef.current, {
          scale: 2, // Improve quality for PDF
          useCORS: true, // Needed if you have images from other origins
        });
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

        pdf.save(`fatura-${invoice?.invoiceNumber || 'detay'}.pdf`);
        toast({
          title: "Başarılı",
          description: "Fatura PDF olarak indirildi.",
        });
      } catch (error) {
        console.error("PDF oluşturulurken hata oluştu: ", error);
        toast({
          title: "Hata",
          description: "PDF oluşturulurken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  if (!invoice) {
    return <div className="flex justify-center items-center h-screen">Fatura bulunamadı veya bir hata oluştu.</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 mb-6 print:hidden">
        <h2 className="text-3xl font-bold tracking-tight">Fatura Detayları</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Geri Dön
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Yazdır
          </Button>
          <Button onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" /> PDF İndir
          </Button>
        </div>
      </div>

      <Card ref={contentRef} className="p-8 print:shadow-none print:border-0">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">Fatura #{invoice.invoiceNumber}</h1>
            <p className="text-sm text-muted-foreground">Tarih: {format(invoice.date.toDate(), 'dd MMMM yyyy', { locale: tr })}</p>
            <p className="text-sm text-muted-foreground">Durum: {invoice.status}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold">Müşteri Bilgileri</h2>
            <p>{invoice.customerName}</p>
            {/* Add more customer details if available in invoice object or by fetching from customers collection */}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Ürün/Hizmet Detayları</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Birim Fiyat</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.invoiceItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.productName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.price.toLocaleString('tr-TR')} ₺</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.total.toLocaleString('tr-TR')} ₺</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <div className="text-right">
            <p className="text-xl font-bold">Genel Toplam: <span className="text-primary">{invoice.totalAmount.toLocaleString('tr-TR')} ₺</span></p>
            {invoice.description && (
              <p className="text-sm text-muted-foreground mt-2">Açıklama: {invoice.description}</p>
            )}
          </div>
        </div>
      </Card>
      <style jsx global>{`
        @media print {
          body > div:not(#__next) {
            display: none;
          }
          #__next {
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\:hidden {
            display: none !important;
          }
          .print\:shadow-none {
            box-shadow: none !important;
          }
          .print\:border-0 {
            border: none !important;
          }
          /* Specific styles for invoice details */
          .invoice-details-card {
            padding: 0 !important;
            margin: 0 !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          /* Adjust font sizes for print */
          h1 {
            font-size: 1.5em !important;
          }
          h2 {
            font-size: 1.2em !important;
          }
          h3 {
            font-size: 1.1em !important;
          }
          p {
            font-size: 0.9em !important;
          }
          .text-sm {
            font-size: 0.8em !important;
          }
          .text-xs {
            font-size: 0.7em !important;
          }
          .text-xl {
            font-size: 1em !important;
          }
          .text-2xl {
            font-size: 1.2em !important;
          }
          .text-3xl {
            font-size: 1.4em !important;
          }
          .font-bold {
            font-weight: bold !important;
          }
          .text-right {
            text-align: right !important;
          }
          .text-primary {
            color: inherit !important; /* Prevent color changes in print */
          }
        }
      `}</style>
    </div>
  );
} 