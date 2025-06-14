// src/components/suppliers/supplier-detail-page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Supplier, Purchase, PaymentToSupplier, Currency, UnifiedTransaction as AppUnifiedTransaction, StockItem, Price, ContactHistoryItem, SupplierTask, PurchaseFormValues, PaymentToSupplierFormValues, ContactHistoryFormValues, SupplierTaskFormValues } from '@/lib/types';
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
import { PlusCircle, Trash2, Edit3, DollarSign, ShoppingCart, CalendarIcon, FileText, Printer, History, ClipboardList, Download, Bold, Italic, List, ListOrdered, Strikethrough, Underline as UnderlineIcon, Receipt, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid, formatISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
    const fetchContactHistory = async () => {
      if (user?.uid && supplier?.id) {
        const history = await getContactHistory(user.uid, supplier.id);
        setContactHistory(history);
      }
    };
    fetchContactHistory();
  }, [user?.uid, supplier?.id]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (user?.uid && supplier?.id) {
        const fetchedTasks = await getSupplierTasks(user.uid, supplier.id);
        setTasks(fetchedTasks);
      }
    };
    fetchTasks();
  }, [user?.uid, supplier?.id]);

  const formatCurrency = (amount: number, currency: Currency): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleOpenAddPurchaseModal = useCallback(() => {
    setEditingPurchase(null);
    setPurchaseFormValues(EMPTY_PURCHASE_FORM_VALUES);
    setShowPurchaseModal(true);
  }, []);

  const handleOpenEditPurchaseModal = useCallback((purchase: Purchase) => {
    setEditingPurchase(purchase);
    setPurchaseFormValues({
      amount: purchase.amount.toString(),
      date: parseISO(purchase.date),
      currency: purchase.currency,
      stockItemId: purchase.stockItemId || undefined,
      description: purchase.description,
      quantityPurchased: purchase.quantityPurchased?.toString() || undefined,
      unitPrice: purchase.unitPrice?.toString() || undefined,
    });
    setShowPurchaseModal(true);
  }, []);

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supplier?.id) return;

    try {
      const amount = parseFloat(purchaseFormValues.amount);
      const quantityPurchased = purchaseFormValues.quantityPurchased ? parseFloat(purchaseFormValues.quantityPurchased) : undefined;
      const unitPrice = purchaseFormValues.unitPrice ? parseFloat(purchaseFormValues.unitPrice) : undefined;

      if (editingPurchase) {
        const updatedPurchase: Purchase = {
          ...editingPurchase,
          amount: amount,
          date: formatISO(purchaseFormValues.date),
          currency: purchaseFormValues.currency,
          stockItemId: purchaseFormValues.stockItemId === '' ? null : purchaseFormValues.stockItemId, // Convert empty string to null
          description: purchaseFormValues.description,
          quantityPurchased: quantityPurchased,
          unitPrice: unitPrice,
          updatedAt: new Date().toISOString(),
        };
        await storageUpdatePurchase(user.uid, updatedPurchase);
        setPurchases(prev => prev.map(p => p.id === updatedPurchase.id ? updatedPurchase : p));
        toast({
          title: "Satın alma güncellendi",
          description: "Satın alma kaydı başarıyla güncellendi.",
        });
      } else {
        const newPurchase: Purchase = {
          id: Math.random().toString(36).substr(2, 9),
          supplierId: supplier.id,
          amount: amount,
          date: formatISO(purchaseFormValues.date),
          currency: purchaseFormValues.currency,
          stockItemId: purchaseFormValues.stockItemId === '' ? null : purchaseFormValues.stockItemId, // Convert empty string to null
          description: purchaseFormValues.description || 'Yeni satın alma',
          quantityPurchased: quantityPurchased,
          unitPrice: unitPrice,
          transactionType: 'purchase',
          category: 'diger',
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await addPurchase(user.uid, newPurchase);
        setPurchases(prev => [...prev, newPurchase]);
        toast({
          title: "Satın alma eklendi",
          description: "Yeni satın alma başarıyla eklendi.",
        });
      }
      setShowPurchaseModal(false);
      setEditingPurchase(null);
      setPurchaseFormValues(EMPTY_PURCHASE_FORM_VALUES);
    } catch (error) {
      console.error("Satın alma kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Satın alma kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleOpenAddPaymentToSupplierModal = useCallback(() => {
    setEditingPaymentToSupplier(null);
    setPaymentToSupplierFormValues(EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES);
    setShowPaymentToSupplierModal(true);
  }, []);

  const handleOpenEditPaymentToSupplierModal = useCallback((payment: PaymentToSupplier) => {
    setEditingPaymentToSupplier(payment);
    setPaymentToSupplierFormValues({
      amount: payment.amount.toString(),
      date: parseISO(payment.date),
      method: payment.method,
      currency: payment.currency,
      referenceNumber: payment.referenceNumber || '',
      description: payment.description || '',
      checkDate: payment.checkDate ? parseISO(payment.checkDate as string) : null,
      checkSerialNumber: payment.checkSerialNumber || null,
    });
    setShowPaymentToSupplierModal(true);
  }, []);

  const handlePaymentToSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supplier?.id) return;

    try {
      const amount = parseFloat(paymentToSupplierFormValues.amount);
      const checkDateISO = paymentToSupplierFormValues.checkDate ? formatISO(paymentToSupplierFormValues.checkDate) : null;

      if (editingPaymentToSupplier) {
        const updatedPayment: PaymentToSupplier = {
          ...editingPaymentToSupplier,
          amount: amount,
          date: formatISO(paymentToSupplierFormValues.date),
          method: paymentToSupplierFormValues.method,
          currency: paymentToSupplierFormValues.currency,
          referenceNumber: paymentToSupplierFormValues.referenceNumber || '',
          description: paymentToSupplierFormValues.description || '',
          checkDate: checkDateISO,
          checkSerialNumber: paymentToSupplierFormValues.checkSerialNumber || null,
          updatedAt: new Date().toISOString(),
        };
        await storageUpdatePaymentToSupplier(user.uid, updatedPayment);
        setPaymentsToSupplier(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
        toast({
          title: "Ödeme güncellendi",
          description: "Ödeme kaydı başarıyla güncellendi.",
        });
      } else {
        const newPayment: PaymentToSupplier = {
          id: Math.random().toString(36).substr(2, 9),
          supplierId: supplier.id,
          amount: amount,
          date: formatISO(paymentToSupplierFormValues.date),
          currency: paymentToSupplierFormValues.currency,
          method: paymentToSupplierFormValues.method,
          description: paymentToSupplierFormValues.description || '',
          checkDate: checkDateISO,
          checkSerialNumber: paymentToSupplierFormValues.checkSerialNumber || null,
          transactionType: 'paymentToSupplier',
          category: 'odeme',
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await addPaymentToSupplier(user.uid, newPayment);
        setPaymentsToSupplier(prev => [...prev, newPayment]);
        toast({
          title: "Ödeme eklendi",
          description: "Yeni ödeme başarıyla eklendi.",
        });
      }
      setShowPaymentToSupplierModal(false);
      setEditingPaymentToSupplier(null);
      setPaymentToSupplierFormValues(EMPTY_PAYMENT_TO_SUPPLIER_FORM_VALUES);
    } catch (error) {
      console.error("Ödeme kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Ödeme kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePurchase = useCallback(async (purchaseId: string) => {
    if (!user || !supplier?.id) return;
    try {
      await storageDeletePurchase(user.uid, purchaseId);
      setPurchases(prev => prev.filter(p => p.id !== purchaseId));
      toast({
        title: "Satın alma silindi",
        description: "Satın alma kaydı başarıyla silindi.",
      });
    } catch (error) {
      console.error("Satın alma silinirken hata:", error);
      toast({
        title: "Hata",
        description: "Satın alma silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [user, supplier, toast]);

  const handleDeletePaymentToSupplier = useCallback(async (paymentId: string) => {
    if (!user || !supplier?.id) return;
    try {
      await storageDeletePaymentToSupplier(user.uid, paymentId);
      setPaymentsToSupplier(prev => prev.filter(p => p.id !== paymentId));
      toast({
        title: "Ödeme silindi",
        description: "Ödeme başarıyla silindi.",
      });
    } catch (error) {
      console.error("Ödeme silinirken hata:", error);
      toast({
        title: "Hata",
        description: "Ödeme silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [user, supplier, toast]);

  const safeFormatDate = useCallback((dateString?: string | null, formatString: string = 'dd.MM.yyyy') => {
    if (!dateString) return 'Tarih Yok';
    const date = parseISO(dateString);
    return isValid(date) ? format(date, formatString, { locale: tr }) : 'Geçersiz Tarih';
  }, []);

  const renderTransactionDetail = (item: UnifiedTransactionClient) => {
    if (item.transactionType === 'purchase') {
      const purchase = item as Purchase;
      return (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p className="font-medium">Açıklama:</p>
          <p>{purchase.description || '-'}</p>
          {purchase.stockItemId && (
            <>
              <p className="font-medium">Stok Kalemi:</p>
              <p>{stockItemDisplayNames[purchase.stockItemId] || 'Yükleniyor...'}</p>
            </>
          )}
          {purchase.quantityPurchased !== undefined && purchase.quantityPurchased !== null && (
            <>
              <p className="font-medium">Adet:</p>
              <p>{purchase.quantityPurchased}</p>
            </>
          )}
          {purchase.unitPrice !== undefined && purchase.unitPrice !== null && (
            <>
              <p className="font-medium">Birim Fiyat:</p>
              <p>{formatCurrency(purchase.unitPrice, purchase.currency)}</p>
            </>
          )}
        </div>
      );
    } else if (item.transactionType === 'paymentToSupplier') {
      const payment = item as PaymentToSupplier;
      return (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p className="font-medium">Açıklama:</p>
          <p>{payment.description || '-'}</p>
          <p className="font-medium">Ödeme Yöntemi:</p>
          <p>{payment.method === 'nakit' ? 'Nakit' : payment.method === 'banka' ? 'Banka Havalesi' : 'Çek'}</p>
          {payment.referenceNumber && (
            <>
              <p className="font-medium">Referans No:</p>
              <p>{payment.referenceNumber}</p>
            </>
          )}
          {payment.checkDate && (
            <>
              <p className="font-medium">Çek Tarihi:</p>
              <p>{safeFormatDate(payment.checkDate, 'dd.MM.yyyy')}</p>
            </>
          )}
          {payment.checkSerialNumber && (
            <>
              <p className="font-medium">Çek Seri No:</p>
              <p>{payment.checkSerialNumber}</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

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

  const handleContactHistorySubmit = useCallback(async (values: ContactHistoryFormValues) => {
    if (!user || !supplier?.id) return;
    try {
      if (editingContactHistoryItem) {
        const updatedItem: ContactHistoryItem = {
          ...editingContactHistoryItem,
          date: formatISO(values.date),
          type: values.type,
          summary: values.summary,
          notes: values.notes || '',
          updatedAt: new Date().toISOString(),
        };
        await storageUpdateContactHistory(user.uid, updatedItem);
        setContactHistory(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        toast({
          title: "İletişim Geçmişi Güncellendi",
          description: "İletişim geçmişi kaydı başarıyla güncellendi.",
        });
      } else {
        const newItem: Omit<ContactHistoryItem, 'id'> = {
          supplierId: supplier.id,
          date: formatISO(values.date),
          type: values.type,
          summary: values.summary,
          notes: values.notes || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await storageAddContactHistory(user.uid, newItem);
        setContactHistory(prev => [...prev, { ...newItem, id: Math.random().toString(36).substr(2, 9) }]);
        toast({
          title: "İletişim Geçmişi Eklendi",
          description: "Yeni iletişim geçmişi kaydı başarıyla eklendi.",
        });
      }
      setShowContactHistoryModal(false);
      setEditingContactHistoryItem(null);
      setContactHistoryFormValues(EMPTY_CONTACT_HISTORY_FORM_VALUES);
    } catch (error) {
      console.error("İletişim geçmişi kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "İletişim geçmişi kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [user, supplier, editingContactHistoryItem, toast]);

  const handleDeleteContactHistory = useCallback(async (itemId: string) => {
    if (!user || !supplier?.id) return;
    try {
      const updatedHistory = (supplier.contactHistory || []).filter(item => item.id !== itemId);
      const updatedSupplier: Supplier = { ...supplier, contactHistory: updatedHistory };
      await storageUpdateSupplier(user.uid, updatedSupplier);
      setSupplier(updatedSupplier);
      toast({
        title: "İletişim Geçmişi Silindi",
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

  const handleAddTask = useCallback(async (values: SupplierTaskFormValues) => {
    if (!user || !supplier?.id) return;
    try {
      if (editingTask) {
        const updatedTask: SupplierTask = {
          ...editingTask,
          description: values.description,
          dueDate: values.dueDate ? formatISO(values.dueDate) : undefined,
          status: values.status,
          updatedAt: new Date().toISOString(),
        };
        await updateSupplierTask(user.uid, updatedTask);
        setTasks(prev => prev.map(task => task.id === updatedTask.id ? updatedTask : task));
        toast({
          title: "Görev Güncellendi",
          description: "Görev başarıyla güncellendi.",
        });
      } else {
        const newTask: Omit<SupplierTask, 'id'> = {
          supplierId: supplier.id,
          description: values.description,
          dueDate: values.dueDate ? formatISO(values.dueDate) : undefined,
          status: values.status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await addSupplierTask(user.uid, newTask);
        setTasks(prev => [...prev, { ...newTask, id: Math.random().toString(36).substr(2, 9) }]);
        toast({
          title: "Görev Eklendi",
          description: "Yeni görev başarıyla eklendi.",
        });
      }
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
      // Tedarikçi silindikten sonra ana tedarikçi listesi sayfasına yönlendir
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
                    onClick={() => handleOpenAddPurchaseModal()}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Satın Alma Ekle
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenAddPaymentToSupplierModal()}
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
                                  quantityPurchased: (item as Purchase).quantityPurchased?.toString() || undefined,
                                  unitPrice: (item as Purchase).unitPrice?.toString() || undefined,
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
                                  checkDate: (item as PaymentToSupplier).checkDate ? parseISO((item as PaymentToSupplier).checkDate as string) : null,
                                  checkSerialNumber: (item as PaymentToSupplier).checkSerialNumber || null,
                                });
                                setShowPaymentToSupplierModal(true);
                              }
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
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
              <div className="tiptap-editor border rounded-md min-h-[200px] mb-4 overflow-auto">
                <EditorContent editor={editor} className="prose max-w-none p-2" />
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Button
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  variant="outline"
                  size="sm"
                  className={editor?.isActive('bold') ? 'is-active' : ''}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  variant="outline"
                  size="sm"
                  className={editor?.isActive('italic') ? 'is-active' : ''}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  variant="outline"
                  size="sm"
                  className={editor?.isActive('underline') ? 'is-active' : ''}
                >
                  <UnderlineIcon className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  variant="outline"
                  size="sm"
                  className={editor?.isActive('strike') ? 'is-active' : ''}
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  variant="outline"
                  size="sm"
                  className={editor?.isActive('bulletList') ? 'is-active' : ''}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  variant="outline"
                  size="sm"
                  className={editor?.isActive('orderedList') ? 'is-active' : ''}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => handleSaveNotes()}>Notları Kaydet</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact-history">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>İletişim Geçmişi</CardTitle>
              <Button variant="outline" onClick={() => handleOpenAddContactHistoryModal()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                İletişim Ekle
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
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplier.contactHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{safeFormatDate(item.date, 'dd.MM.yyyy HH:mm')}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{item.summary}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{item.notes}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEditContactHistoryModal(item)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteContactHistory(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">Henüz bir iletişim geçmişi kaydı bulunmamaktadır.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Görevler</CardTitle>
              <Button variant="outline" onClick={() => handleOpenAddTaskModal()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Görev Ekle
              </Button>
            </CardHeader>
            <CardContent>
              {supplier.tasks && supplier.tasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Açıklama</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Son Tarih</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplier.tasks.sort((a, b) => {
                      if (a.status === 'completed' && b.status !== 'completed') return 1;
                      if (a.status !== 'completed' && b.status === 'completed') return -1;
                      if (!a.dueDate) return 1;
                      if (!b.dueDate) return -1;
                      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    }).map(task => (
                      <TableRow key={task.id}>
                        <TableCell className={cn(task.status === 'completed' && 'line-through text-muted-foreground')}>{task.description}</TableCell>
                        <TableCell>
                          <Badge variant={task.status === 'completed' ? 'secondary' : 'default'}>
                            {task.status === 'pending' && 'Beklemede'}
                            {task.status === 'completed' && 'Tamamlandı'}
                            {task.status === 'in-progress' && 'Devam Ediyor'}
                          </Badge>
                        </TableCell>
                        <TableCell>{task.dueDate ? safeFormatDate(task.dueDate, 'dd.MM.yyyy') : '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEditTaskModal(task)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">Henüz bir görev bulunmamaktadır.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statement">
          <Card>
            <CardHeader>
              <CardTitle>Ekstre</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle className="text-md">Aylık İşlem Özeti</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer>
                        <BarChart data={monthlyStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => formatCurrency(value, 'TRY')} />
                          <Bar dataKey="satınAlmalar" fill="#8884d8" name="Satın Almalar" />
                          <Bar dataKey="ödemeler" fill="#82ca9d" name="Ödemeler" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle className="text-md">İşlem Tipi Dağılımı</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {transactionTypeDistribution.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{item.name}</span>
                          <span className="font-semibold">{item.value} ({item.percentage.toFixed(2)}%)</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Button onClick={() => exportToCSV(unifiedTransactions, supplier.name || 'tedarikçi')}>
                <Download className="mr-2 h-4 w-4" />
                CSV Olarak Dışa Aktar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSubmit={handlePurchaseSubmit}
        formValues={purchaseFormValues}
        setFormValues={setPurchaseFormValues}
        availableStockItems={availableStockItems}
        getStockItemName={getStockItemName}
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
        supplier={supplier}
        onSave={handleEditSupplierSubmit}
      />

      <DeleteConfirmationModal
        isOpen={!!deletingPurchaseId}
        onClose={() => setDeletingPurchaseId(null)}
        onConfirm={() => handleDeletePurchase(deletingPurchaseId!)}
        title="Satın Alışı Sil"
        description="Bu satın alışı silmek istediğinizden emin misiniz?"
      />

      <DeleteConfirmationModal
        isOpen={!!deletingPaymentToSupplierId}
        onClose={() => setDeletingPaymentToSupplierId(null)}
        onConfirm={() => handleDeletePaymentToSupplier(deletingPaymentToSupplierId!)}
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
        onClose={() => setShowContactHistoryModal(false)}
        onSubmit={handleContactHistorySubmit}
        formValues={contactHistoryFormValues}
        setFormValues={setContactHistoryFormValues}
        editingContactHistoryItem={editingContactHistoryItem}
      />

      <TaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSubmit={handleAddTask}
        formValues={taskFormValues}
        setFormValues={setTaskFormValues}
        editingTask={editingTask}
      />

      <Dialog open={showPrintView} onOpenChange={setShowPrintView}>
        <DialogContent className="max-w-screen-xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4">
            <DialogTitle>Ekstre Görünümü</DialogTitle>
            <DialogDescription>Yazdırılabilir ekstre görünümü.</DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-auto p-4">
            {showPrintView && (
              <PrintView
                supplier={supplier}
                purchases={purchases}
                paymentsToSupplier={paymentsToSupplier}
                dateRange={dateRange}
                formatCurrency={formatCurrency}
                getStockItemName={getStockItemName}
                safeFormatDate={safeFormatDate}
                filteredAndSortedTransactions={filteredAndSortedTransactions}
                totalPurchases={totalPurchases}
                totalPaymentsToSupplier={totalPayments}
                balance={balance}
              />
            )}
          </div>
          <DialogFooter className="p-4">
            <Button onClick={() => window.print()}>Yazdır</Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Kapat</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
