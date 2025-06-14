// src/components/suppliers/supplier-detail-page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Supplier, Purchase, PaymentToSupplier, Currency, UnifiedTransaction as AppUnifiedTransaction, StockItem, Price, ContactHistoryItem, SupplierTask, PurchaseFormValues, PaymentToSupplierFormValues } from '@/lib/types';
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
import { PlusCircle, Trash2, Edit3, DollarSign, ShoppingCart, CalendarIcon, FileText, Printer, History, ClipboardList, Download, Bold, Italic, List, ListOrdered, Strikethrough, Underline as UnderlineIcon, Receipt } from 'lucide-react';
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
import { PrintView } from "./print-view";

interface SupplierDetailPageClientProps {
  supplier: Supplier;
  initialPurchases: Purchase[];
  initialPaymentsToSupplier: PaymentToSupplier[];
  user: { uid: string } | null;
}

const EMPTY_PURCHASE_FORM_VALUES: PurchaseFormValues = {
  amount: '',
  date: new Date(),
  currency: 'TRY',
  stockItemId: undefined,
  description: '',
  quantityPurchased: undefined,
  unitPrice: undefined,
};

const EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES: PaymentToSupplierFormValues = {
  amount: '',
  date: new Date(),
  method: 'nakit',
  currency: 'TRY',
  referenceNumber: '',
  description: '',
  checkDate: null,
  checkSerialNumber: null,
};

const EMPTY_CONTACT_HISTORY_FORM_VALUES: ContactHistoryItem = {
  id: '',
  date: formatISO(new Date()),
  type: 'other',
  summary: '',
  notes: '',
  createdAt: formatISO(new Date()),
  updatedAt: formatISO(new Date()),
};

const EMPTY_TASK_FORM_VALUES: SupplierTask = {
  id: '',
  description: '',
  dueDate: undefined,
  status: 'pending',
  createdAt: formatISO(new Date()),
  updatedAt: formatISO(new Date()),
};

type UnifiedTransactionClient = AppUnifiedTransaction; 

