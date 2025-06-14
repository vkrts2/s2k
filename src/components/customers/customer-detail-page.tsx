// src/components/customers/customer-detail-page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Customer, Sale, Payment, Currency, UnifiedTransaction as AppUnifiedTransaction, StockItem, Price, ContactHistoryItem, CustomerTask, SaleFormValues, PaymentFormValues } from '@/lib/types';
import {
  addPayment,
  updatePayment as storageUpdatePayment,
  deletePayment as storageDeletePayment,
  addSale,
  updateSale as storageUpdateSale,
  deleteSale as storageDeleteSale,
  getStockItems,
  getStockItemById,
  getCustomerById,
  updateCustomer as storageUpdateCustomer,
  deleteCustomer as storageDeleteCustomer,
  getContactHistory,
  addContactHistory,
  updateContactHistory,
  deleteContactHistory,
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
import { TransactionCategory, TransactionTag } from "@/lib/types";
import Underline from '@tiptap/extension-underline';
import { SaleModal } from "./sale-modal";
import { PaymentModal } from "./payment-modal";
import { EditCustomerModal } from "./edit-customer-modal";
import { DeleteConfirmationModal } from "../common/delete-confirmation-modal";
import { ContactHistoryModal } from "./contact-history-modal";
import { TaskModal } from "./task-modal";
import { PrintView } from "./print-view";

interface CustomerDetailPageClientProps {
  customer: Customer;
  initialSales: Sale[];
  initialPayments: Payment[];
  user: { uid: string } | null;
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

export function CustomerDetailPageClient({ customer: initialCustomer, initialSales, initialPayments, user }: CustomerDetailPageClientProps) {
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);

  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleFormValues, setSaleFormValues] = useState<SaleFormValues>(EMPTY_SALE_FORM_VALUES);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFormValues, setPaymentFormValues] = useState<PaymentFormValues>(EMPTY_PAYMENT_FORM_VALUES);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

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
  const [deletingCustomer, setDeletingCustomer] = useState<string | null>(null);

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
      ...sales.map(s => ({ ...s, transactionType: 'sale' as const })),
      ...payments.map(p => ({ ...p, transactionType: 'payment' as const }))
    ];
    // Tarihe göre artan sırada sırala (eskiden yeniye)
    return all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sales, payments]);

  // Optimize transaction filtering and sorting
  const filteredAndSortedTransactions = useMemo(() => {
    const all: (Sale | Payment)[] = [
      ...sales.map((s: Sale) => ({ ...s, transactionType: 'sale' as const })),
      ...payments.map((p: Payment) => ({ ...p, transactionType: 'payment' as const }))
    ];

    // Apply date range filter
    const filtered = all.filter(item => {
      const itemDate = parseISO(item.date);
      return (!dateRange?.from || itemDate >= dateRange.from) &&
             (!dateRange?.to || itemDate <= dateRange.to);
    });

    // Apply search query filter
    const searched = searchQuery
      ? filtered.filter(item => {
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
    return searched.sort((a, b) => {
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
    const item = await getStockItemById(user.uid, stockItemId);
    return item?.name || 'Bilinmeyen Stok Ürünü';
  }, [user?.uid]);

  // Yeni eklenen
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
    setCustomer(initialCustomer);
    setSales(initialSales);
    setPayments(initialPayments);
  }, [initialCustomer, initialSales, initialPayments]);

  useEffect(() => {
    const fetchFreshCustomer = async () => {
      if (customer?.id && user?.uid) {
        const freshCustomer = await getCustomerById(user.uid, customer.id);
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

  useEffect(() => {
    const quantity = parseFloat(saleFormValues.quantity || '0');
    const price = parseFloat(saleFormValues.unitPrice || '0');
    if (saleFormValues.stockItemId !== null) {
      if (!isNaN(quantity) && !isNaN(price) && quantity > 0 && price >= 0) {
        setSaleFormValues(prev => ({ ...prev, amount: (quantity * price).toFixed(2) }));
      } else {
        setSaleFormValues(prev => ({ ...prev, amount: ''}));
      }
    }
  }, [saleFormValues.quantity, saleFormValues.unitPrice, saleFormValues.stockItemId]);

  useEffect(() => {
    setSaleFormValues(prev => ({ ...prev, unitPrice: '', currency: 'TRY' }));
  }, [saleFormValues.stockItemId]);

  const refreshCustomerData = useCallback(async () => {
    if (!customer?.id || !user) return;
    const freshCustomer = await getCustomerById(user.uid, customer.id);
    if (freshCustomer) {
      setCustomer(freshCustomer);
      document.title = `${freshCustomer.name} | Müşteri Detayları | ERMAY`;
    }
  }, [customer?.id, user]);

  const handleCustomerUpdate = useCallback(async (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> | Customer): Promise<void> => {
    try {
      if (!user) {
        console.error("handleCustomerUpdate: User is not logged in.");
        toast({
          title: "Hata",
          description: "Müşteri bilgileri güncellenirken bir sorun oluştu: Kullanıcı girişi yapılmamış.",
          variant: "destructive",
        });
        return;
      }
      // Eğer data içinde id varsa Customer, yoksa Omit<Customer, ...> tipindedir.
      const customerToUpdate: Customer = 'id' in data && data.id
        ? { ...data as Customer, updatedAt: formatISO(new Date()) }
        : { ...data, id: initialCustomer.id, createdAt: initialCustomer.createdAt, updatedAt: formatISO(new Date()) };

      await storageUpdateCustomer(user.uid, customerToUpdate);
      toast({
        title: "Müşteri Güncellendi",
        description: `${customerToUpdate.name} müşteri bilgileri güncellendi.`,
      });
      setShowEditCustomerModal(false);
      await refreshCustomerData();
    } catch (error) {
      console.error("Müşteri güncellenirken hata:", error);
      toast({
        title: "Hata",
        description: "Müşteri bilgileri güncellenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [toast, refreshCustomerData, user, initialCustomer.id, initialCustomer.createdAt]);

  const balances = useMemo(() => {
    const newBalances: Record<Currency, number> = { USD: 0, TRY: 0 };
    sales.forEach(sale => {
      newBalances[sale.currency] = (newBalances[sale.currency] || 0) + sale.amount;
    });
    payments.forEach(payment => {
      newBalances[payment.currency] = (newBalances[payment.currency] || 0) - payment.amount;
    });
    return newBalances;
  }, [sales, payments]);

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

  const handleOpenAddSaleModal = useCallback(() => {
    console.log("Opening Sale Modal");
    if (!customer?.id) {
      toast({
        title: "Hata",
        description: "Müşteri bilgisi bulunamadı.",
        variant: "destructive",
      });
      return;
    }
    setEditingSale(null);
    setSaleFormValues(EMPTY_SALE_FORM_VALUES);
    setShowSaleModal(true);
  }, [customer?.id, toast]);

  const handleOpenEditSaleModal = (sale: Sale) => {
    console.log("handleOpenEditSaleModal called with sale:", sale);
    setEditingSale(sale);
    setSaleFormValues({
      amount: sale.amount.toString(),
      date: parseISO(sale.date),
      currency: sale.currency,
      stockItemId: sale.stockItemId === '' ? undefined : sale.stockItemId,
      description: sale.description || '',
      quantity: sale.quantity?.toString(),
      unitPrice: sale.unitPrice?.toString(),
    });
    setShowSaleModal(true);
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
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
      const amount = parseFloat(saleFormValues.amount);
      const date = formatISO(saleFormValues.date);

      if (editingSale) {
        const updatedSale: Sale = {
          ...editingSale,
          amount,
          date,
          currency: saleFormValues.currency,
          stockItemId: saleFormValues.stockItemId,
          description: saleFormValues.description || '',
          updatedAt: formatISO(new Date())
        };

        await storageUpdateSale(user.uid, updatedSale);
        setSales(sales.map(s => (s.id === editingSale.id ? updatedSale : s)));
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
          stockItemId: saleFormValues.stockItemId,
          description: saleFormValues.description || '',
          transactionType: 'sale',
          category: 'satis',
          tags: [],
          createdAt: formatISO(new Date()),
          updatedAt: formatISO(new Date())
        };

        const addedSale = await addSale(user.uid, newSale);
        setSales(prev => [...prev, addedSale]);
        toast({
          title: "Başarılı",
          description: "Yeni satış eklendi.",
        });
      }
      setShowSaleModal(false);
      setSaleFormValues(EMPTY_SALE_FORM_VALUES);
      setEditingSale(null);
    } catch (error) {
      console.error("Satış kaydederken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Satış kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSale = useCallback(async () => {
    if (!deletingSaleId || !user) return;
    try {
      await storageDeleteSale(user.uid, deletingSaleId);
      setSales(prev => prev.filter(s => s.id !== deletingSaleId));
      toast({ title: "Satış Silindi", description: "Satış başarıyla silindi." });
      setDeletingSaleId(null);
      await refreshCustomerData();
    } catch (error) {
      console.error("Satış silinirken hata:", error);
      toast({ title: "Hata", description: "Satış silinirken bir sorun oluştu.", variant: "destructive" });
    }
  }, [deletingSaleId, toast, refreshCustomerData, user]);

  const handleOpenAddPaymentModal = useCallback(() => {
    console.log("Opening Payment Modal");
    if (!customer?.id) {
      toast({
        title: "Hata",
        description: "Müşteri bilgisi bulunamadı.",
        variant: "destructive",
      });
      return;
    }
    setEditingPayment(null);
    setPaymentFormValues(EMPTY_PAYMENT_FORM_VALUES);
    setShowPaymentModal(true);
  }, [customer?.id, toast]);

  const handleOpenEditPaymentModal = useCallback((payment: Payment) => {
    setEditingPayment(payment);
    setPaymentFormValues({
      amount: payment.amount.toString(),
      date: isValid(parseISO(payment.date)) ? parseISO(payment.date) : new Date(),
      method: payment.method,
      currency: payment.currency,
      referenceNumber: payment.referenceNumber || '',
      description: payment.description || '',
      checkDate: payment.checkDate ? parseISO(payment.checkDate) : null,
      checkSerialNumber: payment.checkSerialNumber || null,
    });
    setShowPaymentModal(true);
  }, []);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
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
      const amount = parseFloat(paymentFormValues.amount);
      const date = formatISO(paymentFormValues.date);

      if (editingPayment) {
        const updatedPayment: Payment = {
          ...editingPayment,
          amount,
          date,
          method: paymentFormValues.method,
          currency: paymentFormValues.currency,
          referenceNumber: paymentFormValues.referenceNumber || null,
          description: paymentFormValues.description || '',
          checkDate: paymentFormValues.method === 'cek' && paymentFormValues.checkDate ? formatISO(paymentFormValues.checkDate) : null,
          checkSerialNumber: paymentFormValues.method === 'cek' ? (paymentFormValues.checkSerialNumber || null) : null,
          updatedAt: formatISO(new Date())
        };

        await storageUpdatePayment(user.uid, updatedPayment);
        setPayments(payments.map(p => (p.id === editingPayment.id ? updatedPayment : p)));
        toast({
          title: "Başarılı",
          description: "Ödeme güncellendi.",
        });
      } else {
        const newPayment: Omit<Payment, 'id'> = {
          customerId: customer.id,
          amount,
          date,
          method: paymentFormValues.method,
          currency: paymentFormValues.currency,
          referenceNumber: paymentFormValues.referenceNumber || null,
          description: paymentFormValues.description || '',
          checkDate: paymentFormValues.method === 'cek' && paymentFormValues.checkDate ? formatISO(paymentFormValues.checkDate) : null,
          checkSerialNumber: paymentFormValues.method === 'cek' ? (paymentFormValues.checkSerialNumber || null) : null,
          transactionType: 'payment',
          category: 'odeme',
          tags: [],
          createdAt: formatISO(new Date()),
          updatedAt: formatISO(new Date())
        };

        const addedPayment = await addPayment(user.uid, newPayment);
        setPayments(prev => [...prev, addedPayment]);
        toast({
          title: "Başarılı",
          description: "Yeni ödeme eklendi.",
        });
      }
      setShowPaymentModal(false);
      setPaymentFormValues(EMPTY_PAYMENT_FORM_VALUES);
      setEditingPayment(null);
    } catch (error) {
      console.error("Ödeme kaydederken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Ödeme kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePayment = useCallback(async () => {
    if (!deletingPaymentId || !user) return;
    try {
      await storageDeletePayment(user.uid, deletingPaymentId);
      setPayments(prev => prev.filter(p => p.id !== deletingPaymentId));
      toast({ title: "Ödeme Silindi", description: "Ödeme başarıyla silindi." });
      setDeletingPaymentId(null);
      await refreshCustomerData();
    } catch (error) {
      console.error("Ödeme silinirken hata:", error);
      toast({ title: "Hata", description: "Ödeme silinirken bir sorun oluştu.", variant: "destructive" });
    }
  }, [deletingPaymentId, toast, refreshCustomerData, user]);

  const safeFormatDate = (dateString: string, formatString: string) => {
    if (!dateString) return '-';
    const date = parseISO(dateString);
    return isValid(date) ? format(date, formatString, { locale: tr }) : '-';
  };

  // Satış formu için Stok Kalemi adını ve birimini getiren yardımcı fonksiyon
  const getStockItemNameForSaleForm = useCallback(async (stockItemId?: string): Promise<string> => {
    if (!stockItemId || stockItemId === 'none' || !user) return ""; // Manuel girişse veya kullanıcı yoksa boş döndür
    try {
      const stockItem = await getStockItemById(user.uid, stockItemId);
      return stockItem ? `${stockItem.name} (${stockItem.unit || 'Adet'})` : ""; // Bulunamazsa boş döndür
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

  // Tek bir satış veya ödeme işleminin detaylarını gösterir
  const renderTransactionDetail = (item: UnifiedTransactionClient) => {
    if (item.transactionType === 'sale') {
      const saleItem = item as Sale;
      return (
        <div className="flex flex-col">
          {saleItem.stockItemId && (
            <span className="text-sm text-muted-foreground">
              Stok: {stockItemDisplayNames[saleItem.stockItemId]}
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            Açıklama: {saleItem.description || '-'}
          </span>
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
        </div>
      );
    }
    return null;
  };

  const handleSaveNotes = useCallback(async () => {
    if (!user || !customer?.id) return;
    try {
      const updatedCustomer: Customer = { ...customer, notes: notesContent };
      await storageUpdateCustomer(user.uid, updatedCustomer);
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

  const handleDeleteCustomer = useCallback(async () => {
    if (!user || !deletingCustomer) return;
    try {
      await storageDeleteCustomer(user.uid, deletingCustomer);
      toast({
        title: "Müşteri Silindi",
        description: "Müşteri başarıyla silindi.",
      });
      // Müşteri silindikten sonra ana müşteri listesi sayfasına yönlendir
      window.location.href = "/customers"; 
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
  }, [user, deletingCustomer, toast]);

  const handleContactHistorySubmit = useCallback(async () => {
    if (!user) {
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
        date: formatISO(contactHistoryFormValues.date),
        type: contactHistoryFormValues.type,
        summary: contactHistoryFormValues.summary,
        notes: contactHistoryFormValues.notes || undefined,
        createdAt: formatISO(new Date()),
        updatedAt: formatISO(new Date()),
      };

      const updatedCustomer = {
        ...customer,
        contactHistory: [...(customer.contactHistory || []), newContactHistoryItem],
      };

      await storageUpdateCustomer(user.uid, updatedCustomer);
      setCustomer(updatedCustomer);
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
  }, [user, customer, contactHistoryFormValues, toast]);

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
    if (!user || !customer?.id) return;
    try {
      const updatedContactHistory = (customer.contactHistory || []).filter(item => item.id !== itemId);
      const updatedCustomer: Customer = { ...customer, contactHistory: updatedContactHistory };
      await storageUpdateCustomer(user.uid, updatedCustomer);
      setCustomer(updatedCustomer);
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
  }, [user, customer, toast]);

  const handleTaskFormSubmit = useCallback(async () => {
    if (!user || !customer?.id) return;
    try {
      const taskToSave = {
        ...taskFormValues,
        dueDate: taskFormValues.dueDate ? formatISO(taskFormValues.dueDate, { representation: 'date' }) : undefined,
        id: editingTask?.id || crypto.randomUUID(),
        createdAt: editingTask?.createdAt || formatISO(new Date()),
        updatedAt: formatISO(new Date()),
      };

      let updatedTasks: CustomerTask[];

      if (editingTask) {
        updatedTasks = (customer.tasks || []).map(task =>
          task.id === editingTask.id ? (taskToSave as CustomerTask) : task
        );
        toast({
          title: "Görev Güncellendi",
          description: "Görev başarıyla güncellendi.",
        });
      } else {
        updatedTasks = [...(customer.tasks || []), (taskToSave as CustomerTask)];
        toast({
          title: "Görev Eklendi",
          description: "Yeni görev başarıyla eklendi.",
        });
      }

      const updatedCustomer: Customer = { ...customer, tasks: updatedTasks };
      await storageUpdateCustomer(user.uid, updatedCustomer);
      setCustomer(updatedCustomer);
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
  }, [user, customer, taskFormValues, editingTask, toast]);

  const handleOpenAddTaskModal = useCallback(() => {
    setEditingTask(null);
    setTaskFormValues(EMPTY_TASK_FORM_VALUES);
    setShowTaskModal(true);
  }, []);

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
      await storageUpdateCustomer(user.uid, updatedCustomer);
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

  const exportToCSV = (transactions: UnifiedTransactionClient[], customerName: string) => {
    const headers = ['Tarih', 'İşlem Tipi', 'Tutar', 'Para Birimi', 'Açıklama'];
    const data = transactions.map(t => [
      format(parseISO(t.date), 'dd.MM.yyyy'),
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
      
      const monthSales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= monthStart && saleDate <= monthEnd;
      });

      const monthPayments = payments.filter(payment => {
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

    const sales = filteredAndSortedTransactions.filter(t => t.transactionType === 'sale').length;
    const payments = filteredAndSortedTransactions.filter(t => t.transactionType === 'payment').length;

    return [
      { name: 'Satışlar', value: sales, percentage: (sales / total) * 100 },
      { name: 'Ödemeler', value: payments, percentage: (payments / total) * 100 },
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
  const handleAddTag = (transactionId: string, tagName: string) => {
    const newTag: TransactionTag = {
      id: Math.random().toString(36).substr(2, 9),
      name: tagName,
      color: tagColors[Math.floor(Math.random() * tagColors.length)],
    };

    setSales(prevSales => 
      prevSales.map(sale => 
        sale.id === transactionId 
          ? { ...sale, tags: [...sale.tags, newTag] }
          : sale
      )
    );

    setPayments(prevPayments => 
      prevPayments.map(payment => 
        payment.id === transactionId 
          ? { ...payment, tags: [...payment.tags, newTag] }
          : payment
      )
    );
  };

  // Etiket silme
  const handleRemoveTag = (transactionId: string, tagId: string) => {
    setSales(prevSales => 
      prevSales.map(sale => 
        sale.id === transactionId 
          ? { ...sale, tags: sale.tags.filter(tag => tag.id !== tagId) }
          : sale
      )
    );

    setPayments(prevPayments => 
      prevPayments.map(payment => 
        payment.id === transactionId 
          ? { ...payment, tags: payment.tags.filter(tag => tag.id !== tagId) }
          : payment
      )
    );
  };

  const handleAddPayment = async (values: PaymentFormValues) => {
    try {
      const amount = parseFloat(values.amount);

      const newPayment: Payment = {
        id: Math.random().toString(36).substr(2, 9),
        customerId: customer.id,
        amount: amount,
        date: formatISO(values.date),
        currency: values.currency,
        method: values.method,
        description: values.description || `${values.method} ile ödeme`,
        transactionType: 'payment',
        category: 'odeme',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(values.referenceNumber && { referenceNumber: values.referenceNumber }),
      };

      setPayments(prevPayments => [...prevPayments, newPayment]);
      setShowPaymentModal(false);
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

  const handleEditCustomerSubmit = useCallback(async (updatedCustomer: Customer) => {
    if (!user) {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    try {
      await storageUpdateCustomer(user.uid, updatedCustomer);
      setCustomer(updatedCustomer);
      setShowEditCustomerModal(false);
      toast({
        title: "Başarılı",
        description: "Müşteri bilgileri güncellendi.",
      });
    } catch (error) {
      console.error("Error updating customer:", error);
      toast({
        title: "Hata",
        description: "Müşteri bilgileri güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

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
              <Button variant="destructive">
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
                <AlertDialogAction
                  onClick={() => setDeletingCustomer(customer.id)}
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
            <CardTitle className="text-sm font-medium">Toplam Satış</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales, 'TRY')}</div>
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
                    onClick={handleOpenAddSaleModal}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Satış Ekle
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleOpenAddPaymentModal}
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
                        <TableCell>{item.transactionType === 'sale' ? (
                          <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Satış</Badge>
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
                              if (item.transactionType === 'sale') {
                                setEditingSale(item as Sale);
                                setSaleFormValues({
                                  amount: (item as Sale).amount.toString(),
                                  date: parseISO((item as Sale).date),
                                  currency: (item as Sale).currency,
                                  stockItemId: (item as Sale).stockItemId || undefined,
                                  description: (item as Sale).description || '',
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
            <CardContent>
              <EditorContent editor={editor} />
              <Button onClick={handleSaveNotes} className="mt-4">Notları Kaydet</Button>
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
                  {(customer.contactHistory || []).length > 0 ? (
                    (customer.contactHistory || []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{safeFormatDate(item.date, 'dd.MM.yyyy')}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{item.summary}</TableCell>
                        <TableCell>{item.notes}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditContactHistoryModal(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteContactHistoryItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        İletişim geçmişi bulunamadı.
                      </TableCell>
                    </TableRow>
                  )}
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
                  {(customer.tasks || []).length > 0 ? (
                    (customer.tasks || []).map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.description}</TableCell>
                        <TableCell>{task.status}</TableCell>
                        <TableCell>{task.dueDate ? safeFormatDate(task.dueDate, 'dd.MM.yyyy') : '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTask(task);
                              setTaskFormValues({
                                description: task.description,
                                dueDate: task.dueDate ? parseISO(task.dueDate) : undefined,
                                status: task.status,
                              });
                              setShowTaskModal(true);
                            }}
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
          setSaleFormValues(EMPTY_SALE_FORM_VALUES);
          setEditingSale(null);
        }}
        onSubmit={handleSaleSubmit}
        formValues={saleFormValues}
        setFormValues={setSaleFormValues}
        availableStockItems={availableStockItems}
        stockItemDisplayNames={stockItemDisplayNames}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentFormValues(EMPTY_PAYMENT_FORM_VALUES);
          setEditingPayment(null);
        }}
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
        onConfirm={handleDeleteSale}
        title="Satışı Sil"
        description="Bu satışı silmek istediğinizden emin misiniz?"
      />

      <DeleteConfirmationModal
        isOpen={deletingPaymentId !== null}
        onClose={() => setDeletingPaymentId(null)}
        onConfirm={handleDeletePayment}
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
