// src/components/suppliers/supplier-detail-page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Supplier, Purchase, PaymentToSupplier, Currency, UnifiedTransaction as AppUnifiedTransaction, StockItem, Price, ContactHistoryItem, SupplierTask } from '@/lib/types';
import {
  addPurchase,
  updatePurchase as storageUpdatePurchase,
  deletePurchase as storageDeletePurchase,
  addPaymentToSupplier,
  updatePaymentToSupplier as storageUpdatePaymentToSupplier,
  deletePaymentToSupplier as storageDeletePaymentToSupplier,
  updateSupplier as storageUpdateSupplier,
  getSupplierById,
  getStockItems,
  getStockItemById,
  deleteSupplier as storageDeleteSupplier
} from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger
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
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { PlusCircle, Trash2, DollarSign, ShoppingCart, Edit3, Pencil, CalendarIcon, FileText, Printer, History, ClipboardList, Download, Bold, Italic, List, ListOrdered, Strikethrough, Underline as UnderlineIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid, formatISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from "next/link";
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEditor } from '@tiptap/react';
import { EditorContent } from '@tiptap/react';
import { Badge } from "@/components/ui/badge";
import { TransactionCategory, TransactionTag } from "@/lib/types";
import Underline from '@tiptap/extension-underline';
import { PurchaseModal } from "./purchase-modal";
import { PaymentToSupplierModal } from "./payment-to-supplier-modal";
import { EditSupplierModal } from "./edit-supplier-modal";
import { DeleteConfirmationModal } from "../common/delete-confirmation-modal";
import { ContactHistoryModal } from "./contact-history-modal";
import { TaskModal } from "./task-modal";

interface SupplierDetailPageClientProps {
  supplier: Supplier;
  initialPurchases: Purchase[];
  initialPaymentsToSupplier: PaymentToSupplier[];
  user: { uid: string } | null;
}

type PurchaseFormValues = {
  amount: string;
  date: Date;
  currency: Currency;
  stockItemId?: string;
  quantityPurchased?: string;
  unitPrice?: string;
};

type PaymentToSupplierFormValues = {
  amount: string;
  date: Date;
  method: string;
  currency: Currency;
  referenceNumber?: string | null;
};

type ContactHistoryFormValues = {
  date: Date;
  type: 'phone' | 'email' | 'meeting' | 'other';
  summary: string;
  notes: string;
};

type SupplierTaskFormValues = {
  description: string;
  dueDate?: Date;
  status: 'pending' | 'completed' | 'in-progress';
};

const EMPTY_PURCHASE_FORM_VALUES: PurchaseFormValues = {
  amount: '',
  date: new Date(),
  currency: 'TRY',
  stockItemId: 'none',
  quantityPurchased: '',
  unitPrice: '',
};

const EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES: PaymentToSupplierFormValues = {
  amount: '',
  date: new Date(),
  method: 'nakit',
  currency: 'TRY',
  referenceNumber: null,
};

const EMPTY_CONTACT_HISTORY_FORM_VALUES: ContactHistoryFormValues = {
  date: new Date(),
  type: 'other',
  summary: '',
  notes: '',
};

const EMPTY_TASK_FORM_VALUES: SupplierTaskFormValues = {
  description: '',
  dueDate: undefined,
  status: 'pending',
};

type UnifiedTransactionClient = AppUnifiedTransaction; 

export function SupplierDetailPageClient({ supplier: initialSupplier, initialPurchases, initialPaymentsToSupplier, user }: SupplierDetailPageClientProps) {
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<Supplier>(initialSupplier);
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [paymentsToSupplier, setPaymentsToSupplier] = useState<PaymentToSupplier[]>(initialPaymentsToSupplier);
  const [availableStockItems, setAvailableStockItems] = useState<StockItem[]>([]);

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseFormValues, setPurchaseFormValues] = useState<PurchaseFormValues>(EMPTY_PURCHASE_FORM_VALUES);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const [showPaymentToSupplierModal, setShowPaymentToSupplierModal] = useState(false);
  const [paymentToSupplierFormValues, setPaymentToSupplierFormValues] = useState<PaymentToSupplierFormValues>(EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES);
  const [editingPaymentToSupplier, setEditingPaymentToSupplier] = useState<PaymentToSupplier | null>(null);

  const [deletingPurchaseId, setDeletingPurchaseId] = useState<string | null>(null);
  const [deletingPaymentToSupplierId, setDeletingPaymentToSupplierId] = useState<string | null>(null);

  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);

  const [notesContent, setNotesContent] = useState(initialSupplier.notes || '');
  const [showContactHistoryModal, setShowContactHistoryModal] = useState(false);
  const [contactHistoryFormValues, setContactHistoryFormValues] = useState<ContactHistoryFormValues>(EMPTY_CONTACT_HISTORY_FORM_VALUES);
  const [editingContactHistoryItem, setEditingContactHistoryItem] = useState<ContactHistoryItem | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskFormValues, setTaskFormValues] = useState<SupplierTaskFormValues>(EMPTY_TASK_FORM_VALUES);
  const [editingTask, setEditingTask] = useState<SupplierTask | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<string | null>(null);

  const [stockItemDisplayNames, setStockItemDisplayNames] = useState<Record<string, string>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showPrintView, setShowPrintView] = useState(false);

  const totalPurchases = useMemo(() => {
    return purchases.reduce((sum: number, purchase: Purchase) => sum + purchase.amount, 0);
  }, [purchases]);

  const totalPayments = useMemo(() => {
    return paymentsToSupplier.reduce((sum: number, payment: PaymentToSupplier) => sum + payment.amount, 0);
  }, [paymentsToSupplier]);

  const balance = useMemo(() => {
    return totalPurchases - totalPayments;
  }, [totalPurchases, totalPayments]);

  const unifiedTransactions = useMemo(() => {
    const all = [
      ...purchases.map(p => ({ ...p, transactionType: 'purchase' as const })),
      ...paymentsToSupplier.map(p => ({ ...p, transactionType: 'paymentToSupplier' as const }))
    ];
    return all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [purchases, paymentsToSupplier]);

  const filteredAndSortedTransactions = useMemo(() => {
    const all: (Purchase | PaymentToSupplier)[] = [
      ...purchases.map((p: Purchase) => ({ ...p, transactionType: 'purchase' as const })),
      ...paymentsToSupplier.map((p: PaymentToSupplier) => ({ ...p, transactionType: 'paymentToSupplier' as const }))
    ];

    const filtered = all.filter(item => {
      const itemDate = parseISO(item.date);
      return (!dateRange?.from || itemDate >= dateRange.from) &&
             (!dateRange?.to || itemDate <= dateRange.to);
    });

    const searched = searchQuery
      ? filtered.filter(item => {
          const searchLower = searchQuery.toLowerCase();
          const description = (item.transactionType === 'purchase' && (item as Purchase).description) || 
                              (item.transactionType === 'paymentToSupplier' && (item as PaymentToSupplier).description) || '';
          return (
            item.amount.toString().includes(searchLower) ||
            description.toLowerCase().includes(searchLower) ||
            format(parseISO(item.date), 'dd.MM.yyyy').includes(searchLower)
          );
        })
      : filtered;

    return searched.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [purchases, paymentsToSupplier, dateRange, searchQuery, sortOrder]);

  const recentTransactions = useMemo(() => {
    return filteredAndSortedTransactions.slice(0, 5);
  }, [filteredAndSortedTransactions]);

  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTransactions, currentPage]);

  const PrintView = () => (
    <div className="p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">{supplier.name}</h1>
        <p className="text-sm text-muted-foreground">
          {dateRange?.from && dateRange?.to
            ? `${safeFormatDate(dateRange.from.toISOString(), 'dd.MM.yyyy')} - ${safeFormatDate(dateRange.to.toISOString(), 'dd.MM.yyyy')}`
            : 'Tüm İşlemler'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Toplam Alış</div>
          <div className="text-xl font-bold text-blue-600">{formatCurrency(totalPurchases, 'TRY')}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Toplam Ödeme</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(totalPayments, 'TRY')}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Bakiye</div>
          <div className={cn(
            "text-xl font-bold",
            balance > 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(balance, 'TRY')}
          </div>
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Tarih</th>
            <th className="text-left p-2">İşlem</th>
            <th className="text-right p-2">Tutar</th>
            <th className="text-left p-2">Detay</th>
          </tr>
        </thead>
        <tbody>
          {filteredAndSortedTransactions.map((item) => (
            <TableRow key={`${item.transactionType}-${item.id}`} className="border-b">
              <TableCell className="p-2">{safeFormatDate(item.date, 'dd.MM.yyyy')}</TableCell>
              <TableCell className="p-2">{item.transactionType === 'purchase' ? 'Alış' : 'Ödeme'}</TableCell>
              <TableCell className="p-2 text-right">{formatCurrency(item.amount, item.currency)}</TableCell>
              <TableCell className="p-2">
                {item.transactionType === 'purchase' && 'quantityPurchased' in item && 'unitPrice' in item && item.quantityPurchased && item.unitPrice && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Detay:</span>
                    <span className="text-sm">
                      {item.quantityPurchased} adet × {formatCurrency(item.unitPrice, item.currency)}
                    </span>
                  </div>
                )}
                {item.transactionType === 'paymentToSupplier' && ( 
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ödeme Yöntemi:</span>
                    <span className="text-sm">{item.method}</span>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </table>
    </div>
  );

  useEffect(() => {
    const fetchDisplayNames = async () => {
      const uniqueStockItemIds = new Set<string>();
      purchases.forEach(purchase => {
        if (purchase.stockItemId) uniqueStockItemIds.add(purchase.stockItemId);
      });

      const namesMap: Record<string, string> = {};
      for (const stockItemId of Array.from(uniqueStockItemIds)) {
        namesMap[stockItemId] = await getStockItemName(stockItemId);
      }
      setStockItemDisplayNames(namesMap);
    };

    fetchDisplayNames();
  }, [purchases, paymentsToSupplier, getStockItemName]);

  useEffect(() => {
    setSupplier(initialSupplier);
    setPurchases(initialPurchases);
    setPaymentsToSupplier(initialPaymentsToSupplier);
    if (typeof window !== "undefined" && user) {
      getStockItems(user.uid).then(items => setAvailableStockItems(items));
    }
  }, [initialSupplier, initialPurchases, initialPaymentsToSupplier, user]);

  useEffect(() => {
    const quantity = parseFloat(purchaseFormValues.quantityPurchased || '0');
    const price = parseFloat(purchaseFormValues.unitPrice || '0');
    if (purchaseFormValues.stockItemId && purchaseFormValues.stockItemId !== 'none' && !isNaN(quantity) && !isNaN(price) && quantity > 0 && price >= 0) {
      setPurchaseFormValues(prev => ({ ...prev, amount: (quantity * price).toFixed(2) }));
    } else if (!purchaseFormValues.stockItemId || purchaseFormValues.stockItemId === 'none') {
      // Allow manual amount entry if no stock item is selected or unit price/qty is zero
    } else {
      setPurchaseFormValues(prev => ({ ...prev, amount: '' })); // Clear amount if calculation is not possible
    }
  }, [purchaseFormValues.quantityPurchased, purchaseFormValues.unitPrice, purchaseFormValues.stockItemId]);

  useEffect(() => {
    setPurchaseFormValues(prev => ({ ...prev, unitPrice: '', currency: 'TRY' }));
  }, [purchaseFormValues.stockItemId]);

  const refreshSupplierData = useCallback(async () => {
    if (!supplier?.id || !user) return;
    const freshSupplier = await getSupplierById(user.uid, supplier.id);
    if (freshSupplier) {
      setSupplier(freshSupplier);
      document.title = `${freshSupplier.name} | Tedarikçi Detayları | ERMAY`;
    }
    if (typeof window !== "undefined" && user) {
      getStockItems(user.uid).then(items => setAvailableStockItems(items));
    }
  }, [supplier?.id, user]);

  const handleSupplierUpdate = useCallback(async (data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> | Supplier): Promise<void> => {
    try {
      if (!user) {
        console.error("handleSupplierUpdate: User is not logged in.");
        toast({
          title: "Hata",
          description: "Tedarikçi bilgileri güncellenirken bir sorun oluştu: Kullanıcı girişi yapılmamış.",
          variant: "destructive",
        });
        return;
      }
      const supplierToUpdate: Supplier = 'id' in data && data.id
        ? { ...data as Supplier, updatedAt: formatISO(new Date()) }
        : { ...data, id: initialSupplier.id, createdAt: initialSupplier.createdAt, updatedAt: formatISO(new Date()) };

      await storageUpdateSupplier(user.uid, supplierToUpdate);
      toast({
        title: "Tedarikçi Güncellendi",
        description: `${supplierToUpdate.name} tedarikçi bilgileri güncellendi.`, 
      });
      setShowEditSupplierModal(false);
      await refreshSupplierData();
    } catch (error) {
      console.error("Tedarikçi güncellenirken hata:", error);
      toast({
        title: "Hata",
        description: "Tedarikçi bilgileri güncellenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [toast, refreshSupplierData, user, initialSupplier.id, initialSupplier.createdAt]);

  const balances = useMemo(() => {
    const newBalances: Record<Currency, number> = { USD: 0, TRY: 0 };
    purchases.forEach(purchase => {
      newBalances[purchase.currency] = (newBalances[purchase.currency] || 0) + purchase.amount;
    });
    paymentsToSupplier.forEach(payment => {
      newBalances[payment.currency] = (newBalances[payment.currency] || 0) - payment.amount;
    });
    return newBalances;
  }, [purchases, paymentsToSupplier]);

  const formatCurrency = (amount: number, currency: Currency): string => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      amount = 0;
    }
    try {
      return amount.toLocaleString('tr-TR', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch (e) {
      console.error("Error formatting currency:", e);
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  const handleOpenAddPurchaseModal = useCallback(() => {
    if (!supplier?.id) {
      toast({
        title: "Hata",
        description: "Tedarikçi bilgisi bulunamadı.",
        variant: "destructive",
      });
      return;
    }
    setEditingPurchase(null);
    setPurchaseFormValues(EMPTY_PURCHASE_FORM_VALUES);
    setShowPurchaseModal(true);
  }, [supplier?.id, toast]);

  const handleOpenEditPurchaseModal = useCallback((purchase: Purchase) => {
    setEditingPurchase(purchase);
    setPurchaseFormValues({
      amount: purchase.amount.toString(),
      date: isValid(parseISO(purchase.date)) ? parseISO(purchase.date) : new Date(),
      currency: purchase.currency,
      stockItemId: purchase.stockItemId || undefined,
      quantityPurchased: purchase.quantityPurchased?.toString() || '',
      unitPrice: purchase.unitPrice?.toString() || '',
    });
    setShowPurchaseModal(true);
  }, []);

  const handlePurchaseFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supplier?.id) {
      toast({
        title: "Hata",
        description: "Alış eklenirken bir sorun oluştu: Kullanıcı girişi yapılmamış veya tedarikçi bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFloat(purchaseFormValues.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Hata",
          description: "Lütfen geçerli bir alış tutarı girin.",
          variant: "destructive",
        });
        return;
      }

      let stockItemId: string | null = null;
      let quantityPurchased: number | null = null;
      let unitPrice: number | null = null;
      let description = 'Alış';

      if (purchaseFormValues.stockItemId && purchaseFormValues.stockItemId !== 'none') {
        stockItemId = purchaseFormValues.stockItemId;
        
        if (!purchaseFormValues.quantityPurchased || !purchaseFormValues.unitPrice) {
          toast({
            title: "Hata",
            description: "Stok ürünü seçildiğinde miktar ve birim fiyat zorunludur.",
            variant: "destructive",
          });
          return;
        }

        quantityPurchased = parseFloat(purchaseFormValues.quantityPurchased);
        unitPrice = parseFloat(purchaseFormValues.unitPrice);

        if (isNaN(quantityPurchased) || quantityPurchased <= 0) {
          toast({
            title: "Hata",
            description: "Lütfen geçerli bir miktar girin.",
            variant: "destructive",
          });
          return;
        }

        if (isNaN(unitPrice) || unitPrice <= 0) {
          toast({
            title: "Hata",
            description: "Lütfen geçerli bir birim fiyat girin.",
            variant: "destructive",
          });
          return;
        }

        description = `${quantityPurchased} adet × ${unitPrice} ${purchaseFormValues.currency} (${stockItemDisplayNames[stockItemId] || ''})`;
      }

      const purchaseData: Purchase = {
        id: editingPurchase?.id || Math.random().toString(36).substr(2, 9),
        supplierId: supplier.id,
        amount: amount,
        date: formatISO(purchaseFormValues.date),
        currency: purchaseFormValues.currency,
        stockItemId,
        quantityPurchased,
        unitPrice,
        category: 'satis', // Kategori alış için 'alis' veya 'gider' olabilir, şu anlık 'satis' olarak kaldı
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transactionType: 'purchase',
        description
      };

      if (editingPurchase) {
        await storageUpdatePurchase(user.uid, purchaseData);
        setPurchases(prev => prev.map(p => p.id === editingPurchase.id ? purchaseData : p));
        toast({ title: "Alış Güncellendi", description: "Alış işlemi başarıyla güncellendi." });
      } else {
        const addedPurchase = await addPurchase(user.uid, purchaseData);
        setPurchases(prev => [...prev, addedPurchase]);
        toast({ title: "Alış Eklendi", description: "Yeni alış işlemi başarıyla eklendi." });
      }

      setShowPurchaseModal(false);
      setPurchaseFormValues(EMPTY_PURCHASE_FORM_VALUES);
      setEditingPurchase(null);
      await refreshSupplierData();
    } catch (error) {
      console.error("Alış kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Alış işlemi kaydedilirken bir sorun oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePurchase = useCallback(async () => {
    if (!deletingPurchaseId || !user) return;
    try {
      await storageDeletePurchase(user.uid, deletingPurchaseId);
      setPurchases(prev => prev.filter(p => p.id !== deletingPurchaseId));
      toast({ title: "Alış Silindi", description: "Alış başarıyla silindi." });
      setDeletingPurchaseId(null);
      await refreshSupplierData();
    } catch (error) {
      console.error("Alış silinirken hata:", error);
      toast({ title: "Hata", description: "Alış silinirken bir sorun oluştu.", variant: "destructive" });
    }
  }, [deletingPurchaseId, toast, refreshSupplierData, user]);

  const handleOpenAddPaymentToSupplierModal = useCallback(() => {
    if (!supplier?.id) {
      toast({
        title: "Hata",
        description: "Tedarikçi bilgisi bulunamadı.",
        variant: "destructive",
      });
      return;
    }
    setEditingPaymentToSupplier(null);
    setPaymentToSupplierFormValues(EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES);
    setShowPaymentToSupplierModal(true);
  }, [supplier?.id, toast]);

  const handleOpenEditPaymentToSupplierModal = useCallback((payment: PaymentToSupplier) => {
    setEditingPaymentToSupplier(payment);
    setPaymentToSupplierFormValues({
      amount: payment.amount.toString(),
      date: isValid(parseISO(payment.date)) ? parseISO(payment.date) : new Date(),
      method: payment.method,
      currency: payment.currency,
      referenceNumber: payment.referenceNumber || '',
    });
    setShowPaymentToSupplierModal(true);
  }, []);

  const handlePaymentToSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supplier?.id) {
      toast({
        title: "Hata",
        description: "Ödeme eklenirken bir sorun oluştu: Kullanıcı girişi yapılmamış veya tedarikçi bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFloat(paymentToSupplierFormValues.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Hata",
          description: "Lütfen geçerli bir ödeme tutarı girin.",
          variant: "destructive",
        });
        return;
      }

      const paymentData: PaymentToSupplier = {
        id: editingPaymentToSupplier?.id || Math.random().toString(36).substr(2, 9),
        supplierId: supplier.id,
        amount: amount,
        date: formatISO(paymentToSupplierFormValues.date),
        currency: paymentToSupplierFormValues.currency,
        method: paymentToSupplierFormValues.method,
        referenceNumber: paymentToSupplierFormValues.referenceNumber || undefined,
        category: 'odeme',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transactionType: 'paymentToSupplier',
        description: `${paymentToSupplierFormValues.method} ile ödeme`
      };

      if (editingPaymentToSupplier) {
        const updatedPayment = await storageUpdatePaymentToSupplier(user.uid, paymentData);
        setPaymentsToSupplier(prev => prev.map(p => p.id === editingPaymentToSupplier.id ? updatedPayment : p));
        toast({
          title: "Başarılı",
          description: "Ödeme başarıyla güncellendi.",
        });
      } else {
        const newPayment = await addPaymentToSupplier(user.uid, paymentData);
        setPaymentsToSupplier(prev => [...prev, newPayment]);
        toast({
          title: "Başarılı",
          description: "Yeni ödeme başarıyla eklendi.",
        });
      }

      setShowPaymentToSupplierModal(false);
      setPaymentToSupplierFormValues(EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES);
      setEditingPaymentToSupplier(null);
      await refreshSupplierData();
    } catch (error) {
      console.error('Ödeme eklenirken hata:', error);
      toast({
        title: "Hata",
        description: "Ödeme eklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePaymentToSupplier = useCallback(async () => {
    if (!deletingPaymentToSupplierId || !user) return;
    try {
      await storageDeletePaymentToSupplier(user.uid, deletingPaymentToSupplierId);
      setPaymentsToSupplier(prev => prev.filter(p => p.id !== deletingPaymentToSupplierId));
      toast({ title: "Ödeme Silindi", description: "Ödeme başarıyla silindi." });
      setDeletingPaymentToSupplierId(null);
      await refreshSupplierData();
    } catch (error) {
      console.error("Ödeme silinirken hata:", error);
      toast({ title: "Hata", description: "Ödeme silinirken bir sorun oluştu.", variant: "destructive" });
    }
  }, [deletingPaymentToSupplierId, toast, refreshSupplierData, user]);

  const safeFormatDate = (dateString: string, formatString: string = "d MMMM yyyy, HH:mm") => {
    if (!dateString) return "Tarih Yok";
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, formatString, { locale: tr });
      }
      return "Geçersiz Tarih";
    } catch (error) {
      return "Tarih Format Hatası";
    }
  };

  const getStockItemName = useCallback(async (stockItemId?: string): Promise<string> => {
    if (!stockItemId || stockItemId === 'none' || !user) return "Manuel Giriş";
    try {
      const stockItem = await getStockItemById(user.uid, stockItemId);
      return stockItem ? `${stockItem.name} (${stockItem.unit || 'Adet'})` : "Bilinmeyen Stok Kalemi";
    } catch (error) {
      console.error("Stok kalemi adı getirilirken hata:", error);
      return "Hata Oluştu";
    }
  }, [user]);

  const formatPriceForDisplay = useCallback((price?: Price): string => {
    if (!price || typeof price.amount !== 'number' || !price.currency) return "-";
    try {
      return price.amount.toLocaleString('tr-TR', { style: "currency", currency: price.currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) {
      return `${price.amount.toFixed(2)} ${price.currency}`;
    }
  }, []);

  const renderTransactionDetail = (item: UnifiedTransactionClient) => {
    const isPurchase = item.transactionType === 'purchase';
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Tarih:</span>
          <span className="text-sm">{format(parseISO(item.date), 'dd.MM.yyyy')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Tutar:</span>
          <span className="text-sm font-medium">{formatCurrency(item.amount, item.currency)}</span>
        </div>
        {isPurchase && 'quantityPurchased' in item && 'unitPrice' in item && item.quantityPurchased && item.unitPrice && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Detay:</span>
            <span className="text-sm">
              {item.quantityPurchased} adet × {formatCurrency(item.unitPrice, item.currency)}
            </span>
          </div>
        )}
        {item.transactionType === 'paymentToSupplier' && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Ödeme Yöntemi:</span>
            <span className="text-sm">{item.method}</span>
          </div>
        )}
      </div>
    );
  };

  const handleSaveNotes = useCallback(async () => {
    if (!user || !supplier?.id) return;
    try {
      const updatedSupplier: Supplier = { ...supplier, notes: notesContent };
      await storageUpdateSupplier(user.uid, updatedSupplier);
      setSupplier(updatedSupplier);
      toast({
        title: "Notlar Güncellendi",
        description: "Tedarikçi notları başarıyla kaydedildi.",
      });
    } catch (error) {
      console.error("Notlar kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Notlar kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [user, supplier, notesContent, toast]);

  const handleDeleteSupplier = useCallback(async () => {
    if (!user || !deletingSupplier) return;
    try {
      await storageDeleteSupplier(user.uid, deletingSupplier);
      toast({
        title: "Tedarikçi Silindi",
        description: "Tedarikçi başarıyla silindi.",
      });
      window.location.href = "/suppliers"; 
    } catch (error) {
      console.error("Tedarikçi silinirken hata:", error);
      toast({
        title: "Hata",
        description: "Tedarikçi silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setDeletingSupplier(null);
    }
  }, [user, deletingSupplier, toast]);

  const handleContactHistorySubmit = useCallback(async () => {
    if (!user || !supplier?.id) return;
    try {
      const newContactHistoryItem: ContactHistoryItem = {
        id: crypto.randomUUID(),
        date: formatISO(contactHistoryFormValues.date),
        type: contactHistoryFormValues.type,
        summary: contactHistoryFormValues.summary,
        notes: contactHistoryFormValues.notes || undefined,
      };

      const updatedSupplier = {
        ...supplier,
        contactHistory: [...(supplier.contactHistory || []), newContactHistoryItem],
      };

      await storageUpdateSupplier(user.uid, updatedSupplier);
      setSupplier(updatedSupplier);
      setShowContactHistoryModal(false);
      setContactHistoryFormValues(EMPTY_CONTACT_HISTORY_FORM_VALUES);
      toast({
        title: "Başarılı",
        description: "İletişim geçmişi eklendi.",
      });
    } catch (error) {
      console.error("İletişim geçmişi kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "İletişim geçmişi kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [user, supplier, contactHistoryFormValues, toast]);

  const handleOpenAddContactHistoryModal = useCallback(() => {
    setEditingContactHistoryItem(null);
    setContactHistoryFormValues(EMPTY_CONTACT_HISTORY_FORM_VALUES);
    setShowContactHistoryModal(true);
  }, []);

  const handleOpenEditContactHistoryModal = useCallback((item: ContactHistoryItem) => {
    setEditingContactHistoryItem(item);
    setContactHistoryFormValues({
      date: parseISO(item.date),
      type: item.type,
      summary: item.summary,
      notes: item.notes || '',
    });
    setShowContactHistoryModal(true);
  }, []);

  const handleDeleteContactHistoryItem = useCallback(async (itemId: string) => {
    if (!user || !supplier?.id) return;
    try {
      const updatedContactHistory = (supplier.contactHistory || []).filter(item => item.id !== itemId);
      const updatedSupplier: Supplier = { ...supplier, contactHistory: updatedContactHistory };
      await storageUpdateSupplier(user.uid, updatedSupplier);
      setSupplier(updatedSupplier);
      toast({
        title: "İletişim Silindi",
        description: "İletişim geçmişi kaydı başarıyla silindi.",
      });
    } catch (error) {
      console.error("İletişim geçmişi silinirken hata:", error);
      toast({
        title: "Hata",
        description: "İletişim geçmişi silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [user, supplier, toast]);

  const handleTaskFormSubmit = useCallback(async () => {
    if (!user || !supplier?.id) return;
    try {
      const taskToSave = {
        ...taskFormValues,
        dueDate: taskFormValues.dueDate ? formatISO(taskFormValues.dueDate, { representation: 'date' }) : undefined,
        id: editingTask?.id || crypto.randomUUID(),
        createdAt: editingTask?.createdAt || formatISO(new Date()),
        updatedAt: formatISO(new Date()),
      };

      let updatedTasks: SupplierTask[];

      if (editingTask) {
        updatedTasks = (supplier.tasks || []).map(task =>
          task.id === editingTask.id ? (taskToSave as SupplierTask) : task
        );
        toast({
          title: "Görev Güncellendi",
          description: "Görev başarıyla güncellendi.",
        });
      } else {
        updatedTasks = [...(supplier.tasks || []), (taskToSave as SupplierTask)];
        toast({
          title: "Görev Eklendi",
          description: "Yeni görev başarıyla eklendi.",
        });
      }

      const updatedSupplier: Supplier = { ...supplier, tasks: updatedTasks };
      await storageUpdateSupplier(user.uid, updatedSupplier);
      setSupplier(updatedSupplier);
      setShowTaskModal(false);
      setEditingTask(null);
      setTaskFormValues(EMPTY_TASK_FORM_VALUES);
    } catch (error) {
      console.error("Görev kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Görev kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [user, supplier, taskFormValues, editingTask, toast]);

  const handleOpenAddTaskModal = useCallback(() => {
    setEditingTask(null);
    setTaskFormValues(EMPTY_TASK_FORM_VALUES);
    setShowTaskModal(true);
  }, []);

  const handleOpenEditTaskModal = useCallback((task: SupplierTask) => {
    setEditingTask(task);
    setTaskFormValues({
      description: task.description,
      dueDate: task.dueDate ? parseISO(task.dueDate) : undefined,
      status: task.status,
    });
    setShowTaskModal(true);
  }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!user || !supplier?.id) return;
    try {
      const updatedTasks = (supplier.tasks || []).filter(task => task.id !== taskId);
      const updatedSupplier: Supplier = { ...supplier, tasks: updatedTasks };
      await storageUpdateSupplier(user.uid, updatedSupplier);
      setSupplier(updatedSupplier);
      toast({
        title: "Görev Silindi",
        description: "Görev başarıyla silindi.",
      });
    } catch (error) {
      console.error("Görev silinirken hata:", error);
      toast({
        title: "Hata",
        description: "Görev silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [user, supplier, toast]);

  const exportToCSV = (transactions: UnifiedTransactionClient[], supplierName: string) => {
    const headers = ['Tarih', 'İşlem Tipi', 'Tutar', 'Para Birimi', 'Açıklama'];
    const data = transactions.map(t => [
      format(parseISO(t.date), 'dd.MM.yyyy'),
      t.transactionType === 'purchase' ? 'Alış' : 'Ödeme', // İşlem tipi adı
      t.amount.toString(),
      t.currency,
      t.description
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${supplierName}_islemler_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthlyStats = useMemo(() => {
    const months = eachMonthOfInterval({
      start: dateRange?.from || addDays(new Date(), -180),
      end: dateRange?.to || new Date(),
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthPurchases = purchases.filter(purchase => {
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= monthStart && purchaseDate <= monthEnd;
      });

      const monthPaymentsToSupplier = paymentsToSupplier.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      });

      const totalPurchases = monthPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
      const totalPaymentsToSupplier = monthPaymentsToSupplier.reduce((sum, payment) => sum + payment.amount, 0);

      return {
        month: format(month, 'MMM yyyy', { locale: tr }),
        alışlar: totalPurchases,
        ödemeler: totalPaymentsToSupplier,
      };
    });
  }, [purchases, paymentsToSupplier, dateRange]);

  const transactionTypeDistribution = useMemo(() => {
    const total = filteredAndSortedTransactions.length;
    if (total === 0) return [];

    const purchasesCount = filteredAndSortedTransactions.filter(t => t.transactionType === 'purchase').length;
    const paymentsCount = filteredAndSortedTransactions.filter(t => t.transactionType === 'paymentToSupplier').length;

    return [
      { name: 'Alışlar', value: purchasesCount, percentage: (purchasesCount / total) * 100 },
      { name: 'Ödemeler', value: paymentsCount, percentage: (paymentsCount / total) * 100 },
    ];
  }, [filteredAndSortedTransactions]);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: supplier.notes || '',
    onUpdate: ({ editor }) => {
      setSupplier(prev => ({ ...prev, notes: editor.getHTML() }));
    },
  });

  const transactionCategories: { value: TransactionCategory; label: string }[] = [
    { value: 'satis', label: 'Satış' },
    { value: 'odeme', label: 'Ödeme' },
    { value: 'iade', label: 'İade' },
    { value: 'indirim', label: 'İndirim' },
    { value: 'komisyon', label: 'Komisyon' },
    { value: 'diger', label: 'Diğer' },
  ];

  const tagColors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-red-100 text-red-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
  ];

  const handleAddTag = (transactionId: string, tagName: string) => {
    const newTag: TransactionTag = {
      id: Math.random().toString(36).substr(2, 9),
      name: tagName,
      color: tagColors[Math.floor(Math.random() * tagColors.length)],
    };

    setPurchases(prevPurchases => 
      prevPurchases.map(purchase => 
        purchase.id === transactionId 
          ? { ...purchase, tags: [...purchase.tags, newTag] }
          : purchase
      )
    );

    setPaymentsToSupplier(prevPayments => 
      prevPayments.map(payment => 
        payment.id === transactionId 
          ? { ...payment, tags: [...payment.tags, newTag] }
          : payment
      )
    );
  };

  const handleRemoveTag = (transactionId: string, tagId: string) => {
    setPurchases(prevPurchases => 
      prevPurchases.map(purchase => 
        purchase.id === transactionId 
          ? { ...purchase, tags: purchase.tags.filter(tag => tag.id !== tagId) }
          : purchase
      )
    );

    setPaymentsToSupplier(prevPayments => 
      prevPayments.map(payment => 
        payment.id === transactionId 
          ? { ...payment, tags: payment.tags.filter(tag => tag.id !== tagId) }
          : payment
      )
    );
  };

  if (!supplier) {
    return <div className="text-center py-8">Tedarikçi bulunamadı.</div>;
  }

  if (showPrintView) {
    return (
      <div className="print:block hidden">
        <PrintView />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-3xl font-bold">{supplier.name} Detayları</CardTitle>
          <div className="flex items-center space-x-2">
            <Button onClick={handleOpenAddPurchaseModal} disabled={!supplier?.id} className="flex items-center space-x-2">
              <PlusCircle className="h-4 w-4" />
              <span>Alış Ekle</span>
            </Button>
            <Button onClick={handleOpenAddPaymentToSupplierModal} disabled={!supplier?.id} className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Ödeme Yap</span>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/suppliers/${supplier.id}/statement`} target="_blank">
                <FileText className="mr-2 h-4 w-4" /> Ekstre Görüntüle
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Toplam Alışlar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-extrabold text-blue-600">{formatCurrency(totalPurchases, 'TRY')}</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Toplam Ödemeler</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-extrabold text-green-600">{formatCurrency(totalPayments, 'TRY')}</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Bakiye</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-extrabold ${balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(balance, 'TRY')}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="transactions" className="w-full mt-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="transactions">İşlemler</TabsTrigger>
              <TabsTrigger value="contact-history">İletişim Geçmişi</TabsTrigger>
              <TabsTrigger value="tasks">Görevler</TabsTrigger>
              <TabsTrigger value="notes">Notlar</TabsTrigger>
            </TabsList>
            <TabsContent value="transactions">
              <Card className="mt-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-2xl font-bold">Tedarikçi İşlem Geçmişi</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="İşlem ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-sm"
                    />
                    <Select onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)} value={sortOrder}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sıralama" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">En Yeniye Göre</SelectItem>
                        <SelectItem value="asc">En Eskiye Göre</SelectItem>
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant={"outline"}
                          className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !dateRange?.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                            ) : (
                              format(dateRange.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Tarih Aralığı Seç</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange?.from}
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                    <Button onClick={() => setShowPrintView(true)} variant="outline" className="flex items-center space-x-2">
                      <Printer className="h-4 w-4" />
                      <span>Yazdır</span>
                    </Button>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tarih</TableHead>
                          <TableHead>İşlem Tipi</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Açıklama</TableHead>
                          <TableHead>Tutar</TableHead>
                          <TableHead>Eylemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTransactions.length > 0 ? (
                          paginatedTransactions.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{safeFormatDate(item.date)}</TableCell>
                              <TableCell>
                                <Badge variant={item.transactionType === 'purchase' ? "secondary" : "default"}>
                                  {item.transactionType === 'purchase' ? "Alış" : "Ödeme"}
                                </Badge>
                              </TableCell>
                              <TableCell>{item.category}</TableCell>
                              <TableCell>
                                {item.transactionType === 'purchase' && 'stockItemId' in item && item.stockItemId ? getStockItemName(item.stockItemId) : item.description}
                              </TableCell>
                              <TableCell className={`${item.transactionType === 'purchase' ? "text-red-600" : "text-green-600"}`}>
                                {item.transactionType === 'purchase' ? "+" : "-"}{formatCurrency(item.amount, item.currency)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {item.transactionType === 'purchase' ? (
                                    <Button variant="outline" size="sm" onClick={() => handleOpenEditPurchaseModal(item as Purchase)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button variant="outline" size="sm" onClick={() => handleOpenEditPaymentToSupplierModal(item as PaymentToSupplier)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="destructive" size="sm" onClick={() => item.transactionType === 'purchase' ? setDeletingPurchaseId(item.id) : setDeletingPaymentToSupplierId(item.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>İşlemi Silmek İstediğinizden Emin Misiniz?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Bu işlem geri alınamaz. Bu işlemi kalıcı olarak silecek ve sunucularımızdan verileri kaldıracaktır.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={item.transactionType === 'purchase' ? handleDeletePurchase : handleDeletePaymentToSupplier}>Sil</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                              Hiç işlem bulunamadı.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center space-x-2 mt-4">
                      <Button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                      >
                        Önceki
                      </Button>
                      {[...Array(totalPages)].map((_, index) => (
                        <Button
                          key={index + 1}
                          onClick={() => setCurrentPage(index + 1)}
                          variant={currentPage === index + 1 ? "default" : "outline"}
                        >
                          {index + 1}
                        </Button>
                      ))}
                      <Button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        variant="outline"
                      >
                        Sonraki
                      </Button>
                    </div>
                  )}

                  <Card className="mt-8">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold">Aylık İşlem İstatistikleri</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => formatCurrency(value, 'TRY')} />
                          <Bar dataKey="alışlar" fill="#8884d8" />
                          <Bar dataKey="ödemeler" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="mt-8">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold">İşlem Türü Dağılımı</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc pl-5">
                        {transactionTypeDistribution.map((item, index) => (
                          <li key={index} className="text-lg">
                            {item.name}: <span className="font-bold">{item.value}</span> işlem ({(item.percentage || 0).toFixed(2)}%)
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                </TabsContent>
                <TabsContent value="contact-history">
                  <Card className="mt-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-2xl font-bold">İletişim Geçmişi</CardTitle>
                      <Button onClick={handleOpenAddContactHistoryModal} className="flex items-center space-x-2">
                        <PlusCircle className="h-4 w-4" />
                        <span>İletişim Ekle</span>
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {supplier.contactHistory && supplier.contactHistory.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tarih</TableHead>
                              <TableHead>Tür</TableHead>
                              <TableHead>Özet</TableHead>
                              <TableHead>Notlar</TableHead>
                              <TableHead>Eylemler</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supplier.contactHistory.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{safeFormatDate(item.date, 'dd.MM.yyyy HH:mm')}</TableCell>
                                <TableCell>{item.type}</TableCell>
                                <TableCell>{item.summary}</TableCell>
                                <TableCell>{item.notes}</TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenEditContactHistoryModal(item)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" onClick={() => handleDeleteContactHistoryItem(item.id)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>İletişim Kaydını Silmek İstediğinizden Emin Misiniz?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Bu işlem geri alınamaz. Bu iletişim geçmişi kaydını kalıcı olarak silecek ve sunucularımızdan verileri kaldıracaktır.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>İptal</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteContactHistoryItem(item.id)}>Sil</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p>Henüz iletişim geçmişi yok.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="tasks">
                  <Card className="mt-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-2xl font-bold">Görevler</CardTitle>
                      <Button onClick={handleOpenAddTaskModal} className="flex items-center space-x-2">
                        <PlusCircle className="h-4 w-4" />
                        <span>Görev Ekle</span>
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {supplier.tasks && supplier.tasks.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Açıklama</TableHead>
                              <TableHead>Son Tarih</TableHead>
                              <TableHead>Durum</TableHead>
                              <TableHead>Eylemler</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supplier.tasks.map((task) => (
                              <TableRow key={task.id}>
                                <TableCell className="font-medium">{task.description}</TableCell>
                                <TableCell>{task.dueDate ? safeFormatDate(task.dueDate, 'dd.MM.yyyy') : 'Belirtilmemiş'}</TableCell>
                                <TableCell>
                                  <Badge variant={task.status === 'completed' ? 'default' : task.status === 'in-progress' ? 'secondary' : 'outline'}>
                                    {task.status === 'pending' ? 'Bekliyor' : task.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenEditTaskModal(task)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" onClick={() => handleDeleteTask(task.id)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Görevi Silmek İstediğinizden Emin Misiniz?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Bu işlem geri alınamaz. Bu görevi kalıcı olarak silecek ve sunucularımızdan verileri kaldıracaktır.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>İptal</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteTask(task.id)}>Sil</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p>Henüz görev yok.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="notes">
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold">Notlar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-md p-2 min-h-[150px] mb-4">
                        <EditorContent editor={editor} className="prose max-w-none" />
                      </div>
                      <div className="flex space-x-1 mb-2">
                        <Button onClick={() => editor?.chain().focus().toggleBold().run()} variant="outline" size="sm" disabled={!editor || !editor.can().toggleBold()}>
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => editor?.chain().focus().toggleItalic().run()} variant="outline" size="sm" disabled={!editor || !editor.can().toggleItalic()}>
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => editor?.chain().focus().toggleUnderline().run()} variant="outline" size="sm" disabled={!editor || !editor.can().toggleUnderline()}>
                          <UnderlineIcon className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => editor?.chain().focus().toggleStrike().run()} variant="outline" size="sm" disabled={!editor || !editor.can().toggleStrike()}>
                          <Strikethrough className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => editor?.chain().focus().toggleBulletList().run()} variant="outline" size="sm" disabled={!editor || !editor.can().toggleBulletList()}>
                          <List className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => editor?.chain().focus().toggleOrderedList().run()} variant="outline" size="sm" disabled={!editor || !editor.can().toggleOrderedList()}>
                          <ListOrdered className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button onClick={handleSaveNotes} className="w-full">Notları Kaydet</Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditSupplierModal(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Tedarikçi Düzenle
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" onClick={() => setDeletingSupplier(supplier.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Tedarikçiyi Sil
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tedarikçiyi Silmek İstediğinizden Emin Misiniz?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu işlem geri alınamaz. Bu tedarikçiyi kalıcı olarak silecek ve tüm ilişkili verileri (alışlar, ödemeler, iletişim geçmişi, görevler) sunucularımızdan kaldıracaktır.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSupplier}>Sil</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        </CardContent>
      </Card>

      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSubmit={handlePurchaseFormSubmit}
        formValues={purchaseFormValues}
        setFormValues={setPurchaseFormValues}
        availableStockItems={availableStockItems}
        stockItemDisplayNames={stockItemDisplayNames}
      />

      <PaymentToSupplierModal
        isOpen={showPaymentToSupplierModal}
        onClose={() => setShowPaymentToSupplierModal(false)}
        onSubmit={handlePaymentToSupplierSubmit}
        formValues={paymentToSupplierFormValues}
        setFormValues={setPaymentToSupplierFormValues}
      />

      <EditSupplierModal
        isOpen={showEditSupplierModal}
        onClose={() => setShowEditSupplierModal(false)}
        onSubmit={handleSupplierUpdate}
        supplier={supplier}
        setSupplier={setSupplier}
      />

      <DeleteConfirmationModal
        isOpen={!!deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={handleDeleteSupplier}
        title="Tedarikçiyi Sil"
        description="Bu tedarikçiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
      />

      <ContactHistoryModal
        isOpen={showContactHistoryModal}
        onClose={() => setShowContactHistoryModal(false)}
        onSubmit={handleContactHistorySubmit}
        formValues={contactHistoryFormValues}
        setFormValues={setContactHistoryFormValues}
      />

      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSubmit={handleTaskFormSubmit}
        formValues={taskFormValues}
        setFormValues={setTaskFormValues}
      />
    </div>
  );
}
