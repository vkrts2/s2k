// src/components/customers/customer-detail-page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Customer, Sale, Payment, Currency, UnifiedTransaction as AppUnifiedTransaction, StockItem, Price, ContactHistoryItem, CustomerTask } from '@/lib/types';
import {
  addSale,
  updateSale as storageUpdateSale,
  deleteSale as storageDeleteSale,
  addPayment,
  updatePayment as storageUpdatePayment,
  deletePayment as storageDeletePayment,
  updateCustomer as storageUpdateCustomer,
  getCustomerById,
  getStockItems,
  getStockItemById,
  deleteCustomer as storageDeleteCustomer
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
import { PlusCircle, Trash2, DollarSign, ShoppingCart, Edit3, Pencil, CalendarIcon, FileText, Printer, History, ClipboardList, Download, Bold, Italic, List, ListOrdered, Strikethrough, Underline } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid, formatISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CustomerForm } from './customer-form';
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

interface CustomerDetailPageClientProps {
  customer: Customer;
  initialSales: Sale[];
  initialPayments: Payment[];
  user: any;
}

type SaleFormValues = {
  amount: string;
  date: Date;
  currency: Currency;
  stockItemId?: string;
  quantitySold?: string;
  unitPrice?: string; // Bu birim fiyatı, amount hesaplandıktan sonra da saklanacak.
};
type PaymentFormValues = {
  amount: string;
  date: Date;
  method: string;
  currency: Currency;
};

// Yeni: İletişim Geçmişi Form Değerleri
type ContactHistoryFormValues = {
  date: Date;
  type: 'phone' | 'email' | 'meeting' | 'other';
  summary: string;
  notes: string;
};

// Yeni: Görev Form Değerleri
type TaskFormValues = {
  description: string;
  dueDate?: Date;
  status: 'pending' | 'completed' | 'in-progress';
};

const EMPTY_SALE_FORM_VALUES: SaleFormValues = {
  amount: '',
  date: new Date(),
  currency: 'TRY',
  stockItemId: 'none', // undefined yerine 'none' olarak ayarlandı
  quantitySold: '',
  unitPrice: '',
};
const EMPTY_PAYMENT_FORM_VALUES: PaymentFormValues = {
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
const EMPTY_TASK_FORM_VALUES: TaskFormValues = {
  description: '',
  dueDate: undefined,
  status: 'pending',
};

type UnifiedTransaction = (Sale & { transactionType: 'sale' }) | (Payment & { transactionType: 'payment', description: string });

export function CustomerDetailPageClient({ customer: initialCustomer, initialSales, initialPayments, user }: CustomerDetailPageClientProps) {
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [availableStockItems, setAvailableStockItems] = useState<StockItem[]>([]);

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

  // Calculate totals
  const totalSales = useMemo(() => {
    return sales.reduce((sum, sale) => sum + sale.amount, 0);
  }, [sales]);

  const totalPayments = useMemo(() => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [payments]);

  const balance = useMemo(() => {
    return totalSales - totalPayments;
  }, [totalSales, totalPayments]);

  // Combine sales and payments into a unified list
  const unifiedTransactions = useMemo(() => {
    const salesWithType = sales.map(sale => ({ ...sale, transactionType: 'sale' as const }));
    const paymentsWithType = payments.map(payment => ({ ...payment, transactionType: 'payment' as const }));
    return [...salesWithType, ...paymentsWithType] as UnifiedTransaction[];
  }, [sales, payments]);

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
        const stockItemName = item.transactionType === 'sale' && 'stockItemId' in item && item.stockItemId 
          ? stockItemDisplayNames[item.stockItemId] 
          : '';
        
        return amount.includes(query) || 
               date.toLowerCase().includes(query) || 
               stockItemName.toLowerCase().includes(query);
      });
    }

    // Apply sorting
    return filtered.sort((a: UnifiedTransaction, b: UnifiedTransaction) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [unifiedTransactions, searchQuery, sortOrder, stockItemDisplayNames, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTransactions, currentPage]);

  // Recent transactions summary (last 5 transactions)
  const recentTransactions = useMemo(() => {
    return filteredAndSortedTransactions.slice(0, 5);
  }, [filteredAndSortedTransactions]);

  // Print view component
  const PrintView = () => (
    <div className="p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">{customer.name}</h1>
        <p className="text-sm text-muted-foreground">
          {dateRange?.from && dateRange?.to
            ? `${safeFormatDate(dateRange.from.toISOString(), 'dd.MM.yyyy')} - ${safeFormatDate(dateRange.to.toISOString(), 'dd.MM.yyyy')}`
            : 'Tüm İşlemler'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Toplam Satış</div>
          <div className="text-xl font-bold text-blue-600">{formatCurrency(totalSales, 'TRY')}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Toplam Ödeme</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(totalPayments, 'TRY')}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Bakiye</div>
          <div className={cn(
            "text-xl font-bold",
            balance > 0 ? "text-red-600" : "text-green-600"
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
            <tr key={`${item.transactionType}-${item.id}`} className="border-b">
              <td className="p-2">{safeFormatDate(item.date, 'dd.MM.yyyy')}</td>
              <td className="p-2">{item.transactionType === 'sale' ? 'Satış' : 'Ödeme'}</td>
              <td className="p-2 text-right">{formatCurrency(item.amount, item.currency)}</td>
              <td className="p-2">
                {item.transactionType === 'sale' && 'stockItemId' in item && item.stockItemId
                  ? stockItemDisplayNames[item.stockItemId]
                  : item.transactionType === 'payment'
                  ? `Ödeme: ${item.method}`
                  : 'Manuel İşlem'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (showPrintView) {
    return (
      <div className="print:block hidden">
        <PrintView />
      </div>
    );
  }

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

  useEffect(() => {
    const fetchDisplayNames = async () => {
      const uniqueStockItemIds = new Set<string>();
      sales.forEach(sale => {
        if (sale.stockItemId) uniqueStockItemIds.add(sale.stockItemId);
      });

      const namesMap: Record<string, string> = {};
      for (const stockItemId of Array.from(uniqueStockItemIds)) {
        namesMap[stockItemId] = await getStockItemName(stockItemId);
      }
      setStockItemDisplayNames(namesMap);
    };

    fetchDisplayNames();
  }, [sales, payments, getStockItemName]);

  useEffect(() => {
    setCustomer(initialCustomer);
    setSales(initialSales);
    setPayments(initialPayments);
    if (typeof window !== "undefined" && user) {
        getStockItems(user.uid).then(items => setAvailableStockItems(items));
    }
  }, [initialCustomer, initialSales, initialPayments, user]);

  useEffect(() => {
    const quantity = parseFloat(saleFormValues.quantitySold || '0');
    const price = parseFloat(saleFormValues.unitPrice || '0');
    if (saleFormValues.stockItemId && saleFormValues.stockItemId !== 'none' && !isNaN(quantity) && !isNaN(price) && quantity > 0 && price >= 0) {
      setSaleFormValues(prev => ({ ...prev, amount: (quantity * price).toFixed(2) }));
    } else if (!saleFormValues.stockItemId || saleFormValues.stockItemId === 'none') {
      // Allow manual amount entry if no stock item is selected or unit price/qty is zero
    } else {
       setSaleFormValues(prev => ({ ...prev, amount: ''})); // Clear amount if calculation is not possible
    }
  }, [saleFormValues.quantitySold, saleFormValues.unitPrice, saleFormValues.stockItemId]);

  useEffect(() => {
    // Stok kalemi seçildiğinde birim fiyatını otomatik doldurma mantığını kaldırıyoruz
    // Artık StockItem'ın salePrice özelliği yok, bu yüzden kullanıcı manuel olarak girecek.
        setSaleFormValues(prev => ({ ...prev, unitPrice: '', currency: 'TRY' }));
  }, [saleFormValues.stockItemId]);

  const refreshCustomerData = useCallback(async () => {
    if (!customer?.id || !user) return;
    const freshCustomer = await getCustomerById(user.uid, customer.id);
    if (freshCustomer) {
      setCustomer(freshCustomer);
      document.title = `${freshCustomer.name} | Müşteri Detayları | ERMAY`;
    }
    if (typeof window !== "undefined" && user) {
      getStockItems(user.uid).then(items => setAvailableStockItems(items));
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

  const handleOpenEditSaleModal = useCallback((sale: Sale) => {
    setEditingSale(sale);
    setSaleFormValues({
      amount: sale.amount.toString(),
      date: isValid(parseISO(sale.date)) ? parseISO(sale.date) : new Date(),
      currency: sale.currency,
      stockItemId: sale.stockItemId || undefined,
      quantitySold: sale.quantitySold?.toString() || '',
      unitPrice: sale.unitPrice?.toString() || '',
    });
    setShowSaleModal(true);
  }, []);

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !customer?.id) {
      toast({
        title: "Hata",
        description: "Satış eklenirken bir sorun oluştu: Kullanıcı girişi yapılmamış veya müşteri bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFloat(saleFormValues.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Hata",
          description: "Lütfen geçerli bir satış tutarı girin.",
          variant: "destructive",
        });
        return;
      }

      const quantity = parseFloat(saleFormValues.quantitySold || '0');
      const unitPrice = parseFloat(saleFormValues.unitPrice || '0');

      if (saleFormValues.stockItemId && saleFormValues.stockItemId !== 'none') {
        if (isNaN(quantity) || quantity <= 0) {
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
      }

      const saleData = {
        customerId: customer.id,
        amount,
        date: formatISO(saleFormValues.date),
        currency: saleFormValues.currency,
        stockItemId: saleFormValues.stockItemId === 'none' ? null : (saleFormValues.stockItemId || null), // Eğer boşsa null olarak ayarla
        quantitySold: quantity > 0 ? quantity : null, // Eğer 0 veya NaN ise null olarak ayarla
        unitPrice: unitPrice > 0 ? unitPrice : null, // Eğer 0 veya NaN ise null olarak ayarla
        transactionType: 'sale' as const
      };

      if (editingSale) {
        const updatedSale = await storageUpdateSale(user.uid, { ...saleData, id: editingSale.id });
        setSales(prev => prev.map(s => s.id === editingSale.id ? updatedSale : s));
        toast({
          title: "Başarılı",
          description: "Satış başarıyla güncellendi.",
        });
      } else {
        const newSale = await addSale(user.uid, saleData);
        setSales(prev => [...prev, newSale]);
        toast({
          title: "Başarılı",
          description: "Satış başarıyla eklendi.",
        });
      }

      setShowSaleModal(false);
      setSaleFormValues(EMPTY_SALE_FORM_VALUES);
      setEditingSale(null);
      await refreshCustomerData();
    } catch (error) {
      console.error("Satış eklenirken hata:", error);
      toast({
        title: "Hata",
        description: "Satış eklenirken bir sorun oluştu. Lütfen tekrar deneyin.",
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
      method: payment.method || '',
      currency: payment.currency,
    });
    setShowPaymentModal(true);
  }, []);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !customer?.id) {
      toast({
        title: "Hata",
        description: "Ödeme eklenirken bir sorun oluştu: Kullanıcı girişi yapılmamış veya müşteri bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFloat(paymentFormValues.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Hata",
          description: "Lütfen geçerli bir ödeme tutarı girin.",
          variant: "destructive",
        });
      return;
    }

      if (!paymentFormValues.method) {
        toast({
          title: "Hata",
          description: "Lütfen bir ödeme yöntemi seçin.",
          variant: "destructive",
        });
        return;
      }

      const paymentData = {
        customerId: customer.id,
        amount,
        date: formatISO(paymentFormValues.date),
        method: paymentFormValues.method || 'cash',
        currency: paymentFormValues.currency,
        transactionType: 'payment' as const,
        description: ''
      };

      if (editingPayment) {
        const updatedPayment = await storageUpdatePayment(user.uid, { ...paymentData, id: editingPayment.id });
        setPayments(prev => prev.map(p => p.id === editingPayment.id ? updatedPayment : p));
        toast({
          title: "Başarılı",
          description: "Ödeme başarıyla güncellendi.",
        });
      } else {
        const newPayment = await addPayment(user.uid, paymentData);
        setPayments(prev => [...prev, newPayment]);
        toast({
          title: "Başarılı",
          description: "Ödeme başarıyla eklendi.",
        });
      }

      setShowPaymentModal(false);
      setPaymentFormValues(EMPTY_PAYMENT_FORM_VALUES);
      setEditingPayment(null);
      await refreshCustomerData();
    } catch (error) {
      console.error("Ödeme eklenirken hata:", error);
      toast({
        title: "Hata",
        description: "Ödeme eklenirken bir sorun oluştu. Lütfen tekrar deneyin.",
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
  const renderTransactionDetail = (item: UnifiedTransaction) => {
    const isSale = item.transactionType === 'sale';
    const stockItemName = isSale && 'stockItemId' in item && item.stockItemId ? stockItemDisplayNames[item.stockItemId] : undefined;
    const formattedDate = safeFormatDate(item.date, 'dd MMMM yyyy');
    const formattedAmount = formatCurrency(item.amount, item.currency);

      return (
        <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isSale ? (
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            ) : (
              <DollarSign className="h-4 w-4 text-green-500" />
            )}
            <span className="font-medium">
              {isSale ? 'Satış' : 'Ödeme'}
            </span>
        </div>
          <span className="text-sm text-muted-foreground">{formattedDate}</span>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Tutar:</span>
            <span className={cn(
              "font-semibold",
              isSale ? "text-blue-600" : "text-green-600"
            )}>
              {formattedAmount}
            </span>
          </div>

          {isSale && stockItemName && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ürün:</span>
              <span className="text-sm">{stockItemName}</span>
            </div>
          )}

          {isSale && 'quantitySold' in item && 'unitPrice' in item && item.quantitySold && item.unitPrice && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Detay:</span>
              <span className="text-sm">
                {item.quantitySold} adet × {formatCurrency(item.unitPrice, item.currency)}
              </span>
            </div>
          )}

          {!isSale && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ödeme Yöntemi:</span>
              <span className="text-sm">{item.method}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isSale) {
                setEditingSale(item);
                setSaleFormValues({
                  amount: item.amount.toString(),
                  date: parseISO(item.date),
                  currency: item.currency,
                  stockItemId: 'stockItemId' in item ? item.stockItemId || 'none' : 'none',
                  quantitySold: 'quantitySold' in item ? item.quantitySold?.toString() || '' : '',
                  unitPrice: 'unitPrice' in item ? item.unitPrice?.toString() || '' : '',
                });
                setShowSaleModal(true);
    } else {
                setEditingPayment(item);
                setPaymentFormValues({
                  amount: item.amount.toString(),
                  date: parseISO(item.date),
                  method: item.method,
                  currency: item.currency,
                });
                setShowPaymentModal(true);
              }
            }}
          >
            <Edit3 className="h-4 w-4 mr-1" />
            Düzenle
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => {
              if (isSale) {
                setDeletingSaleId(item.id);
              } else {
                setDeletingPaymentId(item.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Sil
          </Button>
        </div>
        </div>
      );
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

  const handleContactHistoryFormSubmit = useCallback(async () => {
    if (!user || !customer?.id) return;
    try {
      const itemToSave = {
        ...contactHistoryFormValues,
        date: formatISO(contactHistoryFormValues.date),
        id: editingContactHistoryItem?.id || crypto.randomUUID(),
      };

      let updatedContactHistory: ContactHistoryItem[];

      if (editingContactHistoryItem) {
        updatedContactHistory = (customer.contactHistory || []).map(item =>
          item.id === editingContactHistoryItem.id ? (itemToSave as ContactHistoryItem) : item
        );
        toast({
          title: "İletişim Güncellendi",
          description: "İletişim geçmişi kaydı başarıyla güncellendi.",
        });
      } else {
        updatedContactHistory = [...(customer.contactHistory || []), (itemToSave as ContactHistoryItem)];
        toast({
          title: "İletişim Eklendi",
          description: "Yeni iletişim geçmişi kaydı başarıyla eklendi.",
        });
      }

      const updatedCustomer: Customer = { ...customer, contactHistory: updatedContactHistory };
      await storageUpdateCustomer(user.uid, updatedCustomer);
      setCustomer(updatedCustomer);
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
  }, [user, customer, contactHistoryFormValues, editingContactHistoryItem, toast]);

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

  const exportToCSV = useCallback((transactions: UnifiedTransaction[], customerName: string) => {
    const headers = ['Tarih', 'İşlem Tipi', 'Tutar', 'Para Birimi', 'Detay'];
    const rows = transactions.map(item => {
      const date = safeFormatDate(item.date, 'dd.MM.yyyy');
      const type = item.transactionType === 'sale' ? 'Satış' : 'Ödeme';
      const amount = item.amount.toString();
      const currency = item.currency;
      let detail = '';

      if (item.transactionType === 'sale') {
        const stockItemName = 'stockItemId' in item && item.stockItemId 
          ? stockItemDisplayNames[item.stockItemId] 
          : '';
        const quantity = 'quantitySold' in item ? item.quantitySold : undefined;
        const unitPrice = 'unitPrice' in item ? item.unitPrice : undefined;
        
        if (stockItemName && quantity && unitPrice) {
          detail = `${stockItemName} - ${quantity} adet × ${unitPrice} ${currency}`;
        } else {
          detail = 'Manuel Satış';
        }
      } else {
        detail = `Ödeme Yöntemi: ${item.method}`;
      }

      return [date, type, amount, currency, detail];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
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
  }, [stockItemDisplayNames]);

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
    extensions: [StarterKit],
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

  // Satış ekleme
  const handleAddSale = async (values: SaleFormValues) => {
    try {
      const newSale: Sale = {
        id: Math.random().toString(36).substr(2, 9),
        customerId: customer.id,
        amount: values.amount,
        date: values.date,
        currency: values.currency,
        stockItemId: values.stockItemId,
        quantity: values.quantitySold || 0,
        unitPrice: values.unitPrice || 0,
        totalPrice: (values.quantitySold || 0) * (values.unitPrice || 0),
        category: 'satis',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transactionType: 'sale'
      };

      setSales(prevSales => [...prevSales, newSale]);
      setShowAddSaleModal(false);
      toast({
        title: "Satış eklendi",
        description: "Yeni satış başarıyla eklendi.",
      });
    } catch (error) {
      console.error('Satış eklenirken hata:', error);
      toast({
        title: "Hata",
        description: "Satış eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  // Ödeme ekleme
  const handleAddPayment = async (values: PaymentFormValues) => {
    try {
      const newPayment: Payment = {
        id: Math.random().toString(36).substr(2, 9),
        customerId: customer.id,
        amount: values.amount,
        date: values.date,
        paymentMethod: values.method as 'nakit' | 'krediKarti' | 'havale' | 'diger',
        currency: values.currency,
        category: 'odeme',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transactionType: 'payment'
      };

      setPayments(prevPayments => [...prevPayments, newPayment]);
      setShowAddPaymentModal(false);
      toast({
        title: "Ödeme eklendi",
        description: "Yeni ödeme başarıyla eklendi.",
      });
    } catch (error) {
      console.error('Ödeme eklenirken hata:', error);
      toast({
        title: "Hata",
        description: "Ödeme eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{customer.name} Detayları</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowEditCustomerModal(true)} variant="outline">
            <Pencil className="mr-2 h-4 w-4" /> Düzenle
          </Button>
          <Button onClick={() => setDeletingCustomer(customer.id)} variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Sil
          </Button>
          <Button asChild variant="outline">
            <Link href={`/customers/${customer.id}/statement`} target="_blank">
              <FileText className="mr-2 h-4 w-4" /> Ekstre Görüntüle
            </Link>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Toplam Satış</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-blue-600">{formatCurrency(totalSales, 'TRY')}</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Toplam Ödeme</CardTitle>
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
            <p className={`text-3xl font-extrabold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(balance, 'TRY')}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">İşlemler</TabsTrigger>
          <TabsTrigger value="statistics">İstatistikler</TabsTrigger>
          <TabsTrigger value="notes">Notlar</TabsTrigger>
          <TabsTrigger value="contact">İletişim Geçmişi</TabsTrigger>
          <TabsTrigger value="tasks">Görevler</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Toplam Satış</CardTitle>
        </CardHeader>
        <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalSales, 'TRY')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Toplam Ödeme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalPayments, 'TRY')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Bakiye</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  balance > 0 ? "text-red-600" : "text-green-600"
                )}>
                  {formatCurrency(balance, 'TRY')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions Summary */}
          {recentTransactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Son İşlemler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentTransactions.map((item) => (
                    <div
                      key={`${item.transactionType}-${item.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center space-x-2">
                        {item.transactionType === 'sale' ? (
                          <ShoppingCart className="h-4 w-4 text-blue-500" />
                        ) : (
                          <DollarSign className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-sm">
                          {safeFormatDate(item.date, 'dd MMM yyyy')}
                        </span>
                      </div>
                      <span className={cn(
                        "font-medium",
                        item.transactionType === 'sale' ? "text-blue-600" : "text-green-600"
                      )}>
                        {formatCurrency(item.amount, item.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">İşlemler</h2>
            <div className="space-x-2">
                      <Button
                variant="outline"
                onClick={() => setShowPrintView(true)}
              >
                <Printer className="h-4 w-4 mr-2" />
                Yazdır
                      </Button>
              <Button
                variant="outline"
                onClick={() => exportToCSV(filteredAndSortedTransactions, customer.name)}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV İndir
              </Button>
              <Button onClick={() => {
                setEditingSale(null);
                setSaleFormValues(EMPTY_SALE_FORM_VALUES);
                setShowSaleModal(true);
              }}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Satış Ekle
              </Button>
              <Button onClick={() => {
                setEditingPayment(null);
                setPaymentFormValues(EMPTY_PAYMENT_FORM_VALUES);
                setShowPaymentModal(true);
              }}>
                <DollarSign className="h-4 w-4 mr-2" />
                Ödeme Ekle
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Search, Date Range, and Sort Controls */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="İşlem ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "dd.MM.yyyy")} -{" "}
                                {format(dateRange.to, "dd.MM.yyyy")}
                              </>
                            ) : (
                              format(dateRange.from, "dd.MM.yyyy")
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
                    <Select
                      value={sortOrder}
                      onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sıralama" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">En Yeni</SelectItem>
                        <SelectItem value="asc">En Eski</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {paginatedTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery || dateRange ? 'Arama kriterlerine uygun işlem bulunamadı.' : 'Henüz hiç işlem bulunmuyor.'}
                  </div>
                ) : (
                  <>
                    {paginatedTransactions.map((transaction) => (
                      <Card key={transaction.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            {transaction.transactionType === 'sale' ? 'Satış' : 'Ödeme'}
                          </CardTitle>
                          <div className="flex items-center space-x-2">
                            <Select
                              value={transaction.category}
                              onValueChange={(value: TransactionCategory) => {
                                if (transaction.transactionType === 'sale') {
                                  setSales(prevSales =>
                                    prevSales.map(sale =>
                                      sale.id === transaction.id
                                        ? { ...sale, category: value }
                                        : sale
                                    )
                                  );
                                } else {
                                  setPayments(prevPayments =>
                                    prevPayments.map(payment =>
                                      payment.id === transaction.id
                                        ? { ...payment, category: value }
                                        : payment
                                    )
                                  );
                                }
                              }}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {transactionCategories.map((category) => (
                                  <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                              onClick={() => {
                                const tagName = prompt('Etiket adı:');
                                if (tagName) {
                                  handleAddTag(transaction.id, tagName);
                                }
                              }}
                            >
                              <PlusCircle className="h-4 w-4" />
                      </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                {safeFormatDate(transaction.date, 'dd MMMM yyyy')}
                              </span>
                              <span className="text-sm font-medium">
                                {formatCurrency(transaction.amount, transaction.currency)}
                              </span>
                            </div>
                            {transaction.transactionType === 'sale' && (
                              <div className="text-sm text-muted-foreground">
                                {stockItemDisplayNames[transaction.stockItemId]} - {transaction.quantity} adet
                              </div>
                            )}
                            {transaction.transactionType === 'payment' && (
                              <div className="text-sm text-muted-foreground">
                                {transaction.paymentMethod === 'nakit' && 'Nakit'}
                                {transaction.paymentMethod === 'krediKarti' && 'Kredi Kartı'}
                                {transaction.paymentMethod === 'havale' && 'Havale'}
                                {transaction.paymentMethod === 'diger' && 'Diğer'}
                                {transaction.referenceNumber && ` - ${transaction.referenceNumber}`}
                              </div>
                            )}
                            {transaction.tags && transaction.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {transaction.tags.map((tag) => (
                                  <Badge
                                    key={tag.id}
                                    variant="secondary"
                                    className={tag.color}
                                  >
                                    {tag.name}
                                    <button
                                      className="ml-1 hover:text-destructive"
                                      onClick={() => handleRemoveTag(transaction.id, tag.id)}
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
        </CardContent>
      </Card>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center space-x-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          Önceki
                        </Button>
                        <span className="text-sm">
                          Sayfa {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Sonraki
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Aylık İşlem Grafiği */}
      <Card>
              <CardHeader>
                <CardTitle>Aylık İşlemler</CardTitle>
                <CardDescription>
                  {dateRange?.from && dateRange?.to
                    ? `${safeFormatDate(dateRange.from.toISOString(), 'dd.MM.yyyy')} - ${safeFormatDate(dateRange.to.toISOString(), 'dd.MM.yyyy')}`
                    : 'Son 6 Ay'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value, 'TRY')}
                        labelFormatter={(label) => `${label}`}
                      />
                      <Bar dataKey="satışlar" fill="#3b82f6" name="Satışlar" />
                      <Bar dataKey="ödemeler" fill="#22c55e" name="Ödemeler" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* İşlem Dağılımı */}
            <Card>
              <CardHeader>
                <CardTitle>İşlem Dağılımı</CardTitle>
                <CardDescription>Toplam {filteredAndSortedTransactions.length} işlem</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactionTypeDistribution.map((item) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {item.value} işlem ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            item.name === 'Satışlar' ? "bg-blue-500" : "bg-green-500"
                          )}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ortalama İşlem Tutarları */}
            <Card>
              <CardHeader>
                <CardTitle>Ortalama İşlem Tutarları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Ortalama Satış Tutarı</span>
                    <span className="text-sm font-bold text-blue-600">
                      {formatCurrency(
                        sales.length > 0
                          ? sales.reduce((sum, sale) => sum + sale.amount, 0) / sales.length
                          : 0,
                        'TRY'
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Ortalama Ödeme Tutarı</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(
                        payments.length > 0
                          ? payments.reduce((sum, payment) => sum + payment.amount, 0) / payments.length
                          : 0,
                        'TRY'
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* İşlem Sıklığı */}
            <Card>
              <CardHeader>
                <CardTitle>İşlem Sıklığı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Aylık Ortalama İşlem</span>
                    <span className="text-sm font-bold">
                      {monthlyStats.length > 0
                        ? (filteredAndSortedTransactions.length / monthlyStats.length).toFixed(1)
                        : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Son İşlem Tarihi</span>
                    <span className="text-sm text-muted-foreground">
                      {filteredAndSortedTransactions.length > 0
                        ? safeFormatDate(filteredAndSortedTransactions[0].date, 'dd MMMM yyyy')
                        : '-'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Müşteri Notları</CardTitle>
              <CardDescription>
                Müşteri ile ilgili önemli notları buraya ekleyebilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg">
                  <div className="border-b p-2 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                      className={editor?.isActive('bold') ? 'bg-muted' : ''}
                    >
                      <Bold className="h-4 w-4" />
          </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                      className={editor?.isActive('italic') ? 'bg-muted' : ''}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleUnderline().run()}
                      className={editor?.isActive('underline') ? 'bg-muted' : ''}
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleStrike().run()}
                      className={editor?.isActive('strike') ? 'bg-muted' : ''}
                    >
                      <Strikethrough className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleBulletList().run()}
                      className={editor?.isActive('bulletList') ? 'bg-muted' : ''}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                      className={editor?.isActive('orderedList') ? 'bg-muted' : ''}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-4 min-h-[200px] prose prose-sm max-w-none">
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>İletişim Geçmişi</CardTitle>
              <CardDescription>Müşteriyle yapılan tüm iletişimleri takip edin.</CardDescription>
        </CardHeader>
        <CardContent>
              <div className="rounded-md border mb-4">
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
                    {customer.contactHistory && customer.contactHistory.length > 0 ? (
                      customer.contactHistory.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{safeFormatDate(item.date, 'dd.MM.yyyy HH:mm')}</TableCell>
                          <TableCell className="capitalize">{item.type}</TableCell>
                          <TableCell>{item.summary}</TableCell>
                          <TableCell>{item.notes || '-'}</TableCell>
                    <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleOpenEditContactHistoryModal(item)}>
                                <Pencil className="h-4 w-4" />
                      </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteContactHistoryItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                            </div>
                    </TableCell>
                  </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Henüz iletişim geçmişi kaydı bulunmamaktadır.
                        </TableCell>
                      </TableRow>
                    )}
              </TableBody>
            </Table>
              </div>
              <Button onClick={handleOpenAddContactHistoryModal}>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni İletişim Ekle
              </Button>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
      <Card>
            <CardHeader>
              <CardTitle>Görevler</CardTitle>
              <CardDescription>Bu müşteriyle ilgili yapılacak görevleri yönetin.</CardDescription>
        </CardHeader>
        <CardContent>
              <div className="rounded-md border mb-4">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Açıklama</TableHead>
                      <TableHead>Son Tarih</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Oluşturulma Tarihi</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                    {customer.tasks && customer.tasks.length > 0 ? (
                      customer.tasks.sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()).map(task => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.description}</TableCell>
                          <TableCell>{task.dueDate ? safeFormatDate(task.dueDate, 'dd.MM.yyyy') : '-'}</TableCell>
                          <TableCell className="capitalize">{task.status === 'pending' ? 'Beklemede' : task.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'}</TableCell>
                          <TableCell>{safeFormatDate(task.createdAt, 'dd.MM.yyyy HH:mm')}</TableCell>
                    <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleOpenEditTaskModal(task)}>
                                <Pencil className="h-4 w-4" />
                          </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteTask(task.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Henüz görev kaydı bulunmamaktadır.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleOpenAddTaskModal}>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Görev Ekle
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* İletişim Geçmişi Ekle/Düzenle Modalı */}
      <Dialog open={showContactHistoryModal} onOpenChange={setShowContactHistoryModal}>
        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
            <DialogTitle>{editingContactHistoryItem ? "İletişim Geçmişini Düzenle" : "Yeni İletişim Ekle"}</DialogTitle>
            <DialogDescription>
              {editingContactHistoryItem ? "Mevcut iletişim kaydını düzenleyin." : "Müşteriyle yeni bir iletişim kaydı oluşturun."}
            </DialogDescription>
                          </DialogHeader>
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
                    {contactHistoryFormValues.date ? format(contactHistoryFormValues.date, "PPP", { locale: tr }) : <span>Tarih Seç</span>}
                          </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={contactHistoryFormValues.date}
                    onSelect={(date) => date && setContactHistoryFormValues(prev => ({ ...prev, date }))}
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
                onValueChange={(value: 'phone' | 'email' | 'meeting' | 'other') => setContactHistoryFormValues(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="İletişim Tipi Seçin" />
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
              <Label htmlFor="contactSummary" className="text-right">Özet</Label>
              <Input
                id="contactSummary"
                value={contactHistoryFormValues.summary}
                onChange={(e) => setContactHistoryFormValues(prev => ({ ...prev, summary: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactNotes" className="text-right">Notlar</Label>
              <Textarea
                id="contactNotes"
                value={contactHistoryFormValues.notes}
                onChange={(e) => setContactHistoryFormValues(prev => ({ ...prev, notes: e.target.value }))}
                className="col-span-3"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">İptal</Button>
            </DialogClose>
            <Button onClick={handleContactHistoryFormSubmit}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Görev Ekle/Düzenle Modalı */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Görevi Düzenle" : "Yeni Görev Ekle"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Mevcut görevi düzenleyin." : "Yeni bir görev kaydı oluşturun."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taskDescription" className="text-right">Açıklama</Label>
              <Input
                id="taskDescription"
                value={taskFormValues.description}
                onChange={(e) => setTaskFormValues(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
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
                    {taskFormValues.dueDate ? format(taskFormValues.dueDate, "PPP", { locale: tr }) : <span>Tarih Seç</span>}
                          </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={taskFormValues.dueDate}
                    onSelect={(date) => setTaskFormValues(prev => ({ ...prev, dueDate: date || undefined }))}
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
                onValueChange={(value: 'pending' | 'completed' | 'in-progress') => setTaskFormValues(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Durum Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Beklemede</SelectItem>
                  <SelectItem value="in-progress">Devam Ediyor</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">İptal</Button>
            </DialogClose>
            <Button onClick={handleTaskFormSubmit}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Satış Ekle/Düzenle Modalı */}
      <Dialog open={showSaleModal} onOpenChange={setShowSaleModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingSale ? "Satışı Düzenle" : "Satış Ekle"}</DialogTitle>
            <DialogDescription>
              {editingSale ? "Mevcut satış bilgilerini düzenleyin." : "Yeni bir satış kaydı oluşturun."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="saleAmount" className="text-right">Tutar</Label>
                <Input
                  id="saleAmount"
                  type="number"
                  value={saleFormValues.amount}
                  onChange={(e) => setSaleFormValues(prev => ({ ...prev, amount: e.target.value }))}
                  className="col-span-3"
                  required
                  step="0.01"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="saleCurrency" className="text-right">Para Birimi</Label>
                <Select
                  value={saleFormValues.currency}
                  onValueChange={(value: Currency) => setSaleFormValues(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Para Birimi Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="saleDate" className="text-right">Tarih</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="saleDate"
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !isValid(saleFormValues.date) && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {isValid(saleFormValues.date) ? format(saleFormValues.date, "PPP", {locale: tr}) : <span>Tarih seçin</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={saleFormValues.date}
                      onSelect={(date) => setSaleFormValues(prev => ({ ...prev, date: date || new Date() }))}
                      initialFocus
                      locale={tr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stockItem" className="text-right">Stok Kalemi</Label>
                <Select
                  value={saleFormValues.stockItemId || 'none'}
                  onValueChange={(value: string) => setSaleFormValues(prev => ({ ...prev, stockItemId: value === 'none' ? undefined : value }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Stok Kalemi Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Manuel Giriş</SelectItem>
                    {availableStockItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {saleFormValues.stockItemId && saleFormValues.stockItemId !== 'none' && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="quantitySold" className="text-right">Miktar</Label>
                    <Input
                      id="quantitySold"
                      type="number"
                      value={saleFormValues.quantitySold}
                      onChange={(e) => setSaleFormValues(prev => ({ ...prev, quantitySold: e.target.value }))}
                      className="col-span-3"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="unitPrice" className="text-right">Birim Fiyat</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      value={saleFormValues.unitPrice}
                      onChange={(e) => setSaleFormValues(prev => ({ ...prev, unitPrice: e.target.value }))}
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
              <Button type="submit">{editingSale ? "Kaydet" : "Ekle"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ödeme Ekle/Düzenle Modalı */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingPayment ? "Ödemeyi Düzenle" : "Ödeme Ekle"}</DialogTitle>
            <DialogDescription>
              {editingPayment ? "Mevcut ödeme bilgilerini düzenleyin." : "Yeni bir ödeme kaydı oluşturun."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentAmount" className="text-right">Tutar</Label>
              <Input
                id="paymentAmount"
                type="number"
                value={paymentFormValues.amount}
                onChange={(e) => setPaymentFormValues(prev => ({ ...prev, amount: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentCurrency" className="text-right">Para Birimi</Label>
              <Select
                value={paymentFormValues.currency}
                onValueChange={(value: Currency) => setPaymentFormValues(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Para Birimi Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentDate" className="text-right">Tarih</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !paymentFormValues.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentFormValues.date ? format(paymentFormValues.date, "PPP", { locale: tr }) : <span>Tarih Seç</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={paymentFormValues.date}
                    onSelect={(date) => date && setPaymentFormValues(prev => ({ ...prev, date }))}
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
                value={paymentFormValues.method}
                onChange={(e) => setPaymentFormValues(prev => ({ ...prev, method: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">İptal</Button>
            </DialogClose>
            <Button onClick={handlePaymentSubmit}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Müşteri Düzenleme Modalı */}
      <Dialog open={showEditCustomerModal} onOpenChange={setShowEditCustomerModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Müşteriyi Düzenle</DialogTitle>
            <DialogDescription>
              Müşteri bilgilerini burada düzenleyin.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            initialData={customer}
            onSubmit={handleCustomerUpdate}
            onCancel={() => setShowEditCustomerModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Satış Silme Onay Modalı */}
      <AlertDialog open={!!deletingSaleId} onOpenChange={(open) => !open && setDeletingSaleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Satışı Sil?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu satış kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSale}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ödeme Silme Onay Modalı */}
      <AlertDialog open={!!deletingPaymentId} onOpenChange={(open) => !open && setDeletingPaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ödemeyi Sil?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu ödeme kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Müşteri Silme Onay Modalı */}
      <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Müşteriyi Sil?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu müşteriyi ve tüm ilişkili verilerini (satışlar, ödemeler, notlar, iletişim geçmişi, görevler) silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