export function SupplierDetailPageClient({ supplier: initialSupplier, initialPurchases, initialPaymentsToSupplier, user }: SupplierDetailPageClientProps) {
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<Supplier>(initialSupplier);
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [paymentsToSupplier, setPaymentsToSupplier] = useState<PaymentToSupplier[]>(initialPaymentsToSupplier);

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
  const [contactHistoryFormValues, setContactHistoryFormValues] = useState<ContactHistoryItem>(EMPTY_CONTACT_HISTORY_FORM_VALUES);
  const [editingContactHistoryItem, setEditingContactHistoryItem] = useState<ContactHistoryItem | null>(null);
  const [contactHistory, setContactHistory] = useState<ContactHistoryItem[]>([]);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskFormValues, setTaskFormValues] = useState<SupplierTask>(EMPTY_TASK_FORM_VALUES);
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
  const [showPrintView, setShowPrintView] = useState(false);

  const [availableStockItems, setAvailableStockItems] = useState<StockItem[]>([]);

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

  const getStockItemName = useCallback(async (stockItemId?: string): Promise<string> => {
    if (!stockItemId || !user?.uid) return 'Bilinmeyen Stok Ürünü';
    const item = await getStockItemById(user.uid, stockItemId);
    return item?.name || 'Bilinmeyen Stok Ürünü';
  }, [user?.uid]);

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
      if (user?.uid) {
        const items = await getStockItems(user.uid);
        setAvailableStockItems(items);
        const names: Record<string, string> = {};
        items.forEach(item => {
          names[item.id] = item.name;
        });
        setStockItemDisplayNames(names);
      }
    };
    fetchStockItems();
  }, [user?.uid]);

  useEffect(() => {
    setSupplier(initialSupplier);
    setPurchases(initialPurchases);
    setPaymentsToSupplier(initialPaymentsToSupplier);
  }, [initialSupplier, initialPurchases, initialPaymentsToSupplier]);

  useEffect(() => {
    const fetchFreshSupplier = async () => {
      if (supplier?.id && user?.uid) {
        const freshSupplier = await getSupplierById(user.uid, supplier.id);
        if (freshSupplier) {
          setSupplier(freshSupplier);
        }
      }
    };
    fetchFreshSupplier();
    if (supplier?.name) {
      document.title = `${supplier.name} | Tedarikçi Detayları | ERMAY`;
    }
  }, [supplier?.id, supplier?.name, user]);

  useEffect(() => {
    const quantity = parseFloat(purchaseFormValues.quantityPurchased || '0');
    const price = parseFloat(purchaseFormValues.unitPrice || '0');
    if (purchaseFormValues.stockItemId !== null) {
      if (!isNaN(quantity) && !isNaN(price) && quantity > 0 && price >= 0) {
        setPurchaseFormValues(prev => ({ ...prev, amount: (quantity * price).toFixed(2) }));
      } else {
        setPurchaseFormValues(prev => ({ ...prev, amount: ''}));
      }
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
    console.log("Opening Purchase Modal");
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

  const handleOpenEditPurchaseModal = (purchase: Purchase) => {
    console.log("handleOpenEditPurchaseModal called with purchase:", purchase);
    setEditingPurchase(purchase);
    setPurchaseFormValues({
      amount: purchase.amount.toString(),
      date: parseISO(purchase.date),
      currency: purchase.currency,
      stockItemId: purchase.stockItemId === '' ? undefined : purchase.stockItemId, // Eğer boş string ise undefined yap
      description: purchase.description || '',
      quantityPurchased: purchase.quantityPurchased?.toString(),
      unitPrice: purchase.unitPrice?.toString(),
    });
    setShowPurchaseModal(true);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFloat(purchaseFormValues.amount);
      const date = formatISO(purchaseFormValues.date);

      if (editingPurchase) {
        const updatedPurchase: Purchase = {
          ...editingPurchase,
          amount,
          date,
          currency: purchaseFormValues.currency,
          stockItemId: purchaseFormValues.stockItemId === undefined ? null : purchaseFormValues.stockItemId, // undefined ise null yap
          description: purchaseFormValues.description || '',
          updatedAt: formatISO(new Date())
        };

        await storageUpdatePurchase(user.uid, updatedPurchase);
        setPurchases(purchases.map(p => (p.id === editingPurchase.id ? updatedPurchase : p)));
        toast({
          title: "Başarılı",
          description: "Satın alma güncellendi.",
        });
      } else {
        const newPurchase: Omit<Purchase, 'id'> = {
          supplierId: supplier.id,
          amount,
          date,
          currency: purchaseFormValues.currency,
          stockItemId: purchaseFormValues.stockItemId === undefined ? null : purchaseFormValues.stockItemId, // undefined ise null yap
          description: purchaseFormValues.description || '',
          transactionType: 'purchase',
          category: 'satis',
          tags: [],
          createdAt: formatISO(new Date()),
          updatedAt: formatISO(new Date())
        };

        const addedPurchase = await addPurchase(user.uid, newPurchase);
        setPurchases(prev => [...prev, addedPurchase]);
        toast({
          title: "Başarılı",
          description: "Yeni satın alma eklendi.",
        });
      }
      setShowPurchaseModal(false);
      setPurchaseFormValues(EMPTY_PURCHASE_FORM_VALUES);
      setEditingPurchase(null);
    } catch (error) {
      console.error("Satın alma kaydedilirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Satın alma kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePurchase = useCallback(async () => {
    if (!deletingPurchaseId || !user) return;
    try {
      await storageDeletePurchase(user.uid, deletingPurchaseId);
      setPurchases(prev => prev.filter(p => p.id !== deletingPurchaseId));
      toast({ title: "Satın Alma Silindi", description: "Satın alma başarıyla silindi." });
      setDeletingPurchaseId(null);
      await refreshSupplierData();
    } catch (error) {
      console.error("Satın alma silinirken hata:", error);
      toast({ title: "Hata", description: "Satın alma silinirken bir sorun oluştu.", variant: "destructive" });
    }
  }, [deletingPurchaseId, toast, refreshSupplierData, user]);

  const handleOpenAddPaymentToSupplierModal = useCallback(() => {
    console.log("Opening Payment To Supplier Modal");
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
      description: payment.description || '',
      checkDate: payment.checkDate ? parseISO(payment.checkDate) : null,
      checkSerialNumber: payment.checkSerialNumber || null,
    });
    setShowPaymentToSupplierModal(true);
  }, []);

  const handlePaymentToSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFloat(paymentToSupplierFormValues.amount);
      const date = formatISO(paymentToSupplierFormValues.date);

      if (editingPaymentToSupplier) {
        const updatedPayment: PaymentToSupplier = {
          ...editingPaymentToSupplier,
          amount,
          date,
          method: paymentToSupplierFormValues.method,
          currency: paymentToSupplierFormValues.currency,
          referenceNumber: paymentToSupplierFormValues.referenceNumber || null,
          description: paymentToSupplierFormValues.description || '',
          checkDate: paymentToSupplierFormValues.method === 'cek' && paymentToSupplierFormValues.checkDate ? formatISO(paymentToSupplierFormValues.checkDate) : null,
          checkSerialNumber: paymentToSupplierFormValues.method === 'cek' ? (paymentToSupplierFormValues.checkSerialNumber || null) : null,
          updatedAt: formatISO(new Date())
        };

        await storageUpdatePaymentToSupplier(user.uid, updatedPayment);
        setPaymentsToSupplier(paymentsToSupplier.map(p => (p.id === editingPaymentToSupplier.id ? updatedPayment : p)));
        toast({
          title: "Başarılı",
          description: "Ödeme güncellendi.",
        });
      } else {
        const newPayment: Omit<PaymentToSupplier, 'id'> = {
          supplierId: supplier.id,
          amount,
          date,
          method: paymentToSupplierFormValues.method,
          currency: paymentToSupplierFormValues.currency,
          referenceNumber: paymentToSupplierFormValues.referenceNumber || null,
          description: paymentToSupplierFormValues.description || '',
          checkDate: paymentToSupplierFormValues.method === 'cek' && paymentToSupplierFormValues.checkDate ? formatISO(paymentToSupplierFormValues.checkDate) : null,
          checkSerialNumber: paymentToSupplierFormValues.method === 'cek' ? (paymentToSupplierFormValues.checkSerialNumber || null) : null,
          transactionType: 'paymentToSupplier',
          category: 'odeme',
          tags: [],
          createdAt: formatISO(new Date()),
          updatedAt: formatISO(new Date())
        };

        const addedPayment = await addPaymentToSupplier(user.uid, newPayment);
        setPaymentsToSupplier(prev => [...prev, addedPayment]);
        toast({
          title: "Başarılı",
          description: "Yeni ödeme eklendi.",
        });
      }
      setShowPaymentToSupplierModal(false);
      setPaymentToSupplierFormValues(EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES);
      setEditingPaymentToSupplier(null);
    } catch (error) {
      console.error("Ödeme kaydederken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Ödeme kaydedilirken bir sorun oluştu.",
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

  const safeFormatDate = (dateString: string, formatString: string) => {
    if (!dateString) return '-';
    const date = parseISO(dateString);
    return isValid(date) ? format(date, formatString, { locale: tr }) : '-';
  };

  const getStockItemNameForPurchaseForm = useCallback(async (stockItemId?: string): Promise<string> => {
    if (!stockItemId || stockItemId === 'none' || !user) return ""; 
    try {
      const stockItem = await getStockItemById(user.uid, stockItemId);
      return stockItem ? `${stockItem.name} (${stockItem.unit || 'Adet'})` : ""; 
    } catch (error) {
      console.error("Stok kalemi adı getirilirken hata:", error);
      return "";
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
    if (item.transactionType === 'purchase') {
      const purchaseItem = item as Purchase;
      return (
        <div className="flex flex-col">
          {purchaseItem.stockItemId && (
            <span className="text-sm text-muted-foreground">
              Stok: {stockItemDisplayNames[purchaseItem.stockItemId] || 'Bilinmeyen Ürün'}
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            Açıklama: {purchaseItem.description || '-'}
          </span>
        </div>
      );
    } else if (item.transactionType === 'paymentToSupplier') {
      const paymentItem = item as PaymentToSupplier;
      return (
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">
            Yöntem: {paymentItem.method}
          </span>
          <span className="text-sm text-muted-foreground">
            Referans: {paymentItem.referenceNumber || '-'}
          </span>
          <span className="text-sm text-muted-foreground">
            Açıklama: {paymentItem.description || '-'}
          </span>
          {paymentItem.method === 'cek' && paymentItem.checkDate && (
            <span className="text-sm text-muted-foreground">
              Çek Tarihi: {safeFormatDate(paymentItem.checkDate, 'dd.MM.yyyy')}
            </span>
          )}
          {paymentItem.method === 'cek' && paymentItem.checkSerialNumber && (
            <span className="text-sm text-muted-foreground">
              Çek Seri No: {paymentItem.checkSerialNumber}
            </span>
          )}
        </div>
      );
    }
    return null;
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

  const handleContactHistorySubmit = useCallback(async (formValues: ContactHistoryItem) => {
    if (!user || !supplier?.id) {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newContactHistoryItem: ContactHistoryItem = {
        id: crypto.randomUUID(),
        date: formatISO(formValues.date),
        type: formValues.type,
        summary: formValues.summary,
        notes: formValues.notes || undefined,
        createdAt: formatISO(new Date()),
        updatedAt: formatISO(new Date()),
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
      console.error("Error adding contact history:", error);
      toast({
        title: "Hata",
        description: "İletişim geçmişi eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  }, [user, supplier, toast]);

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

  const handleTaskFormSubmit = useCallback(async (formValues: SupplierTask) => {
    if (!user || !supplier?.id) return;
    try {
      const taskToSave = {
        ...formValues,
        dueDate: formValues.dueDate ? formatISO(formValues.dueDate, { representation: 'date' }) : undefined,
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
  }, [user, supplier, editingTask, toast]);

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
      t.transactionType === 'purchase' ? 'Satın Alma' : 'Ödeme',
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

      const monthPayments = paymentsToSupplier.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      });

      const totalPurchases = monthPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
      const totalPayments = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);

      return {
        month: format(month, 'MMM yyyy', { locale: tr }),
        satınAlmalar: totalPurchases,
        ödemeler: totalPayments,
      };
    });
  }, [purchases, paymentsToSupplier, dateRange]);

  const transactionTypeDistribution = useMemo(() => {
    const total = filteredAndSortedTransactions.length;
    if (total === 0) return [];

    const purchasesCount = filteredAndSortedTransactions.filter(t => t.transactionType === 'purchase').length;
    const paymentsCount = filteredAndSortedTransactions.filter(t => t.transactionType === 'paymentToSupplier').length;

    return [
      { name: 'Satın Almalar', value: purchasesCount, percentage: (purchasesCount / total) * 100 },
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

  const handleAddPaymentToSupplier = async (values: PaymentToSupplierFormValues) => {
    try {
      const amount = parseFloat(values.amount);

      const newPayment: PaymentToSupplier = {
        id: Math.random().toString(36).substr(2, 9),
        supplierId: supplier.id,
        amount: amount,
        date: formatISO(values.date),
        currency: values.currency,
        method: values.method,
        description: values.description || `${values.method} ile ödeme`,
        transactionType: 'paymentToSupplier',
        category: 'odeme',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(values.referenceNumber && { referenceNumber: values.referenceNumber }),
        ...(values.checkDate && { checkDate: formatISO(values.checkDate) }),
        ...(values.checkSerialNumber && { checkSerialNumber: values.checkSerialNumber }),
      };

      setPaymentsToSupplier(prevPayments => [...prevPayments, newPayment]);
      setShowPaymentToSupplierModal(false);
      toast({
        title: "Ödeme eklendi",
        description: "Yeni ödeme başarıyla eklendi.",
      });
    } catch (error) {
      console.error('Ödeme eklenirken hata:', error);
      toast({
        title: "Hata",
        description: "Ödeme eklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleEditSupplierSubmit = useCallback(async (updatedSupplier: Supplier) => {
    if (!user) {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    try {
      await storageUpdateSupplier(user.uid, updatedSupplier);
      setSupplier(updatedSupplier);
      setShowEditSupplierModal(false);
      toast({
        title: "Başarılı",
        description: "Tedarikçi bilgileri güncellendi.",
      });
    } catch (error) {
      console.error("Error updating supplier:", error);
      toast({
        title: "Hata",
        description: "Tedarikçi bilgileri güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
          <p className="text-muted-foreground mt-1">
            {supplier.email && <span className="block">{supplier.email}</span>}
            {supplier.phone && <span className="block">{supplier.phone}</span>}
            {supplier.address && <span className="block">{supplier.address}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open(`/suppliers/${supplier.id}/extract`, '_blank')}>
            <Receipt className="h-4 w-4 mr-2" />
            Ekstre Görüntüle
          </Button>
          <Button variant="outline" onClick={() => setShowEditSupplierModal(true)}>
            <Edit3 className="h-4 w-4 mr-2" />
            Düzenle
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Sil
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tedarikçiyi Sil</AlertDialogTitle>
                <AlertDialogDescription>
                  Bu tedarikçiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>İptal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => setDeletingSupplier(supplier.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sil
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Satın Alma</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPurchases, 'TRY')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Ödeme</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPayments, 'TRY')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bakiye</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              balance > 0 ? "text-red-500" : "text-green-500"
            )}>
              {formatCurrency(balance, 'TRY')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">İşlemler</TabsTrigger>
          <TabsTrigger value="notes">Notlar</TabsTrigger>
          <TabsTrigger value="contact-history">İletişim Geçmişi</TabsTrigger>
          <TabsTrigger value="tasks">Görevler</TabsTrigger>
          <TabsTrigger value="statement">Ekstre</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>İşlemler</CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleOpenAddPurchaseModal}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Satın Alma Ekle
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleOpenAddPaymentToSupplierModal}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ödeme Ekle
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
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
                        !dateRange?.from && !dateRange?.to && "text-muted-foreground"
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
                        <span>Tarih aralığı seçin</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
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
                <Select
                  value={sortOrder}
                  onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}
                >
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
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((item) => (
                      <TableRow key={`${item.transactionType}-${item.id}`}>
                        <TableCell>{safeFormatDate(item.date, 'dd.MM.yyyy')}</TableCell>
                        <TableCell>{item.transactionType === 'purchase' ? (
                          <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Satın Alma</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">Ödeme</Badge>
                        )}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amount, item.currency)}
                        </TableCell>
                        <TableCell>
                          {renderTransactionDetail(item)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (item.transactionType === 'purchase') {
                                setEditingPurchase(item as Purchase);
                                setPurchaseFormValues({
                                  amount: (item as Purchase).amount.toString(),
                                  date: parseISO((item as Purchase).date),
                                  currency: (item as Purchase).currency,
                                  stockItemId: (item as Purchase).stockItemId === '' ? undefined : (item as Purchase).stockItemId,
                                  description: (item as Purchase).description || '',
                                });
                                setShowPurchaseModal(true);
                              } else {
                                setEditingPaymentToSupplier(item as PaymentToSupplier);
                                setPaymentToSupplierFormValues({
                                  amount: (item as PaymentToSupplier).amount.toString(),
                                  date: parseISO((item as PaymentToSupplier).date),
                                  method: (item as PaymentToSupplier).method,
                                  currency: (item as PaymentToSupplier).currency,
                                  referenceNumber: (item as PaymentToSupplier).referenceNumber || '',
                                  description: (item as PaymentToSupplier).description || '',
                                  checkDate: (item as PaymentToSupplier).checkDate ? parseISO((item as PaymentToSupplier).checkDate) : null,
                                  checkSerialNumber: (item as PaymentToSupplier).checkSerialNumber || null,
                                });
                                setShowPaymentToSupplierModal(true);
                              }
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (item.transactionType === 'purchase') {
                                setDeletingPurchaseId(item.id);
                              } else {
                                setDeletingPaymentToSupplierId(item.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        İşlem bulunamadı.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
                  onClick={handleOpenAddContactHistoryModal}
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
                  onClick={handleOpenAddTaskModal}
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

        <TabsContent value="statement">
          <Card>
            <CardHeader>
              <CardTitle>Ekstre</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Export to CSV content */}
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
        onSubmit={handlePurchaseSubmit}
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
        onSave={handleEditSupplierSubmit}
      />

      <DeleteConfirmationModal
        isOpen={!!deletingPurchaseId}
        onClose={() => setDeletingPurchaseId(null)}
        onConfirm={handleDeletePurchase}
        title="Alışı Sil"
        description="Bu alışı silmek istediğinizden emin misiniz?"
      />

      <DeleteConfirmationModal
        isOpen={!!deletingPaymentToSupplierId}
        onClose={() => setDeletingPaymentToSupplierId(null)}
        onConfirm={handleDeletePaymentToSupplier}
        title="Ödemeyi Sil"
        description="Bu ödemeyi silmek istediğinizden emin misiniz?"
      />

      <DeleteConfirmationModal
        isOpen={!!deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={handleDeleteSupplier}
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
        onSubmit={handleTaskFormSubmit}
        formValues={taskFormValues}
        setFormValues={setTaskFormValues}
      />
    </div>
  );
}
