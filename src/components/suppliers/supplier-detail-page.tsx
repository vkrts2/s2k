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
  getSupplierById,
  updateSupplier as storageUpdateSupplier,
  getStockItems,
  getStockItemById
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Trash2, DollarSign, ShoppingBag, Edit3, Pencil, CalendarIcon, FileText, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SupplierForm } from './supplier-form';
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
import { Badge } from '@/components/ui/badge';
import { TransactionCategory, TransactionTag } from '@/lib/types';

interface SupplierDetailPageClientProps {
  supplier: Supplier;
  initialPurchases: Purchase[];
  initialPaymentsToSupplier: PaymentToSupplier[];
  user: any;
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
};

// Yeni: İletişim Geçmişi Form Değerleri
type ContactHistoryFormValues = {
  id?: string; // Edit için eklendi
  date: Date;
  type: 'phone' | 'email' | 'meeting' | 'other';
  summary: string;
  notes: string;
};

// Yeni: Görev Form Değerleri
type SupplierTaskFormValues = {
  id?: string; // Edit için eklendi
  description: string;
  dueDate?: Date;
  status: 'pending' | 'completed' | 'in-progress';
};

const EMPTY_PURCHASE_FORM_VALUES: PurchaseFormValues = {
  amount: '',
  date: new Date(),
  currency: 'TRY',
  stockItemId: undefined,
  quantityPurchased: '',
  unitPrice: '',
};
const EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES: PaymentToSupplierFormValues = {
  amount: '',
  date: new Date(),
  method: 'cash', // Default payment method
  currency: 'TRY',
};

// Yeni: Boş İletişim Geçmişi Form Değerleri
const EMPTY_CONTACT_HISTORY_FORM_VALUES: ContactHistoryFormValues = {
  date: new Date(),
  type: 'other',
  summary: '',
  notes: '',
};

// Yeni: Boş Görev Form Değerleri
const EMPTY_SUPPLIER_TASK_FORM_VALUES: SupplierTaskFormValues = {
  description: '',
  dueDate: undefined,
  status: 'pending',
};

