// src/components/suppliers/supplier-detail-page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Supplier, Purchase, PaymentToSupplier, Currency, UnifiedTransaction as AppUnifiedTransaction } from '@/lib/types';
// PDF Generator Button import is removed

import { 
  addPurchase, 
  updatePurchase as storageUpdatePurchase, 
  deletePurchase as storageDeletePurchase, 
  addPaymentToSupplier, 
  updatePaymentToSupplier as storageUpdatePaymentToSupplier,
  deletePaymentToSupplier as storageDeletePaymentToSupplier
} from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2, Edit, DollarSign, Receipt, ArrowUpDown, Pencil, CalendarIcon, ShoppingBag } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// PdfGeneratorButton is no longer imported or used


interface SupplierDetailPageClientProps {
  supplier: Supplier;
  initialPurchases: Purchase[];
  initialPaymentsToSupplier: PaymentToSupplier[];
}

type PurchaseFormValues = { description: string; amount: string; date: Date; currency: Currency };
type PaymentToSupplierFormValues = { amount: string; date: Date; method: string; currency: Currency };

const EMPTY_PURCHASE_FORM_VALUES: PurchaseFormValues = { description: '', amount: '', date: new Date(), currency: 'TRY' };
const EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES: PaymentToSupplierFormValues = { amount: '', date: new Date(), method: '', currency: 'TRY' };

type UnifiedTransaction = AppUnifiedTransaction;


export function SupplierDetailPageClient({ supplier: initialSupplier, initialPurchases, initialPaymentsToSupplier }: SupplierDetailPageClientProps) {
  const [supplier, setSupplier] = useState<Supplier>(initialSupplier);
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [paymentsToSupplier, setPaymentsToSupplier] = useState<PaymentToSupplier[]>(initialPaymentsToSupplier);
  const [balances, setBalances] = useState<Record<Currency, number>>({ USD: 0, TRY: 0, EUR: 0 });

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseFormValues, setPurchaseFormValues] = useState<PurchaseFormValues>(EMPTY_PURCHASE_FORM_VALUES);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  
  const [showPaymentToSupplierModal, setShowPaymentToSupplierModal] = useState(false);
  const [paymentToSupplierFormValues, setPaymentToSupplierFormValues] = useState<PaymentToSupplierFormValues>(EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES);
  const [editingPaymentToSupplier, setEditingPaymentToSupplier] = useState<PaymentToSupplier | null>(null);

  const [deletingPurchaseId, setDeletingPurchaseId] = useState<string | null>(null);
  const [deletingPaymentToSupplierId, setDeletingPaymentToSupplierId] = useState<string | null>(null);

  const { toast } = useToast();
  
  useEffect(() => {
    setSupplier(initialSupplier);
    setPurchases(initialPurchases);
    setPaymentsToSupplier(initialPaymentsToSupplier);
  }, [initialSupplier, initialPurchases, initialPaymentsToSupplier]);


  const calculateBalances = useCallback(() => {
    const newBalances: Record<Currency, number> = { USD: 0, TRY: 0, EUR: 0 };
    purchases.forEach(purchase => {
      newBalances[purchase.currency] = (newBalances[purchase.currency] || 0) + purchase.amount;
    });
    paymentsToSupplier.forEach(payment => {
      newBalances[payment.currency] = (newBalances[payment.currency] || 0) - payment.amount;
    });
    setBalances(newBalances);
  }, [purchases, paymentsToSupplier]);

  useEffect(() => {
    calculateBalances();
  }, [purchases, paymentsToSupplier, calculateBalances]);
  
  const formatCurrency = (amount: number, currency: Currency) => {
    if (typeof amount !== 'number' || isNaN(amount)) { 
        amount = 0;
    }
    if (!currency) { // Fallback currency
        currency = 'TRY';
    }
    try {
        return amount.toLocaleString('tr-TR', { style: "currency", currency: currency });
    } catch(e) {
        return `${amount.toFixed(2)} ${currency}`;
    }
  }

  const handleOpenAddPurchaseModal = useCallback(() => {
    setEditingPurchase(null);
    setPurchaseFormValues(EMPTY_PURCHASE_FORM_VALUES);
    setShowPurchaseModal(true);
  }, []);

  const handleOpenEditPurchaseModal = useCallback((purchase: Purchase) => {
    setEditingPurchase(purchase);
    setPurchaseFormValues({
      description: purchase.description,
      amount: purchase.amount.toString(),
      date: isValid(parseISO(purchase.date)) ? parseISO(purchase.date) : new Date(),
      currency: purchase.currency,
    });
    setShowPurchaseModal(true);
  }, []);
  
  const handlePurchaseFormSubmit = useCallback(() => {
    if (!purchaseFormValues.description || !purchaseFormValues.amount || !purchaseFormValues.date || !purchaseFormValues.currency) {
      toast({ title: "Hata", description: "Lütfen tüm alım alanlarını doldurun.", variant: "destructive" });
      return;
    }
    const amountNumber = parseFloat(purchaseFormValues.amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast({ title: "Hata", description: "Geçerli bir alım tutarı girin.", variant: "destructive" });
      return;
    }

    let updatedPurchases;
    if (editingPurchase) {
      const updatedPurchaseData: Purchase = {
        ...editingPurchase,
        description: purchaseFormValues.description,
        amount: amountNumber,
        date: format(purchaseFormValues.date, "yyyy-MM-dd"),
        currency: purchaseFormValues.currency,
      };
      (async () => {
        const updatedPurchase = await storageUpdatePurchase(updatedPurchaseData);
        updatedPurchases = purchases.map(p => p.id === updatedPurchase.id ? updatedPurchase : p);
        toast({ title: "Alım Güncellendi", description: `${formatCurrency(updatedPurchase.amount, updatedPurchase.currency)} tutarındaki alım güncellendi.` });
        setPurchases(updatedPurchases.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      })();
    } else {
      const newPurchaseData: Omit<Purchase, 'id'> = {
        supplierId: supplier.id,
        description: purchaseFormValues.description,
        amount: amountNumber,
        date: format(purchaseFormValues.date, "yyyy-MM-dd"),
        currency: purchaseFormValues.currency,
      };
      (async () => {
        const newPurchase = await addPurchase(newPurchaseData);
        updatedPurchases = [newPurchase, ...purchases];
        toast({ title: "Alım Eklendi", description: `${formatCurrency(newPurchase.amount, newPurchase.currency)} tutarında alım eklendi.` });
        setPurchases(updatedPurchases.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      })();
    }
    setShowPurchaseModal(false);
    setEditingPurchase(null);
    setPurchaseFormValues(EMPTY_PURCHASE_FORM_VALUES);
  }, [purchaseFormValues, editingPurchase, purchases, supplier, toast]); 

  const handleDeletePurchase = useCallback(() => {
    if (!deletingPurchaseId) return;
    storageDeletePurchase(deletingPurchaseId);
    setPurchases(prev => prev.filter(p => p.id !== deletingPurchaseId));
    toast({ title: "Alım Silindi" });
    setDeletingPurchaseId(null);
  }, [deletingPurchaseId, toast]);
  
  const handleOpenAddPaymentToSupplierModal = useCallback(() => {
    setEditingPaymentToSupplier(null);
    setPaymentToSupplierFormValues(EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES);
    setShowPaymentToSupplierModal(true);
  }, []);

  const handleOpenEditPaymentToSupplierModal = useCallback((payment: PaymentToSupplier) => {
    setEditingPaymentToSupplier(payment);
    setPaymentToSupplierFormValues({
      amount: payment.amount.toString(),
      date: isValid(parseISO(payment.date)) ? parseISO(payment.date) : new Date(),
      method: payment.method || '',
      currency: payment.currency,
    });
    setShowPaymentToSupplierModal(true);
  }, []);

  const handlePaymentToSupplierFormSubmit = useCallback(() => {
    if (!paymentToSupplierFormValues.amount || !paymentToSupplierFormValues.date || !paymentToSupplierFormValues.currency) {
      toast({ title: "Hata", description: "Lütfen ödeme tutarını, tarihini ve para birimini girin.", variant: "destructive" });
      return;
    }
    const amountNumber = parseFloat(paymentToSupplierFormValues.amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast({ title: "Hata", description: "Geçerli bir ödeme tutarı girin.", variant: "destructive" });
      return;
    }

    let updatedPaymentsToSupplier;
    if (editingPaymentToSupplier) {
      const updatedPaymentData: PaymentToSupplier = {
        ...editingPaymentToSupplier,
        amount: amountNumber,
        date: format(paymentToSupplierFormValues.date, "yyyy-MM-dd"),
        method: paymentToSupplierFormValues.method || undefined,
        currency: paymentToSupplierFormValues.currency,
      };
      const updatedPayment = storageUpdatePaymentToSupplier(updatedPaymentData);
      updatedPaymentsToSupplier = paymentsToSupplier.map(p => p.id === updatedPayment.id ? updatedPayment : p);
      toast({ title: "Tedarikçiye Ödeme Güncellendi", description: `${formatCurrency(updatedPayment.amount, updatedPayment.currency)} tutarındaki ödeme güncellendi.` });
    } else {
      const newPaymentData: Omit<PaymentToSupplier, 'id'> = {
        supplierId: supplier.id,
        amount: amountNumber,
        date: format(paymentToSupplierFormValues.date, "yyyy-MM-dd"),
        method: paymentToSupplierFormValues.method || undefined,
        currency: paymentToSupplierFormValues.currency,
      };
      const newPayment = addPaymentToSupplier(newPaymentData);
      updatedPaymentsToSupplier = [newPayment, ...paymentsToSupplier];
      toast({ title: "Tedarikçiye Ödeme Eklendi", description: `${formatCurrency(newPayment.amount, newPayment.currency)} tutarında ödeme eklendi.` });
    }
    setPaymentsToSupplier(updatedPaymentsToSupplier.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setShowPaymentToSupplierModal(false);
    setEditingPaymentToSupplier(null);
    setPaymentToSupplierFormValues(EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES);
  }, [paymentToSupplierFormValues, editingPaymentToSupplier, paymentsToSupplier, supplier, toast]);
  
  const handleDeletePaymentToSupplier = useCallback(() => {
    if (!deletingPaymentToSupplierId) return;
    storageDeletePaymentToSupplier(deletingPaymentToSupplierId);
    setPaymentsToSupplier(prev => prev.filter(p => p.id !== deletingPaymentToSupplierId));
    toast({ title: "Tedarikçiye Ödeme Silindi" });
    setDeletingPaymentToSupplierId(null);
  }, [deletingPaymentToSupplierId, toast]);
  
  const safeFormatDate = (dateString: string, formatString: string) => {
    try {
      const parsedDate = parseISO(dateString);
      if (isValid(parsedDate)) {
        return format(parsedDate, formatString, { locale: tr });
      }
      return "Geçersiz Tarih";
    } catch (error) {
      return "Geçersiz Tarih";
    }
  };

  const unifiedTransactions: UnifiedTransaction[] = useMemo(() => {
    const typedPurchases: UnifiedTransaction[] = purchases.map(p => ({ ...p, transactionType: 'purchase' as 'purchase' }));
    const typedPayments: UnifiedTransaction[] = paymentsToSupplier.map(p => ({ ...p, transactionType: 'paymentToSupplier' as 'paymentToSupplier' }));
    
    return [...typedPurchases, ...typedPayments].sort((a, b) => {
      const dateA = parseISO(a.date);
      const dateB = parseISO(b.date);
      if (!isValid(dateA) && !isValid(dateB)) return 0;
      if (!isValid(dateA)) return 1; 
      if (!isValid(dateB)) return -1;
      return dateB.getTime() - dateA.getTime(); 
    });
  }, [purchases, paymentsToSupplier]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-start">
            <div>
                <CardTitle className="text-2xl">{supplier.name}</CardTitle>
                <CardDescription>
                    {(supplier.email || supplier.phone) ? (
                    <>
                        {supplier.email && <span>{supplier.email}</span>}
                        {supplier.email && supplier.phone && <span> &middot; </span>}
                        {supplier.phone && <span>{supplier.phone}</span>}
                    </>
                    ) : (
                    <span className="italic text-muted-foreground">İletişim bilgisi yok</span>
                    )}
                </CardDescription>
            </div>
            {/* PDF Generator Button removed from here */}
        </CardHeader>
        <CardContent className="space-y-2">
          {supplier.address && <p className="text-sm text-muted-foreground">Adres: {supplier.address}</p>}
          {supplier.taxId && <p className="text-sm text-muted-foreground">Vergi No: {supplier.taxId}</p>}
           <p className="text-sm text-muted-foreground">Kayıt Tarihi: {safeFormatDate(supplier.createdAt, "d MMMM yyyy, HH:mm")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Bakiye Durumu (Borcunuz)</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.entries(balances).map(([currency, balance]) => (
            (purchases.some(s => s.currency === currency) || paymentsToSupplier.some(p => p.currency === currency)) && (
              <div key={currency} className="mb-2">
                <p className={cn("text-3xl font-bold", balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-foreground')}>
                  {formatCurrency(balance, currency as Currency)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Toplam Alım ({currency}): {formatCurrency(purchases.filter(s => s.currency === currency).reduce((sum, s) => sum + s.amount, 0), currency as Currency)}
                  <br />
                  Toplam Ödeme ({currency}): {formatCurrency(paymentsToSupplier.filter(p => p.currency === currency).reduce((sum, p) => sum + p.amount, 0), currency as Currency)}
                </p>
              </div>
            )
          ))}
          {unifiedTransactions.length === 0 && (
            <p className="text-muted-foreground">Bu tedarikçi için henüz finansal hareket yok.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Hesap Hareketleri</CardTitle>
          <div className="flex space-x-2">
            <Button size="sm" onClick={handleOpenAddPurchaseModal}>
              <ShoppingBag className="mr-2 h-4 w-4" /> Alım Ekle
            </Button>
            <Button size="sm" onClick={handleOpenAddPaymentToSupplierModal} variant="outline">
              <DollarSign className="mr-2 h-4 w-4" /> Ödeme Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {unifiedTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Bu tedarikçi için henüz hesap hareketi yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Açıklama / Yöntem</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead className="text-right w-[100px]">Eylemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unifiedTransactions.map(item => (
                  <TableRow key={`${item.transactionType}-${item.id}`}>
                    <TableCell>{safeFormatDate(item.date, "d MMM yy")}</TableCell>
                    <TableCell>
                      {item.transactionType === 'purchase' 
                        ? <span className="font-medium text-orange-600">Alım</span> 
                        : <span className="font-medium text-teal-600">Ödeme</span>}
                    </TableCell>
                    <TableCell>
                      {item.transactionType === 'purchase' ? (item as Purchase).description : (item as PaymentToSupplier).method || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.amount, item.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary" 
                        onClick={() => item.transactionType === 'purchase' ? handleOpenEditPurchaseModal(item as Purchase) : handleOpenEditPaymentToSupplierModal(item as PaymentToSupplier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive" 
                        onClick={() => item.transactionType === 'purchase' ? setDeletingPurchaseId(item.id) : setDeletingPaymentToSupplierId(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


      {/* Add/Edit Purchase Modal */}
      <Dialog open={showPurchaseModal} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setEditingPurchase(null);
          setPurchaseFormValues(EMPTY_PURCHASE_FORM_VALUES);
        }
        setShowPurchaseModal(isOpen);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPurchase ? "Alımı Düzenle" : "Yeni Alım Ekle"}</DialogTitle>
            <DialogDescription>{supplier?.name || 'Tedarikçi'} için {editingPurchase ? "alım kaydını güncelleyin." : "yeni bir alım kaydı oluşturun."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <Label htmlFor="purchase-description">Açıklama</Label>
              <Textarea 
                id="purchase-description" 
                placeholder="Alınan ürün veya hizmet" 
                value={purchaseFormValues.description}
                onChange={(e) => setPurchaseFormValues(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                <Label htmlFor="purchase-amount">Tutar</Label>
                <Input 
                    id="purchase-amount" 
                    type="number" 
                    placeholder="0.00" 
                    value={purchaseFormValues.amount}
                    onChange={(e) => setPurchaseFormValues(prev => ({ ...prev, amount: e.target.value }))}
                />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase-currency">Para Birimi</Label>
                  <Select
                    value={purchaseFormValues.currency}
                    onValueChange={(value) => setPurchaseFormValues(prev => ({ ...prev, currency: value as Currency }))}
                  >
                    <SelectTrigger id="purchase-currency">
                      <SelectValue placeholder="Para Birimi Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">TRY (Türk Lirası)</SelectItem>
                      <SelectItem value="USD">USD (ABD Doları)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="purchase-date">Tarih</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="purchase-date"
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !isValid(purchaseFormValues.date) && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {isValid(purchaseFormValues.date) ? format(purchaseFormValues.date, "PPP", {locale: tr}) : <span>Tarih seçin</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={purchaseFormValues.date}
                                onSelect={(date) => setPurchaseFormValues(prev => ({ ...prev, date: date || new Date() }))}
                                initialFocus
                                locale={tr}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={() => { setEditingPurchase(null); setPurchaseFormValues(EMPTY_PURCHASE_FORM_VALUES); }}>İptal</Button></DialogClose>
            <Button onClick={handlePurchaseFormSubmit}>{editingPurchase ? "Değişiklikleri Kaydet" : "Alımı Kaydet"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add/Edit PaymentToSupplier Modal */}
      <Dialog open={showPaymentToSupplierModal} onOpenChange={(isOpen) => {
         if (!isOpen) {
          setEditingPaymentToSupplier(null);
          setPaymentToSupplierFormValues(EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES);
        }
        setShowPaymentToSupplierModal(isOpen);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPaymentToSupplier ? "Tedarikçi Ödemesini Düzenle" : "Yeni Tedarikçi Ödemesi Ekle"}</DialogTitle>
            <DialogDescription>{supplier?.name || 'Tedarikçi'} için {editingPaymentToSupplier ? "ödeme kaydını güncelleyin." : "yeni bir ödeme kaydı oluşturun."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 pb-4">
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="payment-to-supplier-amount">Tutar</Label>
                    <Input 
                        id="payment-to-supplier-amount" 
                        type="number" 
                        placeholder="0.00" 
                        value={paymentToSupplierFormValues.amount}
                        onChange={(e) => setPaymentToSupplierFormValues(prev => ({ ...prev, amount: e.target.value }))}
                    />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="payment-to-supplier-currency">Para Birimi</Label>
                  <Select
                    value={paymentToSupplierFormValues.currency}
                    onValueChange={(value) => setPaymentToSupplierFormValues(prev => ({ ...prev, currency: value as Currency }))}
                  >
                    <SelectTrigger id="payment-to-supplier-currency">
                      <SelectValue placeholder="Para Birimi Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">TRY (Türk Lirası)</SelectItem>
                      <SelectItem value="USD">USD (ABD Doları)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="payment-to-supplier-date">Tarih</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="payment-to-supplier-date"
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !isValid(paymentToSupplierFormValues.date) && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {isValid(paymentToSupplierFormValues.date) ? format(paymentToSupplierFormValues.date, "PPP", {locale: tr}) : <span>Tarih seçin</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={paymentToSupplierFormValues.date}
                                onSelect={(date) => setPaymentToSupplierFormValues(prev => ({ ...prev, date: date || new Date() }))}
                                initialFocus
                                locale={tr}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
             <div className="space-y-2">
              <Label htmlFor="payment-to-supplier-method">Ödeme Yöntemi (İsteğe Bağlı)</Label>
              <Input 
                id="payment-to-supplier-method" 
                placeholder="Nakit, Banka Transferi vb." 
                value={paymentToSupplierFormValues.method}
                onChange={(e) => setPaymentToSupplierFormValues(prev => ({ ...prev, method: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={() => { setEditingPaymentToSupplier(null); setPaymentToSupplierFormValues(EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES); }}>İptal</Button></DialogClose>
            <Button onClick={handlePaymentToSupplierFormSubmit}>{editingPaymentToSupplier ? "Değişiklikleri Kaydet" : "Ödemeyi Kaydet"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Purchase Confirmation */}
      <AlertDialog open={!!deletingPurchaseId} onOpenChange={(isOpen) => { if(!isOpen) setDeletingPurchaseId(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alımı Silmek İstediğinize Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Alım kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingPurchaseId(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePurchase} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete PaymentToSupplier Confirmation */}
      <AlertDialog open={!!deletingPaymentToSupplierId} onOpenChange={(isOpen) => { if(!isOpen) setDeletingPaymentToSupplierId(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tedarikçi Ödemesini Silmek İstediğinize Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Ödeme kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingPaymentToSupplierId(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePaymentToSupplier} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}