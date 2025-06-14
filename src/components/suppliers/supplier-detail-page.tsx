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
  deleteSupplier as storageDeleteSupplier,
  updateContactHistory as storageUpdateContactHistory,
  addContactHistory as storageAddContactHistory,
  getContactHistory,
  getSupplierTasks,
  addSupplierTask,
  updateSupplierTask,
  deleteSupplierTask,
  getPurchases,
  getPaymentsToSuppliers
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
import { PlusCircle, Trash2, Edit3, DollarSign, ShoppingCart, CalendarIcon, FileText, Printer, History, ClipboardList, Download, Bold, Italic, List, ListOrdered, Strikethrough, Underline as UnderlineIcon } from 'lucide-react';
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
  description?: string;
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

type UnifiedTransactionClient = (Purchase & { transactionType: 'purchase' }) | 
                              (PaymentToSupplier & { transactionType: 'paymentToSupplier' });

export function SupplierDetailPageClient({ supplier: initialSupplier, initialPurchases, initialPaymentsToSupplier, user }: SupplierDetailPageClientProps) {
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<Supplier>(initialSupplier);
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [paymentsToSupplier, setPaymentsToSupplier] = useState<PaymentToSupplier[]>(initialPaymentsToSupplier);
  const [availableStockItems, setAvailableStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
  const [contactHistory, setContactHistory] = useState<ContactHistoryItem[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskFormValues, setTaskFormValues] = useState<SupplierTaskFormValues>(EMPTY_TASK_FORM_VALUES);
  const [editingTask, setEditingTask] = useState<SupplierTask | null>(null);
  const [tasks, setTasks] = useState<SupplierTask[]>([]);
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

  const getStockItemName = useCallback((stockItemId: string) => {
    return stockItemDisplayNames[stockItemId] || 'Bilinmeyen Ürün';
  }, [stockItemDisplayNames]);

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

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTransactions, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);

  const monthlyStats = useMemo(() => {
    const months = eachMonthOfInterval({
      start: startOfMonth(new Date(new Date().getFullYear(), 0, 1)),
      end: endOfMonth(new Date()),
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthPurchases = purchases.filter(p => {
        const purchaseDate = new Date(p.date);
        return purchaseDate >= monthStart && purchaseDate <= monthEnd;
      });
      const monthPayments = paymentsToSupplier.filter(p => {
        const paymentDate = new Date(p.date);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      });

      return {
        month: format(month, 'MMM yyyy', { locale: tr }),
        alışlar: monthPurchases.reduce((sum, p) => sum + p.amount, 0),
        ödemeler: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      };
    });
  }, [purchases, paymentsToSupplier]);

  const transactionTypeDistribution = useMemo(() => {
    const total = purchases.length + paymentsToSupplier.length;
    return [
      {
        name: 'Alışlar',
        value: purchases.length,
        percentage: (purchases.length / total) * 100,
      },
      {
        name: 'Ödemeler',
        value: paymentsToSupplier.length,
        percentage: (paymentsToSupplier.length / total) * 100,
      },
    ];
  }, [purchases, paymentsToSupplier]);

  useEffect(() => {
    const fetchStockItems = async () => {
      if (!user) return;
      try {
        const items = await getStockItems(user.uid);
        setAvailableStockItems(items);
      } catch (error) {
        console.error('Error fetching stock items:', error);
        toast({
          title: 'Hata',
          description: 'Stok ürünleri yüklenirken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    };

    fetchStockItems();
  }, [user, toast]);

  useEffect(() => {
    const fetchDisplayNames = async () => {
      if (!user) return;
      try {
        const names: Record<string, string> = {};
        for (const item of availableStockItems) {
          names[item.id] = item.name;
        }
        setStockItemDisplayNames(names);
      } catch (error) {
        console.error('Error fetching stock item names:', error);
      }
    };

    fetchDisplayNames();
  }, [user, availableStockItems]);

  const formatCurrency = (amount: number, currency: Currency): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handlePurchaseFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handlePurchaseFormSubmit çağrıldı. purchaseFormValues:", purchaseFormValues);
    if (!user || !supplier.id) return;

    try {
      const amount = parseFloat(purchaseFormValues.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: 'Hata',
          description: 'Geçerli bir tutar giriniz.',
          variant: 'destructive',
        });
        return;
      }

      if (purchaseFormValues.stockItemId && purchaseFormValues.stockItemId !== 'none') {
        const quantity = parseFloat(purchaseFormValues.quantityPurchased || '0');
        const unitPrice = parseFloat(purchaseFormValues.unitPrice || '0');

        if (isNaN(quantity) || quantity <= 0) {
          toast({
            title: 'Hata',
            description: 'Geçerli bir miktar giriniz.',
            variant: 'destructive',
          });
          return;
        }

        if (isNaN(unitPrice) || unitPrice <= 0) {
          toast({
            title: 'Hata',
            description: 'Geçerli bir birim fiyat giriniz.',
            variant: 'destructive',
          });
          return;
        }
      }

      const purchaseData: Purchase = {
        id: editingPurchase?.id || crypto.randomUUID(),
        supplierId: supplier.id,
        amount,
        date: formatISO(purchaseFormValues.date),
        currency: purchaseFormValues.currency,
        stockItemId: purchaseFormValues.stockItemId === 'none' ? null : purchaseFormValues.stockItemId,
        quantityPurchased: purchaseFormValues.quantityPurchased ? (isNaN(parseFloat(purchaseFormValues.quantityPurchased)) ? null : parseFloat(purchaseFormValues.quantityPurchased)) : null,
        unitPrice: purchaseFormValues.unitPrice ? (isNaN(parseFloat(purchaseFormValues.unitPrice)) ? null : parseFloat(purchaseFormValues.unitPrice)) : null,
        description: purchaseFormValues.description || (purchaseFormValues.stockItemId && purchaseFormValues.stockItemId !== 'none'
          ? `${getStockItemName(purchaseFormValues.stockItemId)} - ${purchaseFormValues.quantityPurchased} adet`
          : 'Manuel alış'),
        transactionType: 'purchase',
        category: 'odeme',
        tags: [],
        createdAt: editingPurchase?.createdAt || formatISO(new Date()),
        updatedAt: formatISO(new Date()),
      };

      if (editingPurchase) {
        await storageUpdatePurchase(user.uid, purchaseData);
        setPurchases(purchases.map(p => p.id === editingPurchase.id ? purchaseData : p));
        toast({
          title: 'Başarılı',
          description: 'Alış başarıyla güncellendi.',
        });
      } else {
        const newPurchase = await addPurchase(user.uid, purchaseData);
        setPurchases(prevPurchases => [...prevPurchases, newPurchase]);
        toast({
          title: 'Başarılı',
          description: 'Alış başarıyla eklendi.',
        });
      }

      setShowPurchaseModal(false);
      setPurchaseFormValues(EMPTY_PURCHASE_FORM_VALUES);
      setEditingPurchase(null);
    } catch (error) {
      console.error('Error saving purchase:', error);
      toast({
        title: 'Hata',
        description: 'Alış kaydedilirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

  const handlePaymentToSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supplier.id) return;

    try {
      const amount = parseFloat(paymentToSupplierFormValues.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: 'Hata',
          description: 'Geçerli bir tutar giriniz.',
          variant: 'destructive',
        });
        return;
      }

      const paymentData: PaymentToSupplier = {
        id: editingPaymentToSupplier?.id || crypto.randomUUID(),
        supplierId: supplier.id,
        amount,
        date: formatISO(paymentToSupplierFormValues.date),
        currency: paymentToSupplierFormValues.currency,
        method: paymentToSupplierFormValues.method,
        referenceNumber: paymentToSupplierFormValues.referenceNumber || null,
        description: `${paymentToSupplierFormValues.method} ile ödeme`,
        transactionType: 'paymentToSupplier',
        category: 'odeme',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingPaymentToSupplier) {
        await storageUpdatePaymentToSupplier(user.uid, paymentData);
        setPaymentsToSupplier(paymentsToSupplier.map(p => p.id === editingPaymentToSupplier.id ? paymentData : p));
        toast({
          title: 'Başarılı',
          description: 'Ödeme başarıyla güncellendi.',
        });
      } else {
        await addPaymentToSupplier(user.uid, paymentData);
        setPaymentsToSupplier([...paymentsToSupplier, paymentData]);
        toast({
          title: 'Başarılı',
          description: 'Ödeme başarıyla eklendi.',
        });
      }

      setShowPaymentToSupplierModal(false);
      setPaymentToSupplierFormValues(EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES);
      setEditingPaymentToSupplier(null);
    } catch (error) {
      console.error('Error saving payment:', error);
      toast({
        title: 'Hata',
        description: 'Ödeme kaydedilirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

  const safeFormatDate = (dateString: string, formatString: string = "d MMMM yyyy, HH:mm") => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) {
        return 'Geçersiz tarih';
      }
      return format(date, formatString, { locale: tr });
    } catch (error) {
      return 'Geçersiz tarih';
    }
  };

  const renderTransactionDetail = (item: UnifiedTransactionClient) => {
    if (item.transactionType === 'purchase') {
      const purchase = item as Purchase;
      return (
        <div className="space-y-2">
          <p className="font-medium">{purchase.description}</p>
          {purchase.stockItemId && (
            <div className="text-sm text-muted-foreground">
              <p>Ürün: {getStockItemName(purchase.stockItemId)}</p>
              <p>Miktar: {purchase.quantityPurchased}</p>
              <p>Birim Fiyat: {formatCurrency(purchase.unitPrice || 0, purchase.currency)}</p>
            </div>
          )}
        </div>
      );
    } else {
      const payment = item as PaymentToSupplier;
      return (
        <div className="space-y-2">
          <p className="font-medium">{payment.description}</p>
          <div className="text-sm text-muted-foreground">
            <p>Ödeme Yöntemi: {payment.method}</p>
            {payment.referenceNumber && (
              <p>Referans No: {payment.referenceNumber}</p>
            )}
          </div>
        </div>
      );
    }
  };

  const exportToCSV = (transactions: UnifiedTransactionClient[], supplierName: string) => {
    const headers = ['Tarih', 'İşlem Tipi', 'Tutar', 'Para Birimi', 'Açıklama'];
    const rows = transactions.map(t => [
      safeFormatDate(t.date, 'dd.MM.yyyy'),
      t.transactionType === 'purchase' ? 'Alış' : 'Ödeme',
      t.amount.toString(),
      t.currency,
      t.transactionType === 'purchase' ? (t as Purchase).description : (t as PaymentToSupplier).description,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
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

  const handleAddTag = (transactionId: string, tagName: string) => {
    // Implementation for adding tags
  };

  const handleRemoveTag = (transactionId: string, tagId: string) => {
    // Implementation for removing tags
  };

  const handleSupplierUpdate = async (updatedSupplier: Supplier) => {
    if (!user) return;
    await storageUpdateSupplier(user.uid, updatedSupplier);
    setSupplier(updatedSupplier);
    toast({
      title: 'Başarılı',
      description: 'Tedarikçi bilgileri güncellendi.',
    });
  };

  const handleContactHistorySubmit = async (formValues: ContactHistoryFormValues) => {
    if (!user || !supplier.id) return;
    try {
      const contactHistoryData: ContactHistoryItem = {
        id: editingContactHistoryItem?.id || crypto.randomUUID(),
        supplierId: supplier.id,
        date: formatISO(formValues.date),
        type: formValues.type,
        summary: formValues.summary,
        notes: formValues.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingContactHistoryItem) {
        await storageUpdateContactHistory(user.uid, contactHistoryData);
        setContactHistory(contactHistory.map(item => 
          item.id === editingContactHistoryItem.id ? contactHistoryData : item
        ));
        toast({
          title: 'Başarılı',
          description: 'İletişim kaydı güncellendi.',
        });
      } else {
        await storageAddContactHistory(user.uid, contactHistoryData);
        setContactHistory([...contactHistory, contactHistoryData]);
        toast({
          title: 'Başarılı',
          description: 'İletişim kaydı eklendi.',
        });
      }

      setShowContactHistoryModal(false);
      setContactHistoryFormValues(EMPTY_CONTACT_HISTORY_FORM_VALUES);
      setEditingContactHistoryItem(null);
    } catch (error) {
      console.error('Error saving contact history:', error);
      toast({
        title: 'Hata',
        description: 'İletişim kaydı kaydedilirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

  const handleTaskSubmit = async (formValues: SupplierTaskFormValues) => {
    if (!user || !supplier.id) return;
    try {
      const taskData: SupplierTask = {
        id: editingTask?.id || crypto.randomUUID(),
        supplierId: supplier.id,
        description: formValues.description,
        dueDate: formValues.dueDate ? formatISO(formValues.dueDate, { representation: 'date' }) : undefined,
        status: formValues.status,
        createdAt: editingTask?.createdAt || formatISO(new Date()),
        updatedAt: formatISO(new Date()),
      };

      if (editingTask) {
        await updateSupplierTask(user.uid, taskData);
        setTasks(tasks.map(task => 
          task.id === editingTask.id ? taskData : task
        ));
        toast({
          title: 'Başarılı',
          description: 'Görev başarıyla güncellendi.',
        });
      } else {
        const newTask = await addSupplierTask(user.uid, taskData);
        setTasks([...tasks, newTask]);
        toast({
          title: 'Başarılı',
          description: 'Görev başarıyla eklendi.',
        });
      }

      setShowTaskModal(false);
      setTaskFormValues(EMPTY_TASK_FORM_VALUES);
      setEditingTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: 'Hata',
        description: 'Görev kaydedilirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [loadedPurchases, loadedPayments] = await Promise.all([
        getPurchases(user.uid, supplier.id),
        getPaymentsToSuppliers(user.uid, supplier.id)
      ]);
      setPurchases(loadedPurchases);
      setPaymentsToSupplier(loadedPayments);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Hata",
        description: "Veriler yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, supplier.id, toast]);

  const calculateBalancesForSupplier = (supplierId: string): Record<Currency, number> => {
    const supplierPurchases = purchases.filter(p => p.supplierId === supplierId);
    const supplierPayments = paymentsToSupplier.filter(p => p.supplierId === supplierId);
    
    const balances: Record<Currency, number> = { TRY: 0, USD: 0 };

    supplierPurchases.forEach(purchase => {
      balances[purchase.currency] = (balances[purchase.currency] || 0) + purchase.amount;
    });
    supplierPayments.forEach(payment => {
      balances[payment.currency] = (balances[payment.currency] || 0) - payment.amount;
    });
    return balances;
  };

  if (!supplier) {
    return <div className="text-center py-8">Tedarikçi bulunamadı.</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{supplier.name}</h1>
          <p className="text-muted-foreground mt-1">
            {supplier.address && <span className="block">{supplier.address}</span>}
            {supplier.phone && <span className="block">{supplier.phone}</span>}
            {supplier.email && <span className="block">{supplier.email}</span>}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowEditSupplierModal(true)}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Düzenle
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeletingSupplier(supplier.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Sil
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Toplam Alış</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPurchases, supplier.defaultCurrency || 'TRY')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Toplam Ödeme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPayments, supplier.defaultCurrency || 'TRY')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bakiye</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              balance > 0 ? "text-red-600" : balance < 0 ? "text-green-600" : ""
            )}>
              {formatCurrency(balance, supplier.defaultCurrency || 'TRY')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>İşlemler</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowPurchaseModal(true)}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Alış Ekle
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPaymentToSupplierModal(true)}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Ödeme Ekle
              </Button>
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
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unifiedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {format(parseISO(transaction.date), 'dd.MM.yyyy')}
                  </TableCell>
                  <TableCell>
                    {transaction.transactionType === 'purchase' ? 'Alış' : 'Ödeme'}
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className={cn(
                    "text-right font-mono",
                    transaction.transactionType === 'purchase' ? "text-red-600" : "text-green-600"
                  )}>
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (transaction.transactionType === 'purchase') {
                          setEditingPurchase(transaction);
                          setShowPurchaseModal(true);
                        } else {
                          setEditingPaymentToSupplier(transaction);
                          setShowPaymentToSupplierModal(true);
                        }
                      }}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (transaction.transactionType === 'purchase') {
                          setDeletingPurchaseId(transaction.id);
                        } else {
                          setDeletingPaymentToSupplierId(transaction.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Tabs defaultValue="transactions" className="mt-8">
        <TabsList>
          <TabsTrigger value="transactions">İşlemler</TabsTrigger>
          <TabsTrigger value="notes">Notlar</TabsTrigger>
          <TabsTrigger value="contact-history">İletişim Geçmişi</TabsTrigger>
          <TabsTrigger value="tasks">Görevler</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>İşlemler</CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPurchaseModal(true)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Alış Ekle
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowPaymentToSupplierModal(true)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ödeme Ekle
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Transaction list content */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Notlar</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Notes content */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact-history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>İletişim Geçmişi</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setShowContactHistoryModal(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  İletişim Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Contact history content */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Görevler</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setShowTaskModal(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Görev Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Tasks content */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false);
          setPurchaseFormValues(EMPTY_PURCHASE_FORM_VALUES);
          setEditingPurchase(null);
        }}
        onSubmit={handlePurchaseFormSubmit}
        formValues={purchaseFormValues}
        setFormValues={setPurchaseFormValues}
        availableStockItems={availableStockItems}
        stockItemDisplayNames={stockItemDisplayNames}
      />

      <PaymentToSupplierModal
        isOpen={showPaymentToSupplierModal}
        onClose={() => {
          setShowPaymentToSupplierModal(false);
          setPaymentToSupplierFormValues(EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES);
          setEditingPaymentToSupplier(null);
        }}
        onSubmit={handlePaymentToSupplierSubmit}
        formValues={paymentToSupplierFormValues}
        setFormValues={setPaymentToSupplierFormValues}
      />

      <EditSupplierModal
        isOpen={showEditSupplierModal}
        onClose={() => setShowEditSupplierModal(false)}
        supplier={supplier}
        onSave={handleSupplierUpdate}
      />

      <DeleteConfirmationModal
        isOpen={!!deletingPurchaseId}
        onClose={() => setDeletingPurchaseId(null)}
        onConfirm={async () => {
          if (deletingPurchaseId && user) {
            await storageDeletePurchase(user!.uid, deletingPurchaseId);
            setPurchases(purchases.filter(p => p.id !== deletingPurchaseId));
            setDeletingPurchaseId(null);
          }
        }}
        title="Alışı Sil"
        description="Bu alışı silmek istediğinizden emin misiniz?"
      />

      <DeleteConfirmationModal
        isOpen={!!deletingPaymentToSupplierId}
        onClose={() => setDeletingPaymentToSupplierId(null)}
        onConfirm={async () => {
          if (deletingPaymentToSupplierId && user) {
            await storageDeletePaymentToSupplier(user!.uid, deletingPaymentToSupplierId);
            setPaymentsToSupplier(paymentsToSupplier.filter(p => p.id !== deletingPaymentToSupplierId));
            setDeletingPaymentToSupplierId(null);
          }
        }}
        title="Ödemeyi Sil"
        description="Bu ödemeyi silmek istediğinizden emin misiniz?"
      />

      <DeleteConfirmationModal
        isOpen={!!deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={async () => {
          if (deletingSupplier && user) {
            await storageDeleteSupplier(user!.uid, deletingSupplier);
            window.location.href = '/suppliers';
          }
        }}
        title="Tedarikçiyi Sil"
        description="Bu tedarikçiyi silmek istediğinizden emin misiniz?"
      />

      <ContactHistoryModal
        isOpen={showContactHistoryModal}
        onClose={() => {
          setShowContactHistoryModal(false);
          setContactHistoryFormValues(EMPTY_CONTACT_HISTORY_FORM_VALUES);
          setEditingContactHistoryItem(null);
        }}
        onSubmit={handleContactHistorySubmit}
        formValues={contactHistoryFormValues}
        setFormValues={setContactHistoryFormValues}
      />

      <TaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setTaskFormValues(EMPTY_TASK_FORM_VALUES);
          setEditingTask(null);
        }}
        onSubmit={handleTaskSubmit}
        formValues={taskFormValues}
        setFormValues={setTaskFormValues}
      />
    </div>
  );
}
