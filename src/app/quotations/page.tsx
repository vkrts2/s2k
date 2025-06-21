// src/app/quotations/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, CalendarIcon, FileText, Printer } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { QuotationForm } from "@/components/quotations/quotation-form";

interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  customerId: string;
  date: Date;
  validUntil: Date;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  totalAmount: number;
  currency: string;
  items: QuotationItem[];
  notes?: string;
}

interface QuotationItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function QuotationsPage() {
  const { toast } = useToast();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Load quotations from localStorage
    const savedQuotations = localStorage.getItem('ermay_quotations');
    if (savedQuotations) {
      setQuotations(JSON.parse(savedQuotations));
    }
  }, []);

  const saveQuotations = (newQuotations: Quotation[]) => {
    localStorage.setItem('ermay_quotations', JSON.stringify(newQuotations));
    setQuotations(newQuotations);
  };

  const handleAddQuotation = (quotation: Quotation) => {
    saveQuotations([...quotations, quotation]);
    setShowQuotationModal(false);
      toast({
      title: "Başarılı",
      description: "Fiyat teklifi başarıyla eklendi.",
      });
  };

  const handleEditQuotation = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setShowQuotationModal(true);
  };

  const handleUpdateQuotation = (updatedQuotation: Quotation) => {
    const newQuotations = quotations.map(quotation =>
      quotation.id === updatedQuotation.id ? updatedQuotation : quotation
    );
    saveQuotations(newQuotations);
    setShowQuotationModal(false);
    toast({
      title: "Başarılı",
      description: "Fiyat teklifi başarıyla güncellendi.",
    });
  };

  const handleDeleteQuotation = (quotationId: string) => {
    const updatedQuotations = quotations.filter(quotation => quotation.id !== quotationId);
    saveQuotations(updatedQuotations);
      toast({
      title: "Başarılı",
      description: "Fiyat teklifi başarıyla silindi.",
    });
  };

  const handlePrintQuotation = (quotation: Quotation) => {
    // TODO: Implement print functionality
    toast({
      title: "Bilgi",
      description: "Yazdırma özelliği yakında eklenecek.",
    });
  };

  const filteredQuotations = quotations.filter(quotation =>
    quotation.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quotation.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Fiyat Teklifleri</h2>
        <Dialog open={showQuotationModal} onOpenChange={setShowQuotationModal}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingQuotation(null); setShowQuotationModal(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Teklif
        </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
              <DialogTitle>{editingQuotation ? "Teklif Düzenle" : "Yeni Teklif"}</DialogTitle>
          </DialogHeader>
          <QuotationForm
              onSubmit={editingQuotation ? handleUpdateQuotation : handleAddQuotation}
            initialData={editingQuotation}
              onCancel={() => setShowQuotationModal(false)}
          />
        </DialogContent>
      </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teklifler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Teklif ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teklif No</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Geçerlilik</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell>{quotation.quotationNumber}</TableCell>
                    <TableCell>{quotation.customerName}</TableCell>
                    <TableCell>{format(new Date(quotation.date), "dd MMMM yyyy", { locale: tr })}</TableCell>
                    <TableCell>{format(new Date(quotation.validUntil), "dd MMMM yyyy", { locale: tr })}</TableCell>
                    <TableCell>
                      {quotation.totalAmount.toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: quotation.currency
                      })}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        quotation.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        quotation.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        quotation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        quotation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {quotation.status === 'draft' ? 'Taslak' :
                         quotation.status === 'sent' ? 'Gönderildi' :
                         quotation.status === 'accepted' ? 'Kabul Edildi' :
                         quotation.status === 'rejected' ? 'Reddedildi' :
                         'Süresi Doldu'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrintQuotation(quotation)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditQuotation(quotation)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteQuotation(quotation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    