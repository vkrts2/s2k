// src/app/quotations/page.tsx
// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { PlusCircle, Edit, Trash2, Printer } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { QuotationForm } from "@/components/quotations/quotation-form";
import BackToHomeButton from '@/components/common/back-to-home-button';
import { getCustomers, getQuotations, addQuotation as addQuotationToDb, updateQuotation as updateQuotationInDb, deleteQuotation as deleteQuotationFromDb, addOrder, getCustomerByName } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import type { Quotation } from '@/lib/types';

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
    if (!user) return;
    getQuotations(user.uid).then(setQuotations);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getCustomers(user.uid).then((customers) => {
      setPortfolioCustomers(customers);
    });
  }, [user]);

  const refresh = async () => {
    if (!user) return;
    const list = await getQuotations(user.uid);
    setQuotations(list);
  };

  const handleAddQuotation = (formData: any) => {
    if (!user) return;
    const now = new Date().toISOString();
    const computedValidUntil = formData.validUntil
      ? (formData.validUntil instanceof Date
          ? formData.validUntil.toISOString()
          : formData.validUntil)
      : undefined;

    const payload: any = {
      date: formData.date instanceof Date ? formData.date.toISOString() : new Date().toISOString(),
      customerName: formData.customerName,
      items: formData.items.map((item: any, idx: number) => ({
        id: item.id || `${Date.now()}-${idx}`,
        productName: item.productName,
        description: item.productName,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: item.total !== undefined ? Number(item.total) : (Number(item.quantity) * Number(item.unitPrice)),
        taxRate: Number(item.taxRate) || 0,
        unit: typeof item.unit === 'string' && item.unit.length > 0 ? item.unit : 'adet',
      })),
      notes: formData.notes || '',
      subTotal: Number(formData.subTotal) || 0,
      taxRate: Number(formData.taxRate) || 0,
      taxAmount: Number(formData.taxAmount) || 0,
      grandTotal: Number(formData.grandTotal) || 0,
      currency: formData.currency,
      status: formData.status,
      ...(computedValidUntil ? { validUntil: computedValidUntil } : {}),
    };
    addQuotationToDb(user.uid, payload).then(async () => {
      await refresh();
      setShowQuotationModal(false);
      toast({ title: "Başarılı", description: "Fiyat teklifi başarıyla eklendi." });
    });
  };

  const handleUpdateQuotation = (formData: any) => {
    if (!user || !editingQuotation) return;
    const now = new Date().toISOString();
    const computedValidUntil = formData.validUntil
      ? (formData.validUntil instanceof Date
          ? formData.validUntil.toISOString()
          : formData.validUntil)
      : undefined;

    const updated: Quotation = {
      id: editingQuotation.id,
      quotationNumber: editingQuotation.quotationNumber,
      date: formData.date instanceof Date ? formData.date.toISOString() : editingQuotation.date,
      customerName: formData.customerName,
      items: formData.items.map((item: any, idx: number) => ({
        id: item.id || `${Date.now()}-${idx}`,
        productName: item.productName,
        description: item.productName,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: item.total !== undefined ? Number(item.total) : (Number(item.quantity) * Number(item.unitPrice)),
        taxRate: Number(item.taxRate) || 0,
        unit: typeof item.unit === 'string' && item.unit.length > 0 ? item.unit : 'adet',
      })),
      notes: formData.notes || '',
      subTotal: Number(formData.subTotal) || 0,
      taxRate: Number(formData.taxRate) || 0,
      taxAmount: Number(formData.taxAmount) || 0,
      grandTotal: Number(formData.grandTotal) || 0,
      currency: formData.currency,
      status: formData.status,
      ...(computedValidUntil ? { validUntil: computedValidUntil } : {}),
      createdAt: typeof editingQuotation.createdAt === 'string' ? editingQuotation.createdAt : new Date().toISOString(),
      updatedAt: now,
    };
    updateQuotationInDb(user.uid, updated).then(async () => {
      await refresh();
      setShowQuotationModal(false);
      toast({ title: "Başarılı", description: "Fiyat teklifi başarıyla güncellendi." });
    });
  };

  const handleDeleteQuotation = (quotationId: string) => {
    if (!user) return;
    deleteQuotationFromDb(user.uid, quotationId).then(async () => {
      await refresh();
      toast({ title: "Başarılı", description: "Fiyat teklifi başarıyla silindi." });
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

  const handleCreateOrderFromQuotation = async (quotation: Quotation) => {
    if (!user) return;
    try {
      // Müşteri ID'sini isimden bul
      const customer = await getCustomerByName(user.uid, quotation.customerName);
      const customerId = customer?.id || '';

      // Sipariş kalemlerini tekliften oluştur
      const orderItems = (quotation.items || []).map((item: any) => ({
        id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        productName: item.productName,
        quantity: typeof item.quantity === 'number' ? item.quantity : Number(item.quantity) || 0,
        unit: typeof item.unit === 'string' && item.unit.length > 0 ? item.unit : 'adet',
        specifications: item.description || undefined,
      }));

      // Tarihler
      const orderDate = quotation.date ? new Date(quotation.date as any) : new Date();
      const deliveryDate = quotation.validUntil ? new Date(quotation.validUntil as any) : orderDate;

      const newOrderPayload = {
        orderNumber: `SIP-${Date.now()}`,
        customerName: quotation.customerName,
        customerId,
        orderDate,
        deliveryDate,
        status: 'pending' as const,
        priority: 'medium' as const,
        totalAmount: Number(quotation.grandTotal) || 0,
        currency: quotation.currency,
        items: orderItems,
        notes: quotation.notes || '',
      };

      await addOrder(user.uid, newOrderPayload);
      toast({ title: 'Başarılı', description: 'Tekliften sipariş oluşturuldu.' });
    } catch (error) {
      toast({ title: 'Hata', description: 'Sipariş oluşturulamadı.', variant: 'destructive' });
    }
  };

  const filteredQuotations = quotations.filter((quotation: Quotation) =>
    quotation.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quotation.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Fiyat Teklifleri</h2>
        <div className="flex space-x-2">
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
                    date: typeof editingQuotation.date === 'string' ? editingQuotation.date : editingQuotation.date,
                    validUntil: editingQuotation.validUntil,
                    subTotal: editingQuotation.subTotal ?? 0,
                    grandTotal: editingQuotation.grandTotal ?? 0,
                    taxRate: editingQuotation.taxRate ?? 0,
                    taxAmount: editingQuotation.taxAmount ?? 0,
                    createdAt: editingQuotation.createdAt ?? new Date().toISOString(),
                    updatedAt: editingQuotation.updatedAt ?? new Date().toISOString(),
                    currency: ['TRY', 'USD', 'EUR'].includes(editingQuotation.currency) ? editingQuotation.currency as 'TRY' | 'USD' | 'EUR' : 'TRY',
                    status: editingQuotation.status,
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teklifler ({quotations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Teklif ara..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
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
                {filteredQuotations.map((quotation: Quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell>{quotation.quotationNumber}</TableCell>
                    <TableCell>{quotation.customerName}</TableCell>
                    <TableCell>{format(new Date(quotation.date as any), "dd.MM.yyyy", { locale: tr })}</TableCell>
                    <TableCell>{quotation.validUntil ? format(new Date(quotation.validUntil as any), "dd.MM.yyyy", { locale: tr }) : '-'}</TableCell>
                    <TableCell>
                      {quotation.grandTotal.toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: quotation.currency
                      })}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        quotation.status === 'Taslak' ? 'bg-gray-100 text-gray-800' :
                        quotation.status === 'Gönderildi' ? 'bg-blue-100 text-blue-800' :
                        quotation.status === 'Kabul Edildi' ? 'bg-green-100 text-green-800' :
                        quotation.status === 'Reddedildi' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {quotation.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" title="Teklifi Yazdır/Görüntüle" onClick={() => handlePrintQuotation(quotation)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="icon"
                          title="Sipariş Oluştur"
                          onClick={() => {
                            const ok = window.confirm('Bu tekliften sipariş oluşturulsun mu?');
                            if (ok) handleCreateOrderFromQuotation(quotation);
                          }}
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingQuotation(quotation); setShowQuotationModal(true); }}
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

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Silme Onayı</DialogTitle>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Hayır</Button>
              <Button onClick={handleDelete}>Evet</Button>
            </DialogFooter>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    