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
import Link from "next/link";
import BackToHomeButton from '@/components/common/back-to-home-button';
import { getCustomers } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
  subTotal?: number;
  grandTotal?: number;
  createdAt?: string;
  updatedAt?: string;
  taxRate?: number;
  taxAmount?: number;
}

interface QuotationItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: string;
  taxRate?: number;
}

export default function QuotationsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [portfolioCustomers, setPortfolioCustomers] = useState<any[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    // Load quotations from localStorage
    const savedQuotations = localStorage.getItem('ermay_quotations');
    if (savedQuotations) {
      setQuotations(JSON.parse(savedQuotations));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    getCustomers(user.uid).then((customers) => {
      console.log("Fiyat teklifi sayfasında yüklenen müşteriler:", customers);
      setPortfolioCustomers(customers);
    });
  }, [user]);

  const saveQuotations = (newQuotations: Quotation[]) => {
    localStorage.setItem('ermay_quotations', JSON.stringify(newQuotations));
    setQuotations(newQuotations);
  };

  const handleAddQuotation = (formData: any) => {
    const now = new Date().toISOString();
    // Müşteri objesini bul
    const selectedCustomer = portfolioCustomers.find((c: any) => c.name === formData.customerName || c.companyName === formData.customerName);
    const newQuotation: any = {
      id: crypto.randomUUID(),
      quotationNumber: `TQ-${Date.now()}`,
      customerName: formData.customerName,
      customerId: '',
      customer: selectedCustomer || null,
      date: typeof formData.date === 'string' ? formData.date : formData.date.toISOString(),
      validUntil: formData.validUntilDate ? (typeof formData.validUntilDate === 'string' ? formData.validUntilDate : formData.validUntilDate.toISOString()) : (typeof formData.date === 'string' ? formData.date : formData.date.toISOString()),
      status: 'draft',
      totalAmount: Number(formData.grandTotal) ?? 0,
      currency: formData.currency,
      items: formData.items.map((item: any, idx: number) => ({
        id: item.id || `${Date.now()}-${idx}`,
        productName: item.productName,
        quantity: Number(item.quantity) ?? 0,
        unitPrice: Number(item.unitPrice) ?? 0,
        total: item.total !== undefined ? Number(item.total) : (Number(item.quantity) * Number(item.unitPrice)),
        taxRate: Number(item.taxRate) ?? 0,
        unit: typeof item.unit === 'string' && item.unit.length > 0 ? item.unit : 'adet',
      })),
      notes: formData.notes || '',
      subTotal: Number(formData.subTotal) ?? 0,
      taxRate: Number(formData.taxRate) ?? 0,
      taxAmount: Number(formData.taxAmount) ?? 0,
      grandTotal: Number(formData.grandTotal) ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    saveQuotations([...quotations, newQuotation]);
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

  const handleUpdateQuotation = (formData: any) => {
    const now = new Date().toISOString();
    // Müşteri objesini bul
    const selectedCustomer = portfolioCustomers.find((c: any) => c.name === formData.customerName || c.companyName === formData.customerName);
    const updatedQuotation: any = {
      id: editingQuotation?.id || crypto.randomUUID(),
      quotationNumber: editingQuotation?.quotationNumber || `TQ-${Date.now()}`,
      customerName: formData.customerName,
      customerId: '',
      customer: selectedCustomer || null,
      date: typeof formData.date === 'string' ? formData.date : formData.date.toISOString(),
      validUntil: formData.validUntilDate ? (typeof formData.validUntilDate === 'string' ? formData.validUntilDate : formData.validUntilDate.toISOString()) : (typeof formData.date === 'string' ? formData.date : formData.date.toISOString()),
      status: 'draft',
      totalAmount: Number(formData.grandTotal) ?? 0,
      currency: formData.currency,
      items: formData.items.map((item: any, idx: number) => ({
        id: item.id || `${Date.now()}-${idx}`,
        productName: item.productName,
        quantity: Number(item.quantity) ?? 0,
        unitPrice: Number(item.unitPrice) ?? 0,
        total: item.total !== undefined ? Number(item.total) : (Number(item.quantity) * Number(item.unitPrice)),
        taxRate: Number(item.taxRate) ?? 0,
        unit: typeof item.unit === 'string' && item.unit.length > 0 ? item.unit : 'adet',
      })),
      notes: formData.notes || '',
      subTotal: Number(formData.subTotal) ?? 0,
      taxRate: Number(formData.taxRate) ?? 0,
      taxAmount: Number(formData.taxAmount) ?? 0,
      grandTotal: Number(formData.grandTotal) ?? 0,
      createdAt: editingQuotation?.createdAt || now,
      updatedAt: now,
    };
    const newQuotations = quotations.map(quotation =>
      quotation.id === updatedQuotation.id ? updatedQuotation : quotation
    );
    if (!editingQuotation) {
      saveQuotations([...quotations, updatedQuotation]);
    } else {
      saveQuotations(newQuotations);
    }
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

  const handleDelete = () => {
    if (deleteConfirmId) {
      handleDeleteQuotation(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handlePrintQuotation = (quotation: Quotation) => {
    const data = encodeURIComponent(JSON.stringify(quotation));
    window.open(`/quotations/${quotation.id}/print?data=${data}`, '_blank');
  };

  const filteredQuotations = quotations.filter(quotation =>
    quotation.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quotation.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Fiyat Teklifleri</h2>
        <Dialog open={showQuotationModal} onOpenChange={setShowQuotationModal}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingQuotation(null); setShowQuotationModal(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Teklif
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-screen-md w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background z-50 pb-4 border-b">
              <DialogTitle>{editingQuotation ? "Teklif Düzenle" : "Yeni Teklif"}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <QuotationForm
                onSubmit={editingQuotation ? handleUpdateQuotation : handleAddQuotation}
                initialData={editingQuotation ? {
                  ...editingQuotation,
                  date: typeof editingQuotation.date === 'string' ? editingQuotation.date : editingQuotation.date.toISOString(),
                  validUntil: editingQuotation.validUntil ? (typeof editingQuotation.validUntil === 'string' ? editingQuotation.validUntil : editingQuotation.validUntil.toISOString()) : undefined,
                  subTotal: editingQuotation.subTotal ?? 0,
                  grandTotal: editingQuotation.grandTotal ?? 0,
                  taxRate: editingQuotation.taxRate ?? 0,
                  taxAmount: editingQuotation.taxAmount ?? 0,
                  createdAt: editingQuotation.createdAt ?? new Date().toISOString(),
                  updatedAt: editingQuotation.updatedAt ?? new Date().toISOString(),
                  currency: ['TRY', 'USD', 'EUR'].includes(editingQuotation.currency) ? editingQuotation.currency as 'TRY' | 'USD' | 'EUR' : 'TRY',
                  status: ['Taslak', 'Gönderildi', 'Kabul Edildi', 'Reddedildi', 'Süresi Doldu'].includes(editingQuotation.status) ? editingQuotation.status as 'Taslak' | 'Gönderildi' | 'Kabul Edildi' | 'Reddedildi' | 'Süresi Doldu' : 'Taslak',
                  items: (editingQuotation.items as any[]).map(item => ({
                    ...item,
                    description: item.description || item.productName,
                    taxRate: item.taxRate ?? 0,
                  })),
                } : undefined}
                customers={portfolioCustomers}
                className="w-full"
              />
            </div>
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
                    <TableCell>{format(new Date(quotation.date), "dd.MM.yyyy", { locale: tr })}</TableCell>
                    <TableCell>{format(new Date(quotation.validUntil), "dd.MM.yyyy", { locale: tr })}</TableCell>
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
                        <Button variant="outline" size="icon" className="h-8 w-8" title="Teklifi Yazdır/Görüntüle" onClick={() => handlePrintQuotation(quotation)}>
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
                          onClick={() => setDeleteConfirmId(quotation.id)}
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

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Silme Onayı</AlertDialogTitle>
            <AlertDialogDescription>
              Bu fiyat teklifini silmek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hayır</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Evet</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    