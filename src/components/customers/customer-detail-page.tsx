/// <reference types="react" />
"use client";

import React, { useState, useMemo, useEffect, FC, ChangeEvent } from 'react';
import type { Customer, Sale, Payment, Currency, StockItem, ContactHistoryItem, CustomerTask, SaleFormValues, PaymentFormValues, TaskFormValues } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2, Pencil, Printer, FileText, Home } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { SaleModal } from "./sale-modal";
import { PaymentModal } from "./payment-modal";
import { EditCustomerModal } from "./edit-customer-modal";
import { DeleteConfirmationModal } from "../common/delete-confirmation-modal";
import { PrintView } from "./print-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '../ui/textarea';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { JSX } from 'react/jsx-runtime';


interface CustomerDetailPageClientProps {
  customer: Customer;
  sales: Sale[];
  payments: Payment[];
  availableStockItems: StockItem[];
  contactHistory: ContactHistoryItem[];
  notes: string;
  onSaleSubmit: (values: SaleFormValues, editingSale: Sale | null) => void;
  onPaymentSubmit: (values: PaymentFormValues, editingPayment: Payment | null) => void;
  onSaleDelete: (saleId: string) => void;
  onPaymentDelete: (paymentId: string) => void;
  onCustomerDelete: () => void;
  onCustomerUpdate: (updatedData: Partial<Customer>) => void;
  onNotesSave: (notes: string) => void;
  onContactHistorySubmit: (values: any, editingItem: ContactHistoryItem | null) => void;
  onContactHistoryDelete: (itemId: string) => void;
  onTaskSubmit: (values: TaskFormValues, editingTask: CustomerTask | null) => void;
  onTaskDelete: (taskId: string) => void;
}

export function CustomerDetailPageClient({
  customer,
  sales,
  payments,
  availableStockItems,
  contactHistory,
  notes,
  onSaleSubmit,
  onPaymentSubmit,
  onSaleDelete,
  onPaymentDelete,
  onCustomerDelete,
  onCustomerUpdate,
  onNotesSave,
  onContactHistorySubmit,
  onContactHistoryDelete,
  onTaskSubmit,
  onTaskDelete
}: CustomerDetailPageClientProps) {

  // Modal States
  const [isSaleModalOpen, setSaleModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [saleFormValues, setSaleFormValues] = useState<SaleFormValues>({
    amount: '',
    date: new Date(),
    currency: 'TRY',
    stockItemId: undefined,
    description: '',
    quantity: undefined,
    unitPrice: undefined,
  });
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentFormValues, setPaymentFormValues] = useState<PaymentFormValues>({
    amount: '',
    date: new Date(),
    currency: 'TRY',
    method: 'nakit',
    referenceNumber: null
  });
  const [isEditCustomerModalOpen, setEditCustomerModalOpen] = useState(false);

  // Deletion States
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);

  // View State
  const [showPrintView, setShowPrintView] = useState(false);
  
  // Notes State
  const [currentNotes, setCurrentNotes] = useState(notes);

  // Filtering and Sorting States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // amount alanı olmayan satış ve ödemeleri filtrele
  const filteredSales = sales.filter(sale => typeof sale.amount === 'number' && !isNaN(sale.amount));
  const filteredPayments = payments.filter(payment => typeof payment.amount === 'number' && !isNaN(payment.amount));

  const balances = useMemo(() => {
    const newBalances: Record<Currency, number> = { USD: 0, TRY: 0, EUR: 0 };
    filteredSales.forEach(sale => {
      newBalances[sale.currency] = (newBalances[sale.currency] || 0) + sale.amount;
    });
    filteredPayments.forEach(payment => {
      newBalances[payment.currency] = (newBalances[payment.currency] || 0) - payment.amount;
    });
    return newBalances;
  }, [filteredSales, filteredPayments]);

  const unifiedTransactions = useMemo(() => {
    const all = [
      ...filteredSales.map(s => ({ ...s, transactionType: 'sale' as const })),
      ...filteredPayments.map(p => ({ ...p, transactionType: 'payment' as const }))
    ];
    return all
      .filter(item => {
        if (typeof item.amount !== 'number' || isNaN(item.amount)) return false;
        const itemDate = parseISO(item.date);
        const fromDate = dateRange?.from ? startOfDay(dateRange.from) : null;
        const toDate = dateRange?.to ? endOfDay(dateRange.to) : null;
        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
        const searchQueryLower = searchQuery.toLowerCase();
        if(searchQueryLower === "") return true;
        const descriptionMatch = item.description?.toLowerCase().includes(searchQueryLower);
        const amountMatch = item.amount && item.amount.toString().includes(searchQueryLower);
        const typeMatch = 'method' in item && item.method.toLowerCase().includes(searchQueryLower);
        return descriptionMatch || amountMatch || typeMatch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (sortOrder === 'desc') {
            const dateDiff = dateB - dateA;
            if (dateDiff !== 0) return dateDiff;
            return b.id.localeCompare(a.id);
        } else {
            const dateDiff = dateA - dateB;
            if (dateDiff !== 0) return dateDiff;
            return a.id.localeCompare(b.id);
        }
      });
  }, [filteredSales, filteredPayments, searchQuery, sortOrder, dateRange]);


  // Handlers
  const handleSaleFormOpen = (sale?: Sale) => {
    if (sale) {
      setEditingSale(sale);
      setSaleFormValues({
        amount: sale.amount.toString(),
        date: parseISO(sale.date),
        currency: sale.currency,
        stockItemId: sale.stockItemId || undefined,
        description: sale.description || '',
        // Manuel satışlar için ürün adını doldur
        ...(sale.stockItemId ? {} : { manualProductName: sale.description || '' }),
        quantity: sale.quantity != null ? sale.quantity.toString() : undefined,
        unitPrice: sale.unitPrice != null ? sale.unitPrice.toString() : undefined,
        // faturalı satış düzenleme ipucu alanları
        taxRate: sale.taxRate != null ? String(sale.taxRate) : undefined,
      });
      // sale-modal içinde tür seçim ekranının atlanması için invoiceType işaretini state'e not düşmek adına gerekirse formValues'ta tutuyoruz
      // invoiceType bilgisi sale-modal içinde editingSale üzerinden okunuyor
    } else {
      setEditingSale(null);
      setSaleFormValues({
        amount: '',
        date: new Date(),
        currency: 'TRY',
        stockItemId: undefined,
        description: '',
        quantity: undefined,
        unitPrice: undefined,
      });
    }
    setSaleModalOpen(true);
  };

  const handlePaymentFormOpen = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment);
      setPaymentFormValues({
        amount: payment.amount.toString(),
        date: parseISO(payment.date),
        currency: payment.currency,
        method: payment.method,
        referenceNumber: payment.referenceNumber || null,
        checkDate: payment.checkDate ? parseISO(payment.checkDate) : undefined,
        checkSerialNumber: payment.checkSerialNumber || undefined,
        description: payment.description || '',
      });
    } else {
      setEditingPayment(null);
      setPaymentFormValues({
        amount: '',
        date: new Date(),
        currency: 'TRY',
        method: 'nakit',
        referenceNumber: null
      });
    }
    setPaymentModalOpen(true);
  };

  const handleSaleFormSubmit = async (values: SaleFormValues) => {
    try {
      await onSaleSubmit(values, editingSale);
      setSaleModalOpen(false);
      setEditingSale(null);
    } catch (error) {
      console.error("Error submitting sale form:", error);
      // Hata durumunda modal'ı kapatma ve kullanıcıya hata mesajı göster
      alert("Satış kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };
  
  const handlePaymentFormSubmit = async (values: PaymentFormValues) => {
    try {
      await onPaymentSubmit(values, editingPayment);
      setPaymentModalOpen(false);
      setEditingPayment(null);
    } catch (error) {
      console.error("Error submitting payment form:", error);
      // Hata durumunda modal'ı kapatma ve kullanıcıya hata mesajı göster
      alert("Ödeme kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  const handleEditCustomerSave = async (values: Customer) => {
    await onCustomerUpdate(values);
    setEditCustomerModalOpen(false);
  };
  
  const confirmSaleDelete = () => {
    if (deletingSaleId) {
      onSaleDelete(deletingSaleId);
      setDeletingSaleId(null);
    }
  };

  const confirmPaymentDelete = () => {
    if (deletingPaymentId) {
      onPaymentDelete(deletingPaymentId);
      setDeletingPaymentId(null);
    }
  };

  const confirmCustomerDelete = () => {
    if(deletingCustomerId) {
        onCustomerDelete();
        setDeletingCustomerId(null);
    }
  }

  if (showPrintView) {
    return <PrintView customer={customer} transactions={unifiedTransactions} onClose={() => setShowPrintView(false)} />;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      {/* Sol üst köşede ana menüye dön butonu */}
      <div className="absolute left-4 top-4 z-10">
        <Link href="/" passHref legacyBehavior>
          <Button variant="ghost" size="icon" className="h-10 w-10" title="Ana Sayfa">
            <Home className="h-6 w-6" />
          </Button>
        </Link>
      </div>
      {/* Header */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">{customer.name}</CardTitle>
            <CardDescription></CardDescription>
          </div>
          <div className="flex space-x-2">
             <Button variant="outline" onClick={() => setEditCustomerModalOpen(true)}><Pencil className="mr-2 h-4 w-4" /> Düzenle</Button>
             <Button variant="destructive" onClick={() => setDeletingCustomerId(customer.id)}><Trash2 className="mr-2 h-4 w-4" /> Sil</Button>
             <Button asChild variant="secondary">
                <Link href={`/customers/${customer.id}/extract`}>
                    <FileText className="mr-2 h-4 w-4" /> Ekstre
                </Link>
             </Button>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <p><strong>Telefon:</strong> {customer.phone}</p>
                <p><strong>Email:</strong> {customer.email}</p>
                <p><strong>Adres:</strong> {customer.address}</p>
            </div>
        </CardContent>
      </Card>
      
      {/* Balances */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3 mb-6">
        {Object.entries(balances).map(([currency, balance]) => (
          <Card key={currency}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bakiye ({currency})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balance.toLocaleString('tr-TR', { style: 'currency', currency: currency })}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">İşlemler</TabsTrigger>
          <TabsTrigger value="notes">Notlar</TabsTrigger>
          <TabsTrigger value="report">Rapor</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <CardTitle>Hesap Hareketleri</CardTitle>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Input placeholder="Ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-sm" />
                    <Label htmlFor="date">Tarih</Label>
                    <Input
                      type="text"
                      placeholder="gg.aa.yyyy"
                    />
                     <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sırala" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="desc">Yeniden Eskiye</SelectItem>
                            <SelectItem value="asc">Eskiden Yeniye</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={() => handleSaleFormOpen()}><PlusCircle className="mr-2 h-4 w-4"/> Satış Ekle</Button>
                    <Button onClick={() => handlePaymentFormOpen()}><PlusCircle className="mr-2 h-4 w-4"/> Ödeme Ekle</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Ödeme Yöntemi</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unifiedTransactions
                    .filter(item => typeof item.amount === 'number' && !isNaN(item.amount))
                    .map((item) => (
                      <TableRow key={`${item.transactionType}-${item.id}`} className="cursor-pointer" onClick={(e) => {
                        // Eğer tıklanan element sil/düzenle butonu veya içi ise gezinme yapma
                        const target = e.target as HTMLElement;
                        if (target.closest('[data-action="delete"], [data-action="edit"]')) return;
                        if (item.transactionType === 'sale') {
                          window.location.href = `/customers/${customer.id}/sales/${item.id}`
                        } else {
                          window.location.href = `/customers/${customer.id}/payments/${item.id}`
                        }
                      }}>
                        <TableCell>{format(parseISO(item.date), 'dd.MM.yyyy', { locale: tr })}</TableCell>
                        <TableCell>
                          <Badge variant={item.transactionType === 'sale' ? 'destructive' : 'default'}>
                            {item.transactionType === 'sale' ? 'Satış' : 'Ödeme'}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>
                          {item.transactionType === 'payment' ?
                            (item.method === 'nakit' ? 'Nakit' :
                             item.method === 'krediKarti' ? 'Kredi Kartı' :
                             item.method === 'havale' ? 'Havale/EFT' :
                             item.method === 'cek' ? 'Çek' :
                             item.method === 'diger' ? 'Diğer' :
                             item.method)
                            : ''}
                        </TableCell>
                        <TableCell className="text-right">{item.amount.toLocaleString('tr-TR', { style: 'currency', currency: item.currency })}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" data-action="edit" onClick={(ev) => { ev.stopPropagation(); item.transactionType === 'sale' ? handleSaleFormOpen(item as Sale) : handlePaymentFormOpen(item as Payment) }}>
                              <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" data-action="delete" onClick={(ev) => { ev.stopPropagation(); item.transactionType === 'sale' ? setDeletingSaleId(item.id) : setDeletingPaymentId(item.id) }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notes Tab */}
        <TabsContent value="notes">
            <Card>
                <CardHeader>
                    <CardTitle>Müşteri Notları</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea 
                        value={currentNotes}
                        onChange={(e) => setCurrentNotes(e.target.value)}
                        rows={10}
                    />
                </CardContent>
                <CardFooter>
                    <Button onClick={() => onNotesSave(currentNotes)}>Notları Kaydet</Button>
                </CardFooter>
            </Card>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report">
          <Card>
            <CardHeader><CardTitle>Aylık Satış Grafiği (TRY)</CardTitle></CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[] /* Chart data needs to be calculated */}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* MODALS */}
      {isSaleModalOpen && (
        <SaleModal
          isOpen={isSaleModalOpen}
          onClose={() => { setSaleModalOpen(false); setEditingSale(null); }}
          onSubmit={handleSaleFormSubmit}
          formValues={saleFormValues}
          setFormValues={setSaleFormValues}
          availableStockItems={availableStockItems}
          customer={customer}
          editingSale={editingSale}
        />
      )}

      {isPaymentModalOpen && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => { setPaymentModalOpen(false); setEditingPayment(null); }}
          onSubmit={handlePaymentFormSubmit}
          formValues={paymentFormValues}
          setFormValues={setPaymentFormValues}
        />
      )}

      {isEditCustomerModalOpen && (
        <EditCustomerModal
          isOpen={isEditCustomerModalOpen}
          onClose={() => setEditCustomerModalOpen(false)}
          onSave={handleEditCustomerSave}
          customer={customer}
        />
      )}
      
      <DeleteConfirmationModal
        isOpen={!!deletingSaleId}
        onClose={() => setDeletingSaleId(null)}
        onConfirm={confirmSaleDelete}
        title="Satış Sil"
        description="Bu satışı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
      />

      <DeleteConfirmationModal
        isOpen={!!deletingPaymentId}
        onClose={() => setDeletingPaymentId(null)}
        onConfirm={confirmPaymentDelete}
        title="Ödeme Sil"
        description="Bu ödemeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
      />

       <DeleteConfirmationModal
        isOpen={!!deletingCustomerId}
        onClose={() => setDeletingCustomerId(null)}
        onConfirm={confirmCustomerDelete}
        title="Müşteri Sil"
        description={`${customer.name} adlı müşteriyi kalıcı olarak silmek istediğinizden emin misiniz? Müşteriye ait tüm satışlar ve ödemeler de silinecektir. Bu işlem geri alınamaz.`}
      />
    </div>
  );
} 