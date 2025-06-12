// src/components/customers/customer-detail-page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Customer, Sale, Payment, Currency, UnifiedTransaction as AppUnifiedTransaction, StockItem, Price, ContactHistoryItem, CustomerTask, SaleFormValues, PaymentFormValues } from '@/lib/types';
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
import { PlusCircle, Trash2, DollarSign, ShoppingCart, Edit3, Pencil, CalendarIcon, FileText, Printer, History, ClipboardList, Download, Bold, Italic, List, ListOrdered, Strikethrough, Underline as UnderlineIcon } from 'lucide-react';
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
import Underline from '@tiptap/extension-underline';
import { SaleModal } from "./sale-modal";
import { PaymentModal } from "./payment-modal";
import { EditCustomerModal } from "./edit-customer-modal";
import { DeleteConfirmationModal } from "../common/delete-confirmation-modal";
import { ContactHistoryModal } from "./contact-history-modal";

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
  stockItemId: 'none',
  quantity: '',
  unitPrice: '',
};
const EMPTY_PAYMENT_FORM_VALUES: PaymentFormValues = {
  amount: '',
  date: new Date(),
  method: 'nakit',
  currency: 'TRY',
  referenceNumber: '',
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
                {item.transactionType === 'sale' && 'quantity' in item && 'unitPrice' in item && item.quantity && item.unitPrice && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Detay:</span>
                    <span className="text-sm">
                      {item.quantity} adet × {formatCurrency(item.unitPrice, item.currency)}
                    </span>
                  </div>
                )}
                {item.transactionType === 'payment' && ( // Mantıksal karşılaştırma düzeltildi ve Ödeme tipi için koşullu render
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ödeme Yöntemi:</span>
                    <span className="text-sm">{item.method}</span> {/* Artık tip hatası vermemesi gerekiyor */}
                  </div>
                )}
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
    const quantity = parseFloat(saleFormValues.quantity || '0');
    const price = parseFloat(saleFormValues.unitPrice || '0');
    if (saleFormValues.stockItemId && saleFormValues.stockItemId !== 'none' && !isNaN(quantity) && !isNaN(price) && quantity > 0 && price >= 0) {
      setSaleFormValues(prev => ({ ...prev, amount: (quantity * price).toFixed(2) }));
    } else if (!saleFormValues.stockItemId || saleFormValues.stockItemId === 'none') {
      // Allow manual amount entry if no stock item is selected or unit price/qty is zero
    } else {
       setSaleFormValues(prev => ({ ...prev, amount: ''})); // Clear amount if calculation is not possible
    }
  }, [saleFormValues.quantity, saleFormValues.unitPrice, saleFormValues.stockItemId]);

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
      quantity: sale.quantity?.toString() || '', // quantitySold yerine quantity
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

      let stockItemId: string | null = null;
      let quantity: number | null = null;
      let unitPrice: number | null = null;
      let totalPrice: number | null = null;
      let description = 'Satış';

      // Validate stock item related fields if a stock item is selected
      if (saleFormValues.stockItemId && saleFormValues.stockItemId !== 'none') {
        stockItemId = saleFormValues.stockItemId;
        
        if (!saleFormValues.quantity || !saleFormValues.unitPrice) {
          toast({
            title: "Hata",
            description: "Stok ürünü seçildiğinde miktar ve birim fiyat zorunludur.",
            variant: "destructive",
          });
          return;
        }

        quantity = parseFloat(saleFormValues.quantity);
        unitPrice = parseFloat(saleFormValues.unitPrice);

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

        // Check if there's enough stock
        const stockItem = await getStockItemById(user.uid, stockItemId);
        if (!stockItem || stockItem.currentStock < quantity) {
          toast({
            title: "Hata",
            description: "Yetersiz stok miktarı.",
            variant: "destructive",
          });
          return;
        }

        totalPrice = quantity * unitPrice;
        description = `${quantity} adet × ${unitPrice} ${saleFormValues.currency} (${stockItemDisplayNames[stockItemId] || ''})`;
      }

      const saleData: Sale = {
        id: editingSale?.id || Math.random().toString(36).substr(2, 9),
        customerId: customer.id,
        amount: amount,
        date: formatISO(saleFormValues.date),
        currency: saleFormValues.currency,
        stockItemId,
        quantity,
        unitPrice,
        totalPrice,
        category: 'satis',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transactionType: 'sale',
        description
      };

      if (editingSale) {
        await storageUpdateSale(user.uid, saleData);
        setSales(prev => prev.map(s => s.id === editingSale.id ? saleData : s));
        toast({ 
          title: "Satış Güncellendi", 
          description: "Satış işlemi başarıyla güncellendi." 
        });
      } else {
        const addedSale = await addSale(user.uid, saleData);
        setSales(prev => [...prev, addedSale]);
        toast({ 
          title: "Satış Eklendi", 
          description: "Yeni satış işlemi başarıyla eklendi." 
        });
      }

      setShowSaleModal(false);
      setSaleFormValues(EMPTY_SALE_FORM_VALUES);
      setEditingSale(null);
      await refreshCustomerData();
    } catch (error) {
      console.error("Satış kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Satış işlemi kaydedilirken bir sorun oluştu. Lütfen tekrar deneyin.",
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
      method: payment.paymentMethod, // paymentMethod kullanıldı
      currency: payment.currency,
      referenceNumber: payment.referenceNumber || '', // referans numarası eklendi
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

      const paymentData: Payment = {
        id: editingPayment?.id || Math.random().toString(36).substr(2, 9),
        customerId: customer.id,
        amount: amount,
        date: formatISO(paymentFormValues.date),
        currency: paymentFormValues.currency,
        paymentMethod: paymentFormValues.method,
        referenceNumber: paymentFormValues.referenceNumber || undefined,
        category: 'odeme',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transactionType: 'payment',
        method: paymentFormValues.method,
        description: `${paymentFormValues.method} ile ödeme`
      };

      if (editingPayment) {
        const updatedPayment = await storageUpdatePayment(user.uid, paymentData);
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
          description: "Yeni ödeme başarıyla eklendi.",
        });
      }

      setShowPaymentModal(false);
      setPaymentFormValues(EMPTY_PAYMENT_FORM_VALUES);
      setEditingPayment(null);
    } catch (error) {
      console.error('Ödeme eklenirken hata:', error);
      toast({
        title: "Hata",
        description: "Ödeme eklenirken bir sorun oluştu.",
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
  const renderTransactionDetail = (item: UnifiedTransactionClient) => {
    const isSale = item.transactionType === 'sale';
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
        {isSale && 'quantity' in item && 'unitPrice' in item && item.quantity && item.unitPrice && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Detay:</span>
            <span className="text-sm">
              {item.quantity} adet × {formatCurrency(item.unitPrice, item.currency)}
            </span>
          </div>
        )}
        {item.transactionType === 'payment' && ( // Mantıksal karşılaştırma düzeltildi ve Ödeme tipi için koşullu render
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Ödeme Yöntemi:</span>
            <span className="text-sm">{item.method}</span> {/* Artık tip hatası vermemesi gerekiyor */}
          </div>
        )}
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

  // Satış ekleme
  const handleAddSale = async (values: SaleFormValues) => {
    try {
      const amount = parseFloat(values.amount);
      const quantity = values.quantity ? parseFloat(values.quantity) : 0;
      const unitPrice = values.unitPrice ? parseFloat(values.unitPrice) : 0;

      const newSale: Sale = {
        id: Math.random().toString(36).substr(2, 9),
        customerId: customer.id,
        amount: amount,
        date: formatISO(values.date),
        currency: values.currency,
        stockItemId: values.stockItemId === 'none' ? undefined : values.stockItemId,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: quantity * unitPrice,
        category: 'satis',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transactionType: 'sale'
      };

      setSales(prevSales => [...prevSales, newSale]);
      setShowSaleModal(false);
      toast({
        title: "Satış eklendi",
        description: "Yeni satış başarıyla eklendi.",
      });
    } catch (error) {
      console.error('Satış eklenirken hata:', error);
      toast({
        title: "Hata",
        description: "Satış eklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };

  // Ödeme ekleme
  const handleAddPayment = async (values: PaymentFormValues) => {
    try {
      const amount = parseFloat(values.amount);

      const newPayment: Payment = {
        id: Math.random().toString(36).substr(2, 9),
        customerId: customer.id,
        amount: amount,
        date: formatISO(values.date),
        paymentMethod: values.method,
        currency: values.currency,
        category: 'odeme',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        method: values.method,
        transactionType: 'payment',
        description: `${values.method} ile ödeme`
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
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>{customer.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sales">
            <TabsList>
              <TabsTrigger value="sales">Satışlar</TabsTrigger>
              <TabsTrigger value="payments">Ödemeler</TabsTrigger>
              <TabsTrigger value="contact-history">İletişim Geçmişi</TabsTrigger>
            </TabsList>
            <TabsContent value="sales">
              <div className="flex justify-end mb-4">
                <Button onClick={() => {
                  setEditingSale(null);
                  setSaleFormValues(EMPTY_SALE_FORM_VALUES);
                  setShowSaleModal(true);
                }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Satış Ekle
                </Button>
              </div>
              {/* Sales table */}
            </TabsContent>
            <TabsContent value="payments">
              <div className="flex justify-end mb-4">
                <Button onClick={() => {
                  setEditingPayment(null);
                  setPaymentFormValues(EMPTY_PAYMENT_FORM_VALUES);
                  setShowPaymentModal(true);
                }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Ödeme Ekle
                </Button>
              </div>
              {/* Payments table */}
            </TabsContent>
            <TabsContent value="contact-history">
              <div className="flex justify-end mb-4">
                <Button onClick={() => {
                  setEditingContactHistoryItem(null);
                  setContactHistoryFormValues(EMPTY_CONTACT_HISTORY_FORM_VALUES);
                  setShowContactHistoryModal(true);
                }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  İletişim Ekle
                </Button>
              </div>
              {/* Contact history table */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <SaleModal
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
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
        onSubmit={handleEditCustomerSubmit}
        customer={customer}
        setCustomer={setCustomer}
      />

      <DeleteConfirmationModal
        isOpen={!!deletingCustomer}
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
      />
    </div>
  );
}
