// src/components/customers/customer-detail-page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Customer, Sale, Payment, Currency, UnifiedTransaction as AppUnifiedTransaction, StockItem, Price, ContactHistoryItem, CustomerTask, SaleFormValues, PaymentFormValues, TransactionTag } from '@/lib/types';
import * as storage from '@/lib/storage';
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
import { PlusCircle, Trash2, DollarSign, ShoppingCart, Edit3, Pencil, CalendarIcon, FileText, Printer, History, ClipboardList, Download, Bold, Italic, List, ListOrdered, Strikethrough, Underline as UnderlineIcon, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid, formatISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CustomerForm } from './customer-form';
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
import { TransactionCategory } from "@/lib/types";
import Underline from '@tiptap/extension-underline';
import { SaleModal } from "./sale-modal";
import { PaymentModal } from "./payment-modal";
import { EditCustomerModal } from "./edit-customer-modal";
import { DeleteConfirmationModal } from "../common/delete-confirmation-modal";
import { ContactHistoryModal } from "./contact-history-modal";
import { TaskModal } from "./task-modal";
import { PrintView } from "./print-view";
import { useRouter } from 'next/navigation';

interface CustomerDetailPageClientProps {
  customer: Customer;
  sales: Sale[];
  payments: Payment[];
  user: { uid: string } | null;
  onDataUpdated: () => void;
}

type ContactHistoryFormValues = {
  date: Date;
  type: 'phone' | 'email' | 'meeting' | 'other';
  summary: string;
  notes: string;
};

type TaskFormValues = {
  description: string;
  dueDate?: Date;
  status: 'pending' | 'completed' | 'in-progress';
};

const EMPTY_SALE_FORM_VALUES: SaleFormValues = {
  amount: '',
  date: new Date(),
  currency: 'TRY',
  stockItemId: undefined,
  description: '',
};
const EMPTY_PAYMENT_FORM_VALUES: PaymentFormValues = {
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

const EMPTY_TASK_FORM_VALUES: TaskFormValues = {
  description: '',
  dueDate: undefined,
  status: 'pending',
};

type UnifiedTransactionClient = AppUnifiedTransaction; // AppUnifiedTransaction olarak güncellendi

export function CustomerDetailPageClient({ customer: initialCustomer, sales: initialSales, payments: initialPayments, user, onDataUpdated }: CustomerDetailPageClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleFormValues, setSaleFormValues] = useState<SaleFormValues>(EMPTY_SALE_FORM_VALUES);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFormValues, setPaymentFormValues] = useState<PaymentFormValues>(EMPTY_PAYMENT_FORM_VALUES);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);

  const [notesContent, setNotesContent] = useState(initialCustomer.notes || '');
  const [showContactHistoryModal, setShowContactHistoryModal] = useState(false);
  const [contactHistoryFormValues, setContactHistoryFormValues] = useState<ContactHistoryFormValues>(EMPTY_CONTACT_HISTORY_FORM_VALUES);
  const [editingContactHistoryItem, setEditingContactHistoryItem] = useState<ContactHistoryItem | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskFormValues, setTaskFormValues] = useState<TaskFormValues>(EMPTY_TASK_FORM_VALUES);
  const [editingTask, setEditingTask] = useState<CustomerTask | null>(null);

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

  const [contactHistory, setContactHistory] = useState<ContactHistoryItem[]>([]);

  // Calculate totals with memoization
  const totalSales = useMemo(() => {
    return sales.reduce((sum: number, sale: Sale) => sum + sale.amount, 0);
  }, [sales]);

  const totalPayments = useMemo(() => {
    return payments.reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
  }, [payments]);

  const balance = useMemo(() => {
    return totalSales - totalPayments;
  }, [totalSales, totalPayments]);

  // Combine sales and payments into a unified list
  const unifiedTransactions = useMemo(() => {
    const all = [
      ...sales.map((s: Sale) => ({ ...s, transactionType: 'sale' as const })),
      ...payments.map((p: Payment) => ({ ...p, transactionType: 'payment' as const }))
    ];
    // Tarihe göre artan sırada sırala (eskiden yeniye)
    return all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sales, payments]);

  // Optimized balances calculation for different currencies
  const balances = useMemo(() => {
    const newBalances: Record<Currency, number> = { USD: 0, TRY: 0, EUR: 0 };
    if (!customer) return newBalances;

    const safeSales = Array.isArray(sales) ? sales : [];
    const safePayments = Array.isArray(payments) ? payments : [];

    safeSales.forEach((sale: Sale) => {
      if (sale.currency && typeof sale.amount === 'number') {
        newBalances[sale.currency] = (newBalances[sale.currency] || 0) + sale.amount;
      }
    });

    safePayments.forEach((payment: Payment) => {
      if (payment.currency && typeof payment.amount === 'number') {
        newBalances[payment.currency] = (newBalances[payment.currency] || 0) - payment.amount;
      }
    });

    return newBalances;
  }, [sales, payments, customer]);

  // Optimize transaction filtering and sorting
  const filteredAndSortedTransactions = useMemo(() => {
    const all: (Sale | Payment)[] = [
      ...sales.map((s: Sale) => ({ ...s, transactionType: 'sale' as const })),
      ...payments.map((p: Payment) => ({ ...p, transactionType: 'payment' as const }))
    ];

    // Apply date range filter
    const filtered = all.filter((item: Sale | Payment) => {
      const itemDate = parseISO(item.date);
      return (!dateRange?.from || itemDate >= dateRange.from) &&
             (!dateRange?.to || itemDate <= dateRange.to);
    });

    // Apply search query filter
    const searched = searchQuery
      ? filtered.filter((item: Sale | Payment) => {
          const searchLower = searchQuery.toLowerCase();
          const description = (item.transactionType === 'sale' && (item as Sale).description) || 
                              (item.transactionType === 'payment' && (item as Payment).description) || '';
          return (
            item.amount.toString().includes(searchLower) ||
            description.toLowerCase().includes(searchLower) ||
            format(parseISO(item.date), 'dd.MM.yyyy').includes(searchLower)
          );
        })
      : filtered;

    // Apply sorting with proper type checking
    return searched.sort((a: Sale | Payment, b: Sale | Payment) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [sales, payments, dateRange, searchQuery, sortOrder]);

  // Optimize recent transactions calculation
  const recentTransactions = useMemo(() => {
    return filteredAndSortedTransactions.slice(0, 5);
  }, [filteredAndSortedTransactions]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTransactions, currentPage]);

  const getStockItemName = useCallback(async (stockItemId?: string): Promise<string> => {
    if (!stockItemId || !user?.uid) return 'Bilinmeyen Stok Ürünü';
    const item = await storage.getStockItemById(user.uid, stockItemId);
    return item?.name || 'Bilinmeyen Stok Ürünü';
  }, [user?.uid]);

  // Yeni eklenen
  useEffect(() => {
    const fetchStockItems = async () => {
      if (user?.uid) {
        const items = await storage.getStockItems(user.uid);
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
    setCustomer(initialCustomer);
  }, [initialCustomer]);

  useEffect(() => {
    const fetchFreshCustomer = async () => {
      if (customer?.id && user?.uid) {
        const freshCustomer = await storage.getCustomerById(user.uid, customer.id);
        if (freshCustomer) {
          setCustomer(freshCustomer);
        }
      }
    };
    fetchFreshCustomer();
    if (customer?.name) {
      document.title = `${customer.name} | Müşteri Detayları | ERMAY`;
    }
  }, [customer?.id, customer?.name, user]);

  const fetchContactHistory = useCallback(async () => {
    if (!user?.uid || !customer?.id) return;
    try {
      const history = await storage.getContactHistory(user.uid, customer.id);
      setContactHistory(history);
    } catch (error) {
      console.error("İletişim geçmişi yüklenirken hata:", error);
      toast({
        title: "Hata",
        description: "İletişim geçmişi yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [user, customer?.id, toast]);

  useEffect(() => {
    fetchContactHistory();
  }, [fetchContactHistory]);

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !customer?.id) {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu veya müşteri bilgisi bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFloat(saleFormValues.amount);
      const date = formatISO(saleFormValues.date);

      if (editingSale) {
        const updatedSale: Sale = {
          ...editingSale,
          amount,
          date,
          currency: saleFormValues.currency,
          stockItemId: saleFormValues.stockItemId === undefined ? null : saleFormValues.stockItemId,
          description: saleFormValues.description || '',
          updatedAt: formatISO(new Date())
        };

        await storage.updateSale(user.uid, updatedSale);
        toast({
          title: "Başarılı",
          description: "Satış güncellendi.",
        });
      } else {
        const newSale: Omit<Sale, 'id'> = {
          customerId: customer.id,
          amount,
          date,
          currency: saleFormValues.currency,
          stockItemId: saleFormValues.stockItemId === undefined ? null : saleFormValues.stockItemId,
          description: saleFormValues.description || '',
          transactionType: 'sale',
          category: 'satis',
          tags: [],
          createdAt: formatISO(new Date()),
          updatedAt: formatISO(new Date())
        };

        await storage.addSale(user.uid, newSale);
        toast({
          title: "Başarılı",
          description: "Yeni satış eklendi.",
        });
      }
      setShowSaleModal(false);
      setSaleFormValues(EMPTY_SALE_FORM_VALUES);
      setEditingSale(null);
      onDataUpdated();
    } catch (error) {
      console.error("Satış kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Satış kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !customer?.id) {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu veya müşteri bilgisi bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFloat(paymentFormValues.amount);
      const date = formatISO(paymentFormValues.date);

      if (editingPayment) {
        const updatedPayment: Payment = {
          ...editingPayment,
          amount,
          date,
          method: paymentFormValues.method,
          currency: paymentFormValues.currency,
          referenceNumber: paymentFormValues.referenceNumber || '',
          description: paymentFormValues.description || '',
          checkDate: paymentFormValues.checkDate ? formatISO(paymentFormValues.checkDate) : null,
          checkSerialNumber: paymentFormValues.checkSerialNumber || null,
          updatedAt: formatISO(new Date())
        };

        await storage.updatePayment(user.uid, updatedPayment);
        toast({
          title: "Başarılı",
          description: "Ödeme güncellendi.",
        });
      } else {
        const newPayment: Omit<Payment, 'id' | 'transactionType'> = {
          customerId: customer.id,
          amount,
          date,
          method: paymentFormValues.method,
          currency: paymentFormValues.currency,
          referenceNumber: paymentFormValues.referenceNumber || '',
          description: paymentFormValues.description || '',
          checkDate: paymentFormValues.checkDate ? formatISO(paymentFormValues.checkDate) : null,
          checkSerialNumber: paymentFormValues.checkSerialNumber || null,
          category: 'odeme',
          tags: [],
          createdAt: formatISO(new Date()),
          updatedAt: formatISO(new Date())
        };

        await storage.addPayment(user.uid, newPayment);
        toast({
          title: "Başarılı",
          description: "Yeni ödeme eklendi.",
        });
      }
      setShowPaymentModal(false);
      setPaymentFormValues(EMPTY_PAYMENT_FORM_VALUES);
      setEditingPayment(null);
      onDataUpdated();
    } catch (error) {
      console.error("Ödeme kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Ödeme kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSale = useCallback(async (saleId: string) => {
    console.log('handleDeleteSale called with saleId:', saleId);
    if (!user || !customer?.id) {
      console.log('handleDeleteSale: User or customer ID missing.');
      return;
    }
    try {
      console.log('Attempting to delete sale with uid:', user.uid, 'and saleId:', saleId);
      await storage.storageDeleteSale(user.uid, saleId);
      setSales(prevSales => prevSales.filter(sale => sale.id !== saleId));
      toast({
        title: "Başarılı",
        description: "Satış başarıyla silindi.",
      });
      setDeletingSaleId(null);
      onDataUpdated();
    } catch (error) {
      console.error("Satış silinirken hata:", error);
      toast({
        title: "Hata",
        description: "Satış silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [user, customer?.id, onDataUpdated, toast]);

  const handleDeletePayment = useCallback(async (paymentId: string) => {
    if (!user || !customer?.id) return;
    try {
      await storage.storageDeletePayment(user.uid, paymentId);
      setPayments(prevPayments => prevPayments.filter(payment => payment.id !== paymentId));
      toast({
        title: "Başarılı",
        description: "Ödeme başarıyla silindi.",
      });
      setDeletingPaymentId(null);
      onDataUpdated();
    } catch (error) {
      console.error("Ödeme silinirken hata:", error);
      toast({
        title: "Hata",
        description: "Ödeme silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [user, customer?.id, onDataUpdated, toast]);

  const formatCurrency = useCallback((amount: number, currency: Currency): string => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      amount = 0;
    }
    try {
      return amount.toLocaleString("tr-TR", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch (error) {
      console.error("Error formatting currency:", error, { amount, currency });
      if (currency === 'TRY') return `₺${amount.toFixed(2)}`;
      if (currency === 'USD') return `$\${amount.toFixed(2)}`;
      if (currency === 'EUR') return `€${amount.toFixed(2)}`;
      return `${amount.toFixed(2)} ${currency}`;
    }
  }, []);

  const safeFormatDate = (dateString: string | null | undefined, formatString: string) => {
    if (!dateString) return "-"; // Null veya undefined ise boş döndür
    const date = parseISO(dateString);
    return isValid(date) ? format(date, formatString, { locale: tr }) : "Geçersiz Tarih";
  };

  // Tek bir satış veya ödeme işleminin detaylarını gösterir
  const renderTransactionDetail = (item: AppUnifiedTransaction) => {
    if (item.transactionType === 'sale') {
      const saleItem = item as Sale;
      return (
        <div className="flex flex-col">
          {saleItem.stockItemId && (
            <span className="text-sm text-muted-foreground">
              Stok: {stockItemDisplayNames[saleItem.stockItemId] || 'Yükleniyor...'}
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            Açıklama: {saleItem.description || '-'}
          </span>
          {saleItem.quantity !== undefined && saleItem.unitPrice !== undefined && (
            <span className="text-sm text-muted-foreground">
              Adet: {saleItem.quantity} x {formatCurrency(saleItem.unitPrice, saleItem.currency)}
            </span>
          )}
        </div>
      );
    } else if (item.transactionType === 'payment') {
      const paymentItem = item as Payment;
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
          {paymentItem.checkDate && (
            <span className="text-sm text-muted-foreground">
              Çek Tarihi: {safeFormatDate(paymentItem.checkDate, 'dd.MM.yyyy')}
            </span>
          )}
          {paymentItem.checkSerialNumber && (
            <span className="text-sm text-muted-foreground">
              Çek No: {paymentItem.checkSerialNumber}
            </span>
          )}
        </div>
      );
    }
    return null;
  };

  const handleSaveNotes = useCallback(async () => {
    if (!user || !customer?.id) return;
    try {
      const updatedCustomer: Customer = { ...customer, notes: notesContent };
      await storage.updateCustomer(user.uid, updatedCustomer);
      setCustomer(updatedCustomer);
      toast({
        title: "Notlar Güncellendi",
        description: "Müşteri notları başarıyla kaydedildi.",
      });
    } catch (error) {
      console.error("Notlar kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Notlar kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [user, customer, notesContent, toast]);

  const handleOpenAddContactHistoryModal = useCallback(() => {
    setEditingContactHistoryItem(null);
    setContactHistoryFormValues(EMPTY_CONTACT_HISTORY_FORM_VALUES);
    setShowContactHistoryModal(true);
  }, []);

  const handleContactHistorySubmit = useCallback(async (values: ContactHistoryFormValues) => {
    if (!user || !customer?.id) return;

    try {
      const newHistoryItem: Omit<ContactHistoryItem, 'id'> = {
        ...values,
        customerId: customer.id,
        date: formatISO(values.date),
        createdAt: formatISO(new Date()),
        updatedAt: formatISO(new Date()),
      };

      if (editingContactHistoryItem) {
        await storage.updateContactHistory(user.uid, { ...newHistoryItem, id: editingContactHistoryItem.id });
        toast({
          title: "Başarılı",
          description: "İletişim geçmişi güncellendi.",
        });
      } else {
        await storage.addContactHistory(user.uid, newHistoryItem);
        toast({
          title: "Başarılı",
          description: "Yeni iletişim geçmişi eklendi.",
        });
      }
      setShowContactHistoryModal(false);
      setContactHistoryFormValues(EMPTY_CONTACT_HISTORY_FORM_VALUES);
      setEditingContactHistoryItem(null);
      fetchContactHistory();
    } catch (error) {
      console.error("İletişim geçmişi kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "İletişim geçmişi kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [user, customer?.id, editingContactHistoryItem, toast, fetchContactHistory]);

  const handleDeleteContactHistory = useCallback(async (historyId: string) => {
    if (!user || !customer?.id) return;
    try {
      await storage.deleteContactHistory(user.uid, historyId);
      toast({
        title: "Başarılı",
        description: "İletişim geçmişi silindi.",
      });
      fetchContactHistory();
    } catch (error) {
      console.error("İletişim geçmişi silinirken hata:", error);
      toast({
        title: "Hata",
        description: "İletişim geçmişi silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [user, customer?.id, toast, fetchContactHistory]);

  const handleOpenAddTaskModal = useCallback(() => {
    setEditingTask(null);
    setTaskFormValues(EMPTY_TASK_FORM_VALUES);
    setShowTaskModal(true);
  }, []);

  const handleTaskSubmit = useCallback(async (values: TaskFormValues) => {
    if (!user || !customer?.id) return;
    try {
      let updatedCustomer: Customer;
      if (editingTask) {
        // Update existing task
        const updatedTasks = (customer.tasks || []).map(task => 
          task.id === editingTask.id
            ? { ...task, ...values, dueDate: values.dueDate ? formatISO(values.dueDate) : undefined, updatedAt: formatISO(new Date()) }
            : task
        );
        updatedCustomer = { ...customer, tasks: updatedTasks };
        await storage.updateCustomer(user.uid, updatedCustomer);
        toast({ title: "Görev Güncellendi", description: "Görev başarıyla güncellendi." });
      } else {
        // Add new task
        const newTask = {
          id: crypto.randomUUID(),
          ...values,
          dueDate: values.dueDate ? formatISO(values.dueDate) : undefined,
          createdAt: formatISO(new Date()),
          updatedAt: formatISO(new Date()),
        };
        const updatedTasks = [...(customer.tasks || []), newTask];
        updatedCustomer = { ...customer, tasks: updatedTasks };
        await storage.updateCustomer(user.uid, updatedCustomer);
        toast({ title: "Görev Eklendi", description: "Yeni görev başarıyla eklendi." });
      }
      setCustomer(updatedCustomer);
      setShowTaskModal(false);
      setTaskFormValues(EMPTY_TASK_FORM_VALUES);
      setEditingTask(null);
    } catch (error) {
      console.error("Görev kaydedilirken hata:", error);
      toast({ title: "Hata", description: "Görev kaydedilirken bir sorun oluştu.", variant: "destructive" });
    }
  }, [user, customer, editingTask, toast]);

  const handleOpenEditTaskModal = useCallback((task: CustomerTask) => {
    setEditingTask(task);
    setTaskFormValues({
      description: task.description,
      dueDate: task.dueDate ? parseISO(task.dueDate) : undefined,
      status: task.status,
    });
    setShowTaskModal(true);
  }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!user || !customer?.id) return;
    try {
      const updatedTasks = (customer.tasks || []).filter(task => task.id !== taskId);
      const updatedCustomer: Customer = { ...customer, tasks: updatedTasks };
      await storage.updateCustomer(user.uid, updatedCustomer);
      setCustomer(updatedCustomer);
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
  }, [user, customer, toast]);

  const exportToCSV = (transactions: AppUnifiedTransaction[], customerName: string) => {
    const headers = ['Tarih', 'İşlem Tipi', 'Tutar', 'Para Birimi', 'Açıklama'];
    const data = transactions.map((t: AppUnifiedTransaction) => [
      safeFormatDate(t.date, 'dd.MM.yyyy'),
      t.transactionType === 'sale' ? 'Satış' : 'Ödeme',
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
    link.setAttribute('download', `${customerName}_islemler_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aylık istatistikler için veri hazırlama
  const monthlyStats = useMemo(() => {
    const months = eachMonthOfInterval({
      start: dateRange?.from || addDays(new Date(), -180),
      end: dateRange?.to || new Date(),
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthSales = sales.filter((sale: Sale) => {
        const saleDate = new Date(sale.date);
        return saleDate >= monthStart && saleDate <= monthEnd;
      });

      const monthPayments = payments.filter((payment: Payment) => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      });

      const totalSales = monthSales.reduce((sum, sale) => sum + sale.amount, 0);
      const totalPayments = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);

      return {
        month: format(month, 'MMM yyyy', { locale: tr }),
        satışlar: totalSales,
        ödemeler: totalPayments,
      };
    });
  }, [sales, payments, dateRange]);

  // İşlem türlerine göre dağılım
  const transactionTypeDistribution = useMemo(() => {
    const total = filteredAndSortedTransactions.length;
    if (total === 0) return [];

    const salesCount = filteredAndSortedTransactions.filter((t: Sale | Payment) => t.transactionType === 'sale').length;
    const paymentsCount = filteredAndSortedTransactions.filter((t: Sale | Payment) => t.transactionType === 'payment').length;

    return [
      { name: 'Satışlar', value: salesCount, percentage: (salesCount / total) * 100 },
      { name: 'Ödemeler', value: paymentsCount, percentage: (paymentsCount / total) * 100 },
    ];
  }, [filteredAndSortedTransactions]);

  // Zengin metin editörü
  const editor = useEditor({
    extensions: [StarterKit, Underline], // Underline eklentisini ekledim
    content: customer.notes || '',
    onUpdate: ({ editor }) => {
      setCustomer(prev => ({ ...prev, notes: editor.getHTML() }));
    },
  });

  // İşlem kategorileri
  const transactionCategories: { value: TransactionCategory; label: string }[] = [
    { value: 'satis', label: 'Satış' },
    { value: 'odeme', label: 'Ödeme' },
    { value: 'iade', label: 'İade' },
    { value: 'indirim', label: 'İndirim' },
    { value: 'komisyon', label: 'Komisyon' },
    { value: 'diger', label: 'Diğer' },
  ];

  // Etiket renkleri
  const tagColors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-red-100 text-red-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
  ];

  // Yeni etiket oluşturma
  const handleAddTag = useCallback(async (transactionId: string, transactionType: 'sale' | 'payment', newTagText: string) => {
    if (!user || !customer?.id) return;

    try {
      const tagColor = tagColors[Math.floor(Math.random() * tagColors.length)];
      const newTag: TransactionTag = { id: Date.now().toString(), name: newTagText, color: tagColor };

      if (transactionType === 'sale') {
        const saleToUpdate = sales.find((s: Sale) => s.id === transactionId);
        if (saleToUpdate) {
          const updatedSale: Sale = { ...saleToUpdate, tags: [...(saleToUpdate.tags || []), newTag], updatedAt: formatISO(new Date()) };
          await storage.updateSale(user.uid, updatedSale);
          setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
        }
      } else if (transactionType === 'payment') {
        const paymentToUpdate = payments.find((p: Payment) => p.id === transactionId);
        if (paymentToUpdate) {
          const updatedPayment: Payment = { ...paymentToUpdate, tags: [...(paymentToUpdate.tags || []), newTag], updatedAt: formatISO(new Date()) };
          await storage.updatePayment(user.uid, updatedPayment);
          setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
        }
      }
      toast({ title: "Etiket Eklendi", description: "Etiket başarıyla eklendi." });
      onDataUpdated();
    } catch (error) {
      console.error("Etiket eklenirken hata:", error);
      toast({ title: "Hata", description: "Etiket eklenirken bir sorun oluştu.", variant: "destructive",});
    }
  }, [user, customer, sales, payments, onDataUpdated, toast, tagColors]);

  // Etiket silme
  const handleRemoveTag = useCallback(async (transactionId: string, tagId: string, transactionType: 'sale' | 'payment') => {
    if (!user || !customer?.id) return;

    try {
      if (transactionType === 'sale') {
        const saleToUpdate = sales.find((s: Sale) => s.id === transactionId);
        if (saleToUpdate) {
          const updatedSale: Sale = { ...saleToUpdate, tags: (saleToUpdate.tags || []).filter((tag: TransactionTag) => tag.id !== tagId), updatedAt: formatISO(new Date()) };
          await storage.updateSale(user.uid, updatedSale);
          setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
        }
      } else if (transactionType === 'payment') {
        const paymentToUpdate = payments.find((p: Payment) => p.id === transactionId);
        if (paymentToUpdate) {
          const updatedPayment: Payment = { ...paymentToUpdate, tags: (paymentToUpdate.tags || []).filter((tag: TransactionTag) => tag.id !== tagId), updatedAt: formatISO(new Date()) };
          await storage.updatePayment(user.uid, updatedPayment);
          setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
        }
      }
      toast({ title: "Etiket Silindi", description: "Etiket başarıyla silindi." });
      onDataUpdated();
    } catch (error) {
      console.error("Etiket silinirken hata:", error);
      toast({ title: "Hata", description: "Etiket silinirken bir sorun oluştu.", variant: "destructive",});
    }
  }, [user, customer, sales, payments, onDataUpdated, toast]);

  const handleCustomerUpdate = async (updatedCustomerData: Customer) => {
    if (!user) return;
    try {
      await storage.updateCustomer(user.uid, updatedCustomerData);
      setCustomer(updatedCustomerData);
      toast({
        title: "Başarılı",
        description: "Müşteri bilgileri güncellendi.",
      });
      onDataUpdated();
    } catch (error) {
      console.error("Müşteri güncellenirken hata:", error);
      toast({
        title: "Hata",
        description: "Müşteri bilgileri güncellenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCustomer = useCallback(async () => {
    if (!user || !deletingCustomer) return;
    try {
      await storage.deleteCustomer(user.uid, deletingCustomer.id);
      toast({
        title: "Müşteri Silindi",
        description: "Müşteri başarıyla silindi.",
      });
      router.push('/customers'); // Müşteri silindikten sonra ana müşteri listesi sayfasına yönlendir
    } catch (error) {
      console.error("Müşteri silinirken hata:", error);
      toast({
        title: "Hata",
        description: "Müşteri silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setDeletingCustomer(null);
    }
  }, [user, deletingCustomer, toast, router]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
          <p className="text-muted-foreground mt-1">
            {customer.email && <span className="block">{customer.email}</span>}
            {customer.phone && <span className="block">{customer.phone}</span>}
            {customer.address && <span className="block">{customer.address}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open(`/customers/${customer.id}/extract`, '_blank')}>
            <Receipt className="h-4 w-4 mr-2" />
            Ekstre Görüntüle
          </Button>
          <Button variant="outline" onClick={() => setShowEditCustomerModal(true)}>
            <Edit3 className="h-4 w-4 mr-2" />
            Düzenle
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="bg-red-500 hover:bg-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Sil
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Müşteriyi Sil</AlertDialogTitle>
                <AlertDialogDescription>
                  Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={() => setDeletingCustomer(customer)}>Sil</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Satış</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales, customer.defaultCurrency || 'TRY')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Ödeme</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPayments, customer.defaultCurrency || 'TRY')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bakiye</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(balance, customer.defaultCurrency || 'TRY')}</div>
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
                    onClick={() => {
                      setEditingSale(null);
                      setSaleFormValues(EMPTY_SALE_FORM_VALUES);
                      setShowSaleModal(true);
                    }}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Satış Ekle
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingPayment(null);
                      setPaymentFormValues(EMPTY_PAYMENT_FORM_VALUES);
                      setShowPaymentModal(true);
                    }}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ödeme Ekle
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-4 items-center">
                <Input
                  placeholder="İşlemlerde ara..."
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
                      locale={tr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Tarih</TableHead>
                    <TableHead className="w-[100px]">Tip</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead>Detay</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((item) => (
                      <TableRow key={`${item.transactionType}-${item.id}`}>
                        <TableCell className="py-0">{safeFormatDate(item.date, 'dd.MM.yyyy')}</TableCell>
                        <TableCell className="py-0">{
                          item.transactionType === 'sale' ? (
                            <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Satış</Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">Ödeme</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-0 text-right font-medium">
                          {formatCurrency(item.amount, item.currency)}
                        </TableCell>
                        <TableCell className="py-0">
                          {renderTransactionDetail(item)}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(item.tags || []).map(tag => (
                              <Badge
                                key={tag.id}
                                className={`ml-2 px-2 py-1 rounded-full text-xs ${tag.color}`}
                              >
                                {tag.name}
                                <button
                                  onClick={() => handleRemoveTag(item.id, tag.id, item.transactionType)}
                                  className="ml-1 text-white hover:text-gray-200"
                                >
                                  &times;
                                </button>
                              </Badge>
                            ))}
                            <Input
                              type="text"
                              placeholder="Yeni etiket ekle"
                              className="h-6 w-28 text-xs px-2 py-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                                  handleAddTag(item.id, item.transactionType, e.currentTarget.value.trim());
                                  e.currentTarget.value = '';
                                }
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-0 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (item.transactionType === 'sale') {
                                setEditingSale(item as Sale);
                                setSaleFormValues({
                                  amount: (item as Sale).amount.toString(),
                                  date: parseISO((item as Sale).date),
                                  currency: (item as Sale).currency,
                                  stockItemId: (item as Sale).stockItemId || undefined,
                                  description: (item as Sale).description || '',
                                  quantity: (item as Sale).quantity?.toString(),
                                  unitPrice: (item as Sale).unitPrice?.toString(),
                                });
                                setShowSaleModal(true);
                              } else {
                                setEditingPayment(item as Payment);
                                setPaymentFormValues({
                                  amount: (item as Payment).amount.toString(),
                                  date: parseISO((item as Payment).date),
                                  method: (item as Payment).method,
                                  currency: (item as Payment).currency,
                                  referenceNumber: (item as Payment).referenceNumber || '',
                                  description: (item as Payment).description || '',
                                  checkDate: (item as Payment).checkDate ? parseISO((item as Payment).checkDate) : null,
                                  checkSerialNumber: (item as Payment).checkSerialNumber || null,
                                });
                                setShowPaymentModal(true);
                              }
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (item.transactionType === 'sale') {
                                setDeletingSaleId(item.id);
                              } else {
                                setDeletingPaymentId(item.id);
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
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Önceki
                </Button>
                <span className="mx-2">Sayfa {currentPage} / {totalPages}</span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Sonraki
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Notlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-md min-h-[200px] p-2 prose max-w-none dark:prose-invert">
                <EditorContent editor={editor} />
              </div>
              <Button onClick={handleSaveNotes}>Notları Kaydet</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="contact-history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>İletişim Geçmişi</CardTitle>
                <Button onClick={handleOpenAddContactHistoryModal}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Yeni Kayıt
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Özet</TableHead>
                    <TableHead>Notlar</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{safeFormatDate(item.date, 'dd.MM.yyyy')}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.summary}</TableCell>
                      <TableCell>{item.notes || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                             setEditingContactHistoryItem(item);
                             setContactHistoryFormValues({
                               date: parseISO(item.date),
                               type: item.type,
                               summary: item.summary,
                               notes: item.notes || '',
                             });
                             setShowContactHistoryModal(true);
                           }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContactHistory(item.id)}
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
        </TabsContent>
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Görevler</CardTitle>
                <Button onClick={handleOpenAddTaskModal}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Yeni Görev
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Son Tarih</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(customer.tasks || []).length > 0 ? (
                    (customer.tasks || []).sort((a, b) => {
                      // Sort by status first: pending, in-progress, completed
                      const statusOrder = { 'pending': 1, 'in-progress': 2, 'completed': 3 };
                      const statusComparison = statusOrder[a.status] - statusOrder[b.status];
                      if (statusComparison !== 0) return statusComparison;

                      // Then by dueDate (ascending, nulls last)
                      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                      return dateA - dateB;
                    }).map(task => (
                      <TableRow key={task.id}>
                        <TableCell>{task.description}</TableCell>
                        <TableCell>{task.dueDate ? safeFormatDate(task.dueDate, 'dd.MM.yyyy') : '-'}</TableCell>
                        <TableCell>{task.status}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditTaskModal(task)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        Görev bulunamadı.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="statement">
          <Card>
            <CardHeader>
              <CardTitle>Ekstre Görünümü</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Button onClick={() => exportToCSV(filteredAndSortedTransactions, customer.name)}>
                  <Download className="mr-2 h-4 w-4" /> CSV İndir
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>İşlem Tipi</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead>Açıklama</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTransactions.length > 0 ? (
                    filteredAndSortedTransactions.map((item) => (
                      <TableRow key={`${item.transactionType}-${item.id}`}>
                        <TableCell>{safeFormatDate(item.date, 'dd.MM.yyyy')}</TableCell>
                        <TableCell>{item.transactionType === 'sale' ? 'Satış' : 'Ödeme'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount, item.currency)}</TableCell>
                        <TableCell>{item.description}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        Ekstrede işlem bulunamadı.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SaleModal
        isOpen={showSaleModal}
        onClose={() => {
          setShowSaleModal(false);
          setEditingSale(null);
          setSaleFormValues(EMPTY_SALE_FORM_VALUES);
        }}
        onSubmit={handleSaleSubmit}
        formValues={saleFormValues}
        setFormValues={setSaleFormValues}
        availableStockItems={availableStockItems}
        stockItemDisplayNames={stockItemDisplayNames}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={handlePaymentSubmit}
        formValues={paymentFormValues}
        setFormValues={setPaymentFormValues}
      />

      <EditCustomerModal
        isOpen={showEditCustomerModal}
        onClose={() => setShowEditCustomerModal(false)}
        customer={customer}
        onSave={handleCustomerUpdate}
      />

      <DeleteConfirmationModal
        isOpen={deletingSaleId !== null}
        onClose={() => setDeletingSaleId(null)}
        onConfirm={() => {
          console.log('DeleteConfirmationModal: Confirming sale deletion for ID:', deletingSaleId);
          if (deletingSaleId) {
            handleDeleteSale(deletingSaleId!);
          }
        }}
        title="Satışı Sil"
        description="Bu satışı silmek istediğinizden emin misiniz?"
      />

      <DeleteConfirmationModal
        isOpen={deletingPaymentId !== null}
        onClose={() => setDeletingPaymentId(null)}
        onConfirm={() => {
          console.log('DeleteConfirmationModal: Confirming payment deletion for ID:', deletingPaymentId);
          if (deletingPaymentId) {
            handleDeletePayment(deletingPaymentId!);
          }
        }}
        title="Ödemeyi Sil"
        description="Bu ödemeyi silmek istediğinizden emin misiniz?"
      />

      <DeleteConfirmationModal
        isOpen={deletingCustomer !== null}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleDeleteCustomer}
        title="Müşteriyi Sil"
        description="Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
      />

      <ContactHistoryModal
        isOpen={showContactHistoryModal}
        onClose={() => setShowContactHistoryModal(false)}
        onSubmit={handleContactHistorySubmit}
        formValues={contactHistoryFormValues}
        setFormValues={setContactHistoryFormValues}
        isEditing={!!editingContactHistoryItem}
      />

      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSubmit={handleTaskSubmit}
        formValues={taskFormValues}
        setFormValues={setTaskFormValues}
        isEditing={!!editingTask}
      />

      {showPrintView && <PrintView customer={customer} transactions={unifiedTransactions} onClose={() => setShowPrintView(false)} />}
    </div>
  );
}