const formatCurrency = (amount: number, currency: Currency): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
      amount = 0;
  }
  if (!currency) {
      currency = 'TRY';
  }
  try {
      return amount.toLocaleString('tr-TR', { style: "currency", currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch(e) {
      return `${amount.toFixed(2)} ${currency}`;
  }
};

type UnifiedTransaction = (Purchase & { transactionType: 'purchase' }) | (PaymentToSupplier & { transactionType: 'paymentToSupplier', description: string });

export function SupplierDetailPageClient({ supplier: initialSupplier, initialPurchases, initialPaymentsToSupplier, user }: SupplierDetailPageClientProps) {
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
  const [deletingSupplier, setDeletingSupplier] = useState<string | null>(null);

  const [notesContent, setNotesContent] = useState(initialSupplier.notes || '');
  const [showContactHistoryModal, setShowContactHistoryModal] = useState(false);
  const [contactHistoryFormValues, setContactHistoryFormValues] = useState<ContactHistoryFormValues>(EMPTY_CONTACT_HISTORY_FORM_VALUES);
  const [editingContactHistoryItem, setEditingContactHistoryItem] = useState<ContactHistoryItem | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskFormValues, setTaskFormValues] = useState<SupplierTaskFormValues>(EMPTY_SUPPLIER_TASK_FORM_VALUES);
  const [editingTask, setEditingTask] = useState<SupplierTask | null>(null);

  const { toast } = useToast();

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

  // Notes Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: notesContent,
    onUpdate: ({ editor }) => {
      setNotesContent(editor.getHTML());
    },
  }, [notesContent]); // notesContent değiştiğinde editörün yeniden yüklenmesi için

  // Calculate balances
  const totalPurchases = useMemo(() => {
    return purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  }, [purchases]);

  const totalPayments = useMemo(() => {
    return paymentsToSupplier.reduce((sum, payment) => sum + payment.amount, 0);
  }, [paymentsToSupplier]);

  const balance = useMemo(() => {
    return totalPurchases - totalPayments;
  }, [totalPurchases, totalPayments]);

  // Combine purchases and payments into a unified list
  const unifiedTransactions = useMemo(() => {
    const purchasesWithType = purchases.map(purchase => ({ ...purchase, transactionType: 'purchase' as const }));
    const paymentsWithType = paymentsToSupplier.map(payment => ({ ...payment, transactionType: 'paymentToSupplier' as const, description: payment.method }));
    return [...purchasesWithType, ...paymentsWithType] as UnifiedTransaction[];
  }, [purchases, paymentsToSupplier]);

  // Filter transactions by date range
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = unifiedTransactions;
    
    // Apply date range filter
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= dateRange.from! && itemDate <= dateRange.to!;
      });
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item: UnifiedTransaction) => {
        const amount = item.amount.toString();
        const date = safeFormatDate(item.date, 'dd MMMM yyyy');
        const stockItemName = item.transactionType === 'purchase' && 'stockItemId' in item && item.stockItemId 
          ? stockItemDisplayNames[item.stockItemId] 
          : '';
        
        return amount.includes(query) || 
               date.toLowerCase().includes(query) || 
               stockItemName.toLowerCase().includes(query) ||
               (item.transactionType === 'paymentToSupplier' && item.description && item.description.toLowerCase().includes(query));
      });
    }

    // Apply sorting
    return filtered.sort((a: UnifiedTransaction, b: UnifiedTransaction) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [unifiedTransactions, searchQuery, sortOrder, stockItemDisplayNames, dateRange]);

  useEffect(() => {
    setSupplier(initialSupplier);
    setPurchases(initialPurchases);
    setPaymentsToSupplier(initialPaymentsToSupplier);
    if (typeof window !== "undefined" && user?.uid) {
        getStockItems(user.uid).then(items => {
          setAvailableStockItems(items);
          const names: Record<string, string> = {};
          items.forEach(item => {
            names[item.id] = item.name;
          });
          setStockItemDisplayNames(names);
        });
    }
  }, [initialSupplier, initialPurchases, initialPaymentsToSupplier, user?.uid]);

  useEffect(() => {
    const fetchDisplayNames = async () => {
      if (!user?.uid) return;
      const items = await getStockItems(user.uid);
      const names: Record<string, string> = {};
      items.forEach(item => {
        names[item.id] = item.name;
      });
      setStockItemDisplayNames(names);
    };
    fetchDisplayNames();
  }, [user?.uid]);

  const refreshSupplierData = useCallback(async () => {
    if (!supplier?.id || !user?.uid) return;
    const freshSupplier = await getSupplierById(user.uid, supplier.id);
    if (freshSupplier) {
      setSupplier(freshSupplier);
      document.title = `${freshSupplier.name} | Tedarikçi Detayları | ERMAY`;
    }
    if (typeof window !== "undefined" && user?.uid) {
      getStockItems(user.uid).then(items => setAvailableStockItems(items));
    }
  }, [supplier?.id, user?.uid]);

  const handleSupplierUpdate = useCallback(async (data: Supplier) => {
    if (!user?.uid) {
      toast({ title: "Hata", description: "Kullanıcı bilgisi eksik. Lütfen giriş yapın.", variant: "destructive" });
      return;
    }
    try {
      await storageUpdateSupplier(user.uid, data);
      toast({
        title: "Tedarikçi Güncellendi",
        description: `${data.name} tedarikçi bilgileri güncellendi.`,
      });
      setShowEditSupplierModal(false);
      refreshSupplierData();
    } catch (error) {
      console.error("Tedarikçi güncellenirken hata:", error);
      toast({
        title: "Hata",
        description: "Tedarikçi bilgileri güncellenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [toast, refreshSupplierData, user?.uid]);

  const handleOpenAddPurchaseModal = useCallback(() => {
    if (!supplier?.id) {
      toast({ title: "Hata", description: "Tedarikçi bilgisi eksik. Lütfen sayfayı yenileyin.", variant: "destructive" });
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

  const handlePurchaseFormSubmit = useCallback(async () => {
    if (!user?.uid || !supplier?.id) {
      toast({ 
        title: "Hata", 
        description: "Kullanıcı veya tedarikçi bilgisi eksik. Lütfen sayfayı yenileyin.", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const amountNumber = parseFloat(purchaseFormValues.amount);
      if (isNaN(amountNumber) || amountNumber <= 0) {
        toast({ 
          title: "Hata", 
          description: "Lütfen geçerli bir alım tutarı girin.", 
          variant: "destructive" 
        });
        return;
      }

      const unitPriceNumber = parseFloat(purchaseFormValues.unitPrice || '0');
      const quantityNumber = parseFloat(purchaseFormValues.quantityPurchased || '0');

      if (purchaseFormValues.stockItemId && purchaseFormValues.stockItemId !== 'none') {
        if (isNaN(quantityNumber) || quantityNumber <= 0) {
          toast({ 
            title: "Hata", 
            description: "Lütfen geçerli bir miktar girin.", 
            variant: "destructive" 
          });
          return;
        }
        if (isNaN(unitPriceNumber) || unitPriceNumber <= 0) {
          toast({ 
            title: "Hata", 
            description: "Lütfen geçerli bir birim fiyat girin.", 
            variant: "destructive" 
          });
          return;
        }
      }

      const newPurchase: Omit<Purchase, 'id' | 'transactionType' | 'description'> & { description?: string } = {
        supplierId: supplier.id,
        amount: amountNumber,
        date: purchaseFormValues.date.toISOString(),
        currency: purchaseFormValues.currency,
        stockItemId: purchaseFormValues.stockItemId,
        quantityPurchased: quantityNumber > 0 ? quantityNumber : undefined,
        unitPrice: unitPriceNumber > 0 ? unitPriceNumber : undefined,
        category: 'diger',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingPurchase) {
        await storageUpdatePurchase(user.uid, { ...editingPurchase, ...newPurchase, id: editingPurchase.id });
        setPurchases(purchases.map(p => p.id === editingPurchase.id ? { ...p, ...newPurchase, id: p.id } as Purchase : p));
        toast({ 
          title: "Alış Güncellendi", 
          description: "Alış işlemi başarıyla güncellendi." 
        });
      } else {
        const addedPurchase = await addPurchase(user.uid, newPurchase as Omit<Purchase, 'id' | 'transactionType'>);
        setPurchases(prev => [...prev, addedPurchase]);
        toast({ 
          title: "Alış Eklendi", 
          description: "Yeni alış işlemi başarıyla eklendi." 
        });
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
  }, [purchaseFormValues, supplier?.id, editingPurchase, purchases, refreshSupplierData, toast, user?.uid]);

  const handleDeletePurchase = useCallback(async () => {
    if (!deletingPurchaseId || !user?.uid) return;
    try {
      await storageDeletePurchase(user.uid, deletingPurchaseId);
      setPurchases(prev => prev.filter(p => p.id !== deletingPurchaseId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      refreshSupplierData();
      toast({ title: "Alış Silindi" });
      setDeletingPurchaseId(null);
    } catch (error) {
      console.error("Alış silinirken hata:", error);
      toast({ title: "Hata", description: "Alış silinirken bir sorun oluştu.", variant: "destructive" });
    }
  }, [deletingPurchaseId, toast, refreshSupplierData, user?.uid]);

  const handleOpenAddPaymentToSupplierModal = useCallback(() => {
    if (!supplier?.id) {
      toast({ title: "Hata", description: "Tedarikçi bilgisi eksik. Lütfen sayfayı yenileyin.", variant: "destructive" });
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
      method: payment.method || '', // method null/undefined olabilir
      currency: payment.currency,
    });
    setShowPaymentToSupplierModal(true);
  }, []);

  const handlePaymentToSupplierFormSubmit = useCallback(async () => {
    if (!user?.uid) {
      toast({ title: "Hata", description: "Kullanıcı bilgisi eksik. Lütfen giriş yapın.", variant: "destructive" });
      return;
    }

    const amountNumber = parseFloat(paymentToSupplierFormValues.amount);

    const newPayment: Omit<PaymentToSupplier, 'id' | 'transactionType'> = {
      supplierId: supplier.id!,
      amount: amountNumber,
      date: paymentToSupplierFormValues.date.toISOString(),
      method: paymentToSupplierFormValues.method,
      currency: paymentToSupplierFormValues.currency,
      category: 'odeme', // Varsayılan değer
      tags: [], // Varsayılan değer
      createdAt: new Date().toISOString(), // Varsayılan değer
      updatedAt: new Date().toISOString(), // Varsayılan değer
      description: paymentToSupplierFormValues.method, // description ekledik
    };

    try {
      if (editingPaymentToSupplier) {
        await storageUpdatePaymentToSupplier(user.uid, { ...editingPaymentToSupplier, ...newPayment, id: editingPaymentToSupplier.id });
        setPaymentsToSupplier(paymentsToSupplier.map(p => p.id === editingPaymentToSupplier.id ? { ...p, ...newPayment, id: p.id } as PaymentToSupplier : p));
        toast({ title: "Ödeme Güncellendi", description: "Ödeme işlemi başarıyla güncellendi." });
      } else {
        const addedPayment = await addPaymentToSupplier(user.uid, newPayment);
        setPaymentsToSupplier(prev => [...prev, addedPayment]);
        toast({ title: "Ödeme Eklendi", description: "Yeni ödeme işlemi başarıyla eklendi." });
      }
      refreshSupplierData();
      setShowPaymentToSupplierModal(false);
    } catch (error) {
      console.error("Ödeme kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Ödeme işlemi kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [paymentToSupplierFormValues, supplier?.id, editingPaymentToSupplier, paymentsToSupplier, refreshSupplierData, toast, user?.uid]);

  const handleDeletePaymentToSupplier = useCallback(async () => {
    if (!deletingPaymentToSupplierId || !user?.uid) return;
    try {
      await storageDeletePaymentToSupplier(user.uid, deletingPaymentToSupplierId);
      setPaymentsToSupplier(prev => prev.filter(p => p.id !== deletingPaymentToSupplierId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      refreshSupplierData();
      toast({ title: "Ödeme Silindi" });
      setDeletingPaymentToSupplierId(null);
    } catch (error) {
      console.error("Ödeme silinirken hata:", error);
      toast({ title: "Hata", description: "Ödeme silinirken bir sorun oluştu.", variant: "destructive" });
    }
  }, [deletingPaymentToSupplierId, toast, refreshSupplierData, user?.uid]);

  const safeFormatDate = (dateString: string, formatString: string = "d MMMM yyyy, HH:mm") => {
    if (!dateString) return "-";
    const date = parseISO(dateString);
    return isValid(date) ? format(date, formatString, { locale: tr }) : "-";
  };

  const getStockItemName = (stockItemId?: string): string => {
    if (!stockItemId) return "Bilinmiyor";
    const item = availableStockItems.find(s => s.id === stockItemId);
    return item ? item.name : "Bilinmiyor";
  };

  // Yeni fonksiyonlar: İletişim Geçmişi, Görevler, Notlar
  const handleContactHistorySubmit = useCallback(async () => {
    if (!user?.uid || !supplier?.id) {
      toast({ title: "Hata", description: "Kullanıcı veya tedarikçi bilgisi eksik.", variant: "destructive" });
      return;
    }

    const newContactHistory: Omit<ContactHistoryItem, 'id'> = {
      date: contactHistoryFormValues.date.toISOString(),
      type: contactHistoryFormValues.type,
      summary: contactHistoryFormValues.summary,
      notes: contactHistoryFormValues.notes,
    };

    try {
      if (editingContactHistoryItem) {
        // Update existing contact history item
        const updatedSupplier = { ...supplier, contactHistory: supplier.contactHistory?.map(item => 
          item.id === editingContactHistoryItem.id ? { ...item, ...newContactHistory, id: item.id } : item
        ) || [ { ...newContactHistory, id: editingContactHistoryItem.id || `ch-${Date.now()}` } as ContactHistoryItem ] };
        await storageUpdateSupplier(user.uid, updatedSupplier);
        setSupplier(updatedSupplier);
        toast({ title: "İletişim Kaydı Güncellendi", description: "İletişim kaydı başarıyla güncellendi." });
      } else {
        // Add new contact history item
        const newItem: ContactHistoryItem = { ...newContactHistory, id: `ch-${Date.now()}` };
        const updatedSupplier = { ...supplier, contactHistory: [...(supplier.contactHistory || []), newItem] };
        await storageUpdateSupplier(user.uid, updatedSupplier);
        setSupplier(updatedSupplier);
        toast({ title: "İletişim Kaydı Eklendi", description: "Yeni iletişim kaydı başarıyla eklendi." });
      }
      setShowContactHistoryModal(false);
      setContactHistoryFormValues(EMPTY_CONTACT_HISTORY_FORM_VALUES);
    } catch (error) {
      console.error("İletişim kaydı kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "İletişim kaydı kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [contactHistoryFormValues, editingContactHistoryItem, supplier, user?.uid, toast]);

  const handleOpenEditContactHistoryModal = useCallback((item: ContactHistoryItem) => {
    setEditingContactHistoryItem(item);
    setContactHistoryFormValues({
      date: isValid(parseISO(item.date)) ? parseISO(item.date) : new Date(),
      type: item.type,
      summary: item.summary,
      notes: item.notes || '',
      id: item.id, // ID'yi de kopyalıyoruz
    });
    setShowContactHistoryModal(true);
  }, []);

  const handleDeleteContactHistory = useCallback(async (id: string) => {
    if (!user?.uid || !supplier?.id) return;
    try {
      const updatedContactHistory = supplier.contactHistory?.filter(item => item.id !== id);
      const updatedSupplier = { ...supplier, contactHistory: updatedContactHistory };
      await storageUpdateSupplier(user.uid, updatedSupplier);
      setSupplier(updatedSupplier);
      toast({ title: "İletişim Kaydı Silindi", description: "İletişim kaydı başarıyla silindi." });
    } catch (error) {
      console.error("İletişim kaydı silinirken hata:", error);
      toast({ title: "Hata", description: "İletişim kaydı silinirken bir sorun oluştu.", variant: "destructive" });
    }
  }, [supplier, user?.uid, toast]);

  const handleTaskSubmit = useCallback(async () => {
    if (!user?.uid || !supplier?.id) {
      toast({ title: "Hata", description: "Kullanıcı veya tedarikçi bilgisi eksik.", variant: "destructive" });
      return;
    }

    const newTask: Omit<SupplierTask, 'id' | 'createdAt' | 'updatedAt'> = {
      description: taskFormValues.description,
      dueDate: taskFormValues.dueDate?.toISOString(),
      status: taskFormValues.status,
    };

    try {
      if (editingTask) {
        // Update existing task
        const updatedSupplier = { ...supplier, tasks: supplier.tasks?.map(task => 
          task.id === editingTask.id ? { ...task, ...newTask, id: task.id, updatedAt: new Date().toISOString() } : task
        ) || [ { ...newTask, id: editingTask.id || `task-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as SupplierTask ] };
        await storageUpdateSupplier(user.uid, updatedSupplier);
        setSupplier(updatedSupplier);
        toast({ title: "Görev Güncellendi", description: "Görev başarıyla güncellendi." });
      } else {
        // Add new task
        const newItem: SupplierTask = { ...newTask, id: `task-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        const updatedSupplier = { ...supplier, tasks: [...(supplier.tasks || []), newItem] };
        await storageUpdateSupplier(user.uid, updatedSupplier);
        setSupplier(updatedSupplier);
        toast({ title: "Görev Eklendi", description: "Yeni görev başarıyla eklendi." });
      }
      setShowTaskModal(false);
      setTaskFormValues(EMPTY_SUPPLIER_TASK_FORM_VALUES);
    } catch (error) {
      console.error("Görev kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Görev kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [taskFormValues, editingTask, supplier, user?.uid, toast]);

  const handleOpenEditTaskModal = useCallback((task: SupplierTask) => {
    setEditingTask(task);
    setTaskFormValues({
      description: task.description,
      dueDate: task.dueDate ? (isValid(parseISO(task.dueDate)) ? parseISO(task.dueDate) : undefined) : undefined,
      status: task.status,
      id: task.id, // ID'yi de kopyalıyoruz
    });
    setShowTaskModal(true);
  }, []);

  const handleDeleteTask = useCallback(async (id: string) => {
    if (!user?.uid || !supplier?.id) return;
    try {
      const updatedTasks = supplier.tasks?.filter(task => task.id !== id);
      const updatedSupplier = { ...supplier, tasks: updatedTasks };
      await storageUpdateSupplier(user.uid, updatedSupplier);
      setSupplier(updatedSupplier);
      toast({ title: "Görev Silindi", description: "Görev başarıyla silindi." });
    } catch (error) {
      console.error("Görev silinirken hata:", error);
      toast({ title: "Hata", description: "Görev silinirken bir sorun oluştu.", variant: "destructive" });
    }
  }, [supplier, user?.uid, toast]);

  const handleSaveNotes = useCallback(async () => {
    if (!user?.uid || !supplier?.id || !editor) return;
    try {
      const updatedSupplier = { ...supplier, notes: editor.getHTML() };
      await storageUpdateSupplier(user.uid, updatedSupplier);
      setSupplier(updatedSupplier);
      toast({ title: "Notlar Kaydedildi", description: "Notlar başarıyla kaydedildi." });
    } catch (error) {
      console.error("Notlar kaydedilirken hata:", error);
      toast({ title: "Hata", description: "Notlar kaydedilirken bir sorun oluştu.", variant: "destructive" });
    }
  }, [editor, supplier, user?.uid, toast]);

  const handleDeleteSupplier = useCallback(async () => {
    if (!user?.uid || !supplier?.id) {
      toast({ title: "Hata", description: "Kullanıcı veya tedarikçi bilgisi eksik.", variant: "destructive" });
      return;
    }
    try {
      // await deleteSupplier(user.uid, supplier.id);
      // Redirect to supplier list or show success message
      toast({ title: "Tedarikçi Silindi", description: `${supplier.name} başarıyla silindi.` });
      // Optionally redirect: router.push('/suppliers');
    } catch (error) {
      console.error("Tedarikçi silinirken hata:", error);
      toast({ title: "Hata", description: "Tedarikçi silinirken bir sorun oluştu.", variant: "destructive" });
    }
  }, [supplier, user?.uid, toast]);

  const PrintView = () => (
    <div className="fixed inset-0 bg-white p-8 overflow-auto print:block hidden">
      <h1 className="text-3xl font-bold mb-4">Tedarikçi Detayları: {supplier.name}</h1>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Genel Bilgiler</h2>
        <p><strong>E-posta:</strong> {supplier.email || '-'}</p>
        <p><strong>Telefon:</strong> {supplier.phone || '-'}</p>
        <p><strong>Adres:</strong> {supplier.address || '-'}</p>
        <p><strong>Vergi No:</strong> {supplier.taxId || '-'}</p>
        <p><strong>Oluşturulma Tarihi:</strong> {safeFormatDate(supplier.createdAt, 'dd MMMM yyyy')}</p>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Finansal Özet</h2>
        <p><strong>Toplam Alışlar:</strong> {formatCurrency(totalPurchases, 'TRY')}</p>
        <p><strong>Toplam Ödemeler:</strong> {formatCurrency(totalPayments, 'TRY')}</p>
        <p><strong>Bakiye:</strong> {formatCurrency(balance, 'TRY')}</p>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">İşlem Geçmişi</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarih</TableHead>
              <TableHead>İşlem Tipi</TableHead>
              <TableHead>Miktar</TableHead>
              <TableHead>Stok Kalemi/Açıklama</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unifiedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item) => (
              <TableRow key={item.id}>
                <TableCell>{safeFormatDate(item.date)}</TableCell>
                <TableCell>{item.transactionType === 'purchase' ? 'Alış' : 'Ödeme'}</TableCell>
                <TableCell>{item.transactionType === 'purchase' ? '+' : '-'}{formatCurrency(item.amount, item.currency)}</TableCell>
                <TableCell>
                  {item.transactionType === 'purchase' && 'stockItemId' in item && item.stockItemId && getStockItemName(item.stockItemId)}
                  {item.transactionType === 'paymentToSupplier' && item.description}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {supplier.contactHistory && supplier.contactHistory.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">İletişim Geçmişi</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Özet</TableHead>
                <TableHead>Notlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplier.contactHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{safeFormatDate(item.date)}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.summary}</TableCell>
                  <TableCell className="whitespace-pre-wrap">{item.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {supplier.tasks && supplier.tasks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Görevler</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Açıklama</TableHead>
                <TableHead>Son Tarih</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplier.tasks.sort((a, b) => {
                  if (a.status === 'completed' && b.status !== 'completed') return 1;
                  if (b.status === 'completed' && a.status !== 'completed') return -1;
                  if (a.dueDate && b.dueDate) {
                      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                  }
                  return 0;
              }).map((task) => (
                <TableRow key={task.id}>
                  <TableCell className={`${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.description}</TableCell>
                  <TableCell>{task.dueDate ? safeFormatDate(task.dueDate, 'dd MMMM yyyy') : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={task.status === 'completed' ? 'default' : task.status === 'in-progress' ? 'secondary' : 'outline'}>
                      {task.status === 'pending' ? 'Bekliyor' : task.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {supplier.notes && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Notlar</h2>
          <div dangerouslySetInnerHTML={{ __html: supplier.notes }} />
        </div>
      )}
    </div>
  );

  if (!supplier) {
    return <div className="text-center py-8">Tedarikçi bulunamadı.</div>;
  }

  return (
    <>
      {showPrintView && <PrintView />}

      {!showPrintView && (
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
                        <Button onClick={() => setShowPrintView(true)} variant="outline" className="flex items-center space-x-2">
                          <Printer className="h-4 w-4" />
                          <span>Yazdır</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        <Input
                          placeholder="İşlem ara..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="max-w-sm"
                        />
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
                        <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sıralama" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">En Yeniye Göre</SelectItem>
                            <SelectItem value="asc">En Eskiye Göre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>İşlem Tipi</TableHead>
                            <TableHead>Miktar</TableHead>
                            <TableHead>Stok Kalemi/Açıklama</TableHead>
                            <TableHead>İşlemler</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAndSortedTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, index) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{safeFormatDate(item.date)}</TableCell>
                              <TableCell>
                                <Badge variant={item.transactionType === 'purchase' ? 'default' : 'secondary'}>
                                  {item.transactionType === 'purchase' ? 'Alış' : 'Ödeme'}
                                </Badge>
                              </TableCell>
                              <TableCell className={item.transactionType === 'purchase' ? 'text-red-600' : 'text-green-600'}>
                                {item.transactionType === 'purchase' ? '+' : '-'}{formatCurrency(item.amount, item.currency)}
                              </TableCell>
                              <TableCell>
                                {item.transactionType === 'purchase' && 'stockItemId' in item && item.stockItemId && getStockItemName(item.stockItemId)}
                                {item.transactionType === 'paymentToSupplier' && item.description}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => item.transactionType === 'purchase' ? handleOpenEditPurchaseModal(item as Purchase) : handleOpenEditPaymentToSupplierModal(item as PaymentToSupplier)}
                                  className="mr-2"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700"
                                      onClick={() => item.transactionType === 'purchase' ? setDeletingPurchaseId(item.id) : setDeletingPaymentToSupplierId(item.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>İşlemi Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Bu işlem geri alınamaz. Bu işlemi kalıcı olarak silmek istediğinizden emin misiniz?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => { setDeletingPurchaseId(null); setDeletingPaymentToSupplierId(null); }}>İptal</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => item.transactionType === 'purchase' ? handleDeletePurchase() : handleDeletePaymentToSupplier()}>Sil</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="flex justify-between items-center mt-4">
                        <Button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          variant="outline"
                        >
                          Önceki Sayfa
                        </Button>
                        <span>Sayfa {currentPage} / {Math.ceil(filteredAndSortedTransactions.length / itemsPerPage)}</span>
                        <Button
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredAndSortedTransactions.length / itemsPerPage), prev + 1))}
                          disabled={currentPage * itemsPerPage >= filteredAndSortedTransactions.length}
                          variant="outline"
                        >
                          Sonraki Sayfa
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="contact-history">
                  {/* İletişim Geçmişi İçeriği */}
                  <Card className="mt-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-2xl font-bold">İletişim Geçmişi</CardTitle>
                      <Button onClick={() => setShowContactHistoryModal(true)} className="flex items-center space-x-2">
                        <PlusCircle className="h-4 w-4" />
                        <span>Yeni Ekle</span>
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {supplier.contactHistory && supplier.contactHistory.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tarih</TableHead>
                              <TableHead>Tip</TableHead>
                              <TableHead>Özet</TableHead>
                              <TableHead>Notlar</TableHead>
                              <TableHead>İşlemler</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supplier.contactHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{safeFormatDate(item.date)}</TableCell>
                                <TableCell>{item.type}</TableCell>
                                <TableCell>{item.summary}</TableCell>
                                <TableCell className="whitespace-pre-wrap">{item.notes}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" onClick={() => handleOpenEditContactHistoryModal(item)} className="mr-2">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>İletişim Kaydını Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Bu işlem geri alınamaz. Bu iletişim kaydını kalıcı olarak silmek istediğinizden emin misiniz?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteContactHistory(item.id)}>Sil</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-center text-muted-foreground">Henüz bir iletişim geçmişi kaydı bulunmamaktadır.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="tasks">
                  {/* Görevler İçeriği */}
                  <Card className="mt-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-2xl font-bold">Görevler</CardTitle>
                      <Button onClick={() => setShowTaskModal(true)} className="flex items-center space-x-2">
                        <PlusCircle className="h-4 w-4" />
                        <span>Yeni Görev Ekle</span>
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
                              <TableHead>İşlemler</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supplier.tasks.sort((a, b) => {
                                // Tamamlanmış görevleri sona, tamamlanmamışları son tarihe göre sırala
                                if (a.status === 'completed' && b.status !== 'completed') return 1;
                                if (b.status === 'completed' && a.status !== 'completed') return -1;
                                if (a.dueDate && b.dueDate) {
                                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                                }
                                return 0;
                            }).map((task) => (
                              <TableRow key={task.id}>
                                <TableCell className={`${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.description}</TableCell>
                                <TableCell>{task.dueDate ? safeFormatDate(task.dueDate, 'dd MMMM yyyy') : '-'}</TableCell>
                                <TableCell>
                                  <Badge variant={task.status === 'completed' ? 'default' : task.status === 'in-progress' ? 'secondary' : 'outline'}>
                                    {task.status === 'pending' ? 'Bekliyor' : task.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" onClick={() => handleOpenEditTaskModal(task)} className="mr-2">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Görevi Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Bu işlem geri alınamaz. Bu görevi kalıcı olarak silmek istediğinizden emin misiniz?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteTask(task.id)}>Sil</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-center text-muted-foreground">Henüz bir görev bulunmamaktadır.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="notes">
                  {/* Notlar İçeriği */}
                  <Card className="mt-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y=0 pb-2">
                      <CardTitle className="text-2xl font-bold">Notlar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EditorContent editor={editor} />
                      <Button onClick={handleSaveNotes} className="mt-4">Notları Kaydet</Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex items-center space-x-2">
                    <Trash2 className="h-4 w-4" />
                    <span>Tedarikçiyi Sil</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tedarikçiyi Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu işlem geri alınamaz. "{supplier.name}" adlı tedarikçiyi ve tüm ilişkili alış/ödeme verilerini kalıcı olarak silmek istediğinizden emin misiniz?
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
        </div>
      )}

      {/* Purchase Modal */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingPurchase ? 'Alış İşlemini Düzenle' : 'Yeni Alış Ekle'}</DialogTitle>
            <DialogDescription>
              Tedarikçiye ait {editingPurchase ? 'alış işlemini düzenleyin' : 'yeni bir alış işlemi ekleyin'}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handlePurchaseFormSubmit(); }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="purchaseAmount" className="text-right">Miktar</Label>
                <Input
                  id="purchaseAmount"
                  type="number"
                  value={purchaseFormValues.amount}
                  onChange={(e) => setPurchaseFormValues({ ...purchaseFormValues, amount: e.target.value })}
                  className="col-span-3"
                  required
                  step="0.01"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="purchaseDate" className="text-right">Tarih</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !purchaseFormValues.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {purchaseFormValues.date ? format(purchaseFormValues.date, "dd MMMM yyyy", { locale: tr }) : <span>Tarih Seç</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={purchaseFormValues.date}
                      onSelect={(date) => setPurchaseFormValues({ ...purchaseFormValues, date: date || new Date() })}
                      initialFocus
                      locale={tr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="purchaseCurrency" className="text-right">Para Birimi</Label>
                <Select
                  value={purchaseFormValues.currency}
                  onValueChange={(value: Currency) => setPurchaseFormValues({ ...purchaseFormValues, currency: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Para Birimi Seç" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stockItem" className="text-right">Stok Kalemi</Label>
                <Select
                  value={purchaseFormValues.stockItemId || 'none'}
                  onValueChange={(value) => setPurchaseFormValues(prev => ({ ...prev, stockItemId: value === 'none' ? undefined : value }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Stok Kalemi Seç (Opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Yok</SelectItem>
                    {availableStockItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {purchaseFormValues.stockItemId && purchaseFormValues.stockItemId !== 'none' && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="quantityPurchased" className="text-right">Miktar</Label>
                    <Input
                      id="quantityPurchased"
                      type="number"
                      value={purchaseFormValues.quantityPurchased}
                      onChange={(e) => setPurchaseFormValues(prev => ({ ...prev, quantityPurchased: e.target.value }))}
                      className="col-span-3"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="unitPrice" className="text-right">Birim Fiyatı</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      value={purchaseFormValues.unitPrice}
                      onChange={(e) => setPurchaseFormValues(prev => ({ ...prev, unitPrice: e.target.value }))}
                      className="col-span-3"
                      step="0.01"
                      required
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">İptal</Button>
              </DialogClose>
              <Button type="submit">{editingPurchase ? 'Kaydet' : 'Ekle'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment To Supplier Modal */}
      <Dialog open={showPaymentToSupplierModal} onOpenChange={setShowPaymentToSupplierModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingPaymentToSupplier ? 'Ödeme İşlemini Düzenle' : 'Yeni Ödeme Yap'}</DialogTitle>
            <DialogDescription>
              Tedarikçiye ait {editingPaymentToSupplier ? 'ödeme işlemini düzenleyin' : 'yeni bir ödeme işlemi ekleyin'}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handlePaymentToSupplierFormSubmit(); }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentAmount" className="text-right">Miktar</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentToSupplierFormValues.amount}
                  onChange={(e) => setPaymentToSupplierFormValues({ ...paymentToSupplierFormValues, amount: e.target.value })}
                  className="col-span-3"
                  required
                  step="0.01"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentDate" className="text-right">Tarih</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !paymentToSupplierFormValues.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paymentToSupplierFormValues.date ? format(paymentToSupplierFormValues.date, "dd MMMM yyyy", { locale: tr }) : <span>Tarih Seç</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={paymentToSupplierFormValues.date}
                      onSelect={(date) => setPaymentToSupplierFormValues({ ...paymentToSupplierFormValues, date: date || new Date() })}
                      initialFocus
                      locale={tr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentMethod" className="text-right">Ödeme Yöntemi</Label>
                <Input
                  id="paymentMethod"
                  value={paymentToSupplierFormValues.method}
                  onChange={(e) => setPaymentToSupplierFormValues({ ...paymentToSupplierFormValues, method: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentCurrency" className="text-right">Para Birimi</Label>
                <Select
                  value={paymentToSupplierFormValues.currency}
                  onValueChange={(value: Currency) => setPaymentToSupplierFormValues({ ...paymentToSupplierFormValues, currency: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Para Birimi Seç" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">İptal</Button>
              </DialogClose>
              <Button type="submit">{editingPaymentToSupplier ? 'Kaydet' : 'Ekle'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contact History Modal */}
      <Dialog open={showContactHistoryModal} onOpenChange={setShowContactHistoryModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingContactHistoryItem ? 'İletişim Geçmişini Düzenle' : 'Yeni İletişim Kaydı Ekle'}</DialogTitle>
            <DialogDescription>
              Tedarikçiye ait {editingContactHistoryItem ? 'iletişim kaydını düzenleyin' : 'yeni bir iletişim kaydı ekleyin'}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleContactHistorySubmit(); }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contactDate" className="text-right">Tarih</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !contactHistoryFormValues.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {contactHistoryFormValues.date ? format(contactHistoryFormValues.date, "dd MMMM yyyy", { locale: tr }) : <span>Tarih Seç</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={contactHistoryFormValues.date}
                      onSelect={(date) => setContactHistoryFormValues({ ...contactHistoryFormValues, date: date || new Date() })}
                      initialFocus
                      locale={tr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contactType" className="text-right">Tip</Label>
                <Select
                  value={contactHistoryFormValues.type}
                  onValueChange={(value: 'phone' | 'email' | 'meeting' | 'other') => setContactHistoryFormValues({ ...contactHistoryFormValues, type: value })}
                >
                  <SelectTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {contactHistoryFormValues.type}
                    </Button>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Telefon</SelectItem>
                    <SelectItem value="email">E-posta</SelectItem>
                    <SelectItem value="meeting">Toplantı</SelectItem>
                    <SelectItem value="other">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="summary" className="text-right">Özet</Label>
                <Input
                  id="summary"
                  value={contactHistoryFormValues.summary}
                  onChange={(e) => setContactHistoryFormValues({ ...contactHistoryFormValues, summary: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">Notlar</Label>
                <Textarea
                  id="notes"
                  value={contactHistoryFormValues.notes}
                  onChange={(e) => setContactHistoryFormValues({ ...contactHistoryFormValues, notes: e.target.value })}
                  className="col-span-3"
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">İptal</Button>
              </DialogClose>
              <Button type="submit">{editingContactHistoryItem ? 'Kaydet' : 'Ekle'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Görevi Düzenle' : 'Yeni Görev Ekle'}</DialogTitle>
            <DialogDescription>
              Tedarikçiye ait {editingTask ? 'görevi düzenleyin' : 'yeni bir görev ekleyin'}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleTaskSubmit(); }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taskDescription" className="text-right">Açıklama</Label>
                <Textarea
                  id="taskDescription"
                  value={taskFormValues.description}
                  onChange={(e) => setTaskFormValues({ ...taskFormValues, description: e.target.value })}
                  className="col-span-3"
                  required
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taskDueDate" className="text-right">Son Tarih</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !taskFormValues.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {taskFormValues.dueDate ? format(taskFormValues.dueDate, "dd MMMM yyyy", { locale: tr }) : <span>Tarih Seç (Opsiyonel)</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={taskFormValues.dueDate}
                      onSelect={(date) => setTaskFormValues({ ...taskFormValues, dueDate: date || undefined })}
                      initialFocus
                      locale={tr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taskStatus" className="text-right">Durum</Label>
                <Select
                  value={taskFormValues.status}
                  onValueChange={(value: 'pending' | 'completed' | 'in-progress') => setTaskFormValues({ ...taskFormValues, status: value })}
                >
                  <SelectTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {taskFormValues.status === 'pending' ? 'Bekliyor' : taskFormValues.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'}
                    </Button>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Bekliyor</SelectItem>
                    <SelectItem value="in-progress">Devam Ediyor</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">İptal</Button>
              </DialogClose>
              <Button type="submit">{editingTask ? 'Kaydet' : 'Ekle'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
