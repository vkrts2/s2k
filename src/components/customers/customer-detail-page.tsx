// src/components/customers/customer-detail-page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, FormEvent } from 'react';
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

type UnifiedTransactionClient = AppUnifiedTransaction;

export function CustomerDetailPageClient({ customer, sales, payments, user, onDataUpdated }: CustomerDetailPageClientProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleFormValues, setSaleFormValues] = useState<SaleFormValues>(EMPTY_SALE_FORM_VALUES);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFormValues, setPaymentFormValues] = useState<PaymentFormValues>(EMPTY_PAYMENT_FORM_VALUES);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);

  const [notesContent, setNotesContent] = useState(customer.notes || '');
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

  const totalSales = useMemo(() => {
    return sales.reduce((sum: number, sale: Sale) => sum + sale.amount, 0);
  }, [sales]);

  const totalPayments = useMemo(() => {
    return payments.reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
  }, [payments]);

  const balance = useMemo(() => {
    return totalSales - totalPayments;
  }, [totalSales, totalPayments]);

  const unifiedTransactions = useMemo(() => {
    const all = [
      ...sales.map((s: Sale) => ({ ...s, transactionType: 'sale' as const })),
      ...payments.map((p: Payment) => ({ ...p, transactionType: 'payment' as const }))
    ];
    return all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sales, payments]);

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

  const filteredAndSortedTransactions = useMemo(() => {
    const all: (Sale | Payment)[] = [
      ...sales.map((s: Sale) => ({ ...s, transactionType: 'sale' as const })),
      ...payments.map((p: Payment) => ({ ...p, transactionType: 'payment' as const }))
    ];

    const filtered = all.filter((item: Sale | Payment) => {
      const itemDate = parseISO(item.date);
      return (!dateRange?.from || itemDate >= dateRange.from) &&
             (!dateRange?.to || itemDate <= dateRange.to);
    });

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
    
    return searched.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [sales, payments, searchQuery, sortOrder, dateRange]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTransactions, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
  }, [filteredAndSortedTransactions.length, itemsPerPage]);


  const fetchStockItems = useCallback(async () => {
    if (!user) return;
    try {
      const items = await storage.getStockItems(user.uid);
      setAvailableStockItems(items);
      const displayNames = items.reduce((acc, item) => {
        acc[item.id] = item.name;
        return acc;
      }, {} as Record<string, string>);
      setStockItemDisplayNames(displayNames);
    } catch (error) {
      console.error("Stok kalemleri getirilirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Stok kalemleri getirilemedi.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const fetchContactHistory = useCallback(async () => {
    if (!user || !customer?.id) return;
    try {
      const history = await storage.getContactHistory(user.uid, customer.id);
      setContactHistory(history);
    } catch (error) {
      console.error("İletişim geçmişi getirilirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "İletişim geçmişi getirilemedi.",
        variant: "destructive",
      });
    }
  }, [user, customer?.id, toast]);

  useEffect(() => {
    fetchStockItems();
    fetchContactHistory();
  }, [fetchStockItems, fetchContactHistory]);

  const handleSaleSubmit = async (values: SaleFormValues) => {
    if (!user) return;
    try {
      const saleData: Omit<Sale, 'id' | 'transactionType' | 'createdAt' | 'updatedAt'> = {
        ...values,
        customerId: customer.id,
        date: formatISO(values.date),
        amount: parseFloat(values.amount.toString()),
        quantity: values.quantity ? parseFloat(values.quantity.toString()) : undefined,
        unitPrice: values.unitPrice ? parseFloat(values.unitPrice.toString()) : undefined,
        category: 'satis', 
        tags: [],
      };
      if (editingSale) {
        await storage.updateSale(user.uid, { ...saleData, id: editingSale.id } as Sale);
        toast({ title: 'Başarılı!', description: 'Satış başarıyla güncellendi.' });
      } else {
        await storage.addSale(user.uid, saleData);
        toast({ title: 'Başarılı!', description: 'Satış başarıyla eklendi.' });
      }
      onDataUpdated();
      setShowSaleModal(false);
      setEditingSale(null);
    } catch (error) {
      console.error("Satış kaydedilirken hata:", error);
      toast({ title: "Hata", description: "Satış kaydedilemedi.", variant: "destructive" });
    }
  };

  const handlePaymentSubmit = async (values: PaymentFormValues) => {
    if (!user) return;
    try {
      const paymentData: Omit<Payment, 'id' | 'transactionType'> = {
        ...values,
        customerId: customer.id,
        date: formatISO(values.date),
        amount: parseFloat(values.amount.toString()),
        checkDate: values.checkDate ? formatISO(values.checkDate) : null,
        createdAt: formatISO(new Date()),
        updatedAt: formatISO(new Date()),
        category: 'odeme',
        tags: [],
      };
      if (editingPayment) {
        await storage.updatePayment(user.uid, { ...paymentData, id: editingPayment.id } as Payment);
        toast({ title: 'Başarılı!', description: 'Ödeme başarıyla güncellendi.' });
      } else {
        await storage.addPayment(user.uid, paymentData);
        toast({ title: 'Başarılı!', description: 'Ödeme başarıyla eklendi.' });
      }
      onDataUpdated();
      setShowPaymentModal(false);
      setEditingPayment(null);
    } catch (error) {
      console.error("Ödeme kaydedilirken hata:", error);
      toast({ title: "Hata", description: "Ödeme kaydedilemedi.", variant: "destructive" });
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!user) return;
    try {
      await storage.storageDeleteSale(user.uid, saleId);
      toast({ title: "Başarılı", description: "Satış başarıyla silindi." });
      onDataUpdated();
      setDeletingSaleId(null);
    } catch (error) {
      console.error("Satış silinirken hata:", error);
      toast({ title: "Hata", description: "Satış silinemedi.", variant: "destructive" });
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!user) return;
    try {
      await storage.storageDeletePayment(user.uid, paymentId);
      toast({ title: "Başarılı", description: "Ödeme başarıyla silindi." });
      onDataUpdated();
      setDeletingPaymentId(null);
    } catch (error) {
      console.error("Ödeme silinirken hata:", error);
      toast({ title: "Hata", description: "Ödeme silinemedi.", variant: "destructive" });
    }
  };

  const handleCustomerDelete = async () => {
    if (!user || !customer) return;
    try {
      await storage.deleteCustomer(user.uid, customer.id);
      toast({
        title: "Başarılı",
        description: "Müşteri başarıyla silindi."
      });
      router.push('/customers');
    } catch (error) {
      console.error("Müşteri silinirken hata:", error);
      toast({
        title: "Hata",
        description: "Müşteri silinemedi.",
        variant: "destructive"
      });
    }
  };

  const handleSaveNotes = async () => {
    if (!user) return;
    try {
      await storage.updateCustomer(user.uid, { ...customer, notes: notesContent });
      toast({ title: 'Başarılı!', description: 'Notlar kaydedildi.' });
      onDataUpdated();
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast({
        title: 'Hata',
        description: 'Notlar kaydedilemedi.',
        variant: 'destructive',
      });
    }
  };

  const handleContactHistorySubmit = async (values: ContactHistoryFormValues) => {
    if (!user || !customer) return;
    try {
        const baseItem = {
            ...values,
            customerId: customer.id,
            date: formatISO(values.date),
        };

        if (editingContactHistoryItem) {
            const itemToUpdate: ContactHistoryItem = {
                ...baseItem,
                id: editingContactHistoryItem.id,
                createdAt: editingContactHistoryItem.createdAt,
                updatedAt: formatISO(new Date()),
            };
            await storage.updateContactHistory(user.uid, itemToUpdate);
            toast({ title: "Başarılı", description: "İletişim kaydı güncellendi." });
        } else {
            const newItem: Omit<ContactHistoryItem, 'id'> = {
                ...baseItem,
                createdAt: formatISO(new Date()),
                updatedAt: formatISO(new Date()),
            };
            await storage.addContactHistory(user.uid, newItem);
            toast({ title: "Başarılı", description: "İletişim kaydı eklendi." });
        }
        fetchContactHistory();
        setShowContactHistoryModal(false);
    } catch (error) {
        console.error("İletişim kaydı kaydedilirken hata oluştu:", error);
        toast({ title: "Hata", description: "İletişim kaydı kaydedilemedi.", variant: "destructive" });
    }
  };

  const handleDeleteContactHistoryItem = async (itemId: string) => {
    if (!user) return;
    try {
      await storage.deleteContactHistory(user.uid, itemId);
      toast({ title: "Başarılı", description: "İletişim kaydı silindi." });
      fetchContactHistory();
    } catch (error) {
      console.error("İletişim kaydı silinirken hata oluştu:", error);
      toast({ title: "Hata", description: "İletişim kaydı silinemedi.", variant: "destructive" });
    }
  };

  const handleCustomerUpdate = async (updatedData: Partial<Customer>) => {
    if (!user) return;
    try {
      const updatedCustomer = { ...customer, ...updatedData };
      await storage.updateCustomer(user.uid, updatedCustomer as Customer);
      toast({ title: 'Başarılı!', description: 'Müşteri bilgileri güncellendi.' });
      onDataUpdated();
      setShowEditCustomerModal(false);
    } catch (error) {
      console.error("Müşteri güncellenirken hata oluştu:", error);
      toast({ title: "Hata", description: "Müşteri güncellenemedi.", variant: "destructive" });
    }
  };
  
    const handleTaskSubmit = async (values: TaskFormValues) => {
        if (!user || !customer) return;
        try {
            let updatedCustomer: Customer;
            if (editingTask) {
                const updatedTasks = (customer.tasks || []).map(task =>
                    task.id === editingTask.id ? { ...task, ...values, updatedAt: formatISO(new Date()), dueDate: values.dueDate ? formatISO(values.dueDate) : undefined } : task
                );
                updatedCustomer = { ...customer, tasks: updatedTasks };
                await storage.updateCustomer(user.uid, updatedCustomer);
                toast({ title: "Görev Güncellendi", description: "Görev başarıyla güncellendi." });
            } else {
                const newTask: CustomerTask = {
                    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    ...values,
                    createdAt: formatISO(new Date()),
                    updatedAt: formatISO(new Date()),
                    dueDate: values.dueDate ? formatISO(values.dueDate) : undefined,
                };
                const updatedTasks = [...(customer.tasks || []), newTask];
                updatedCustomer = { ...customer, tasks: updatedTasks };
                await storage.updateCustomer(user.uid, updatedCustomer);
                toast({ title: "Görev Eklendi", description: "Yeni görev başarıyla eklendi." });
            }
            onDataUpdated();
            setShowTaskModal(false);
            setTaskFormValues(EMPTY_TASK_FORM_VALUES);
            setEditingTask(null);
        } catch (error) {
            console.error("Görev kaydedilirken hata oluştu:", error);
            toast({ title: "Hata", description: "Görev kaydedilirken bir sorun oluştu.", variant: "destructive" });
        }
    };
    
    const handleDeleteTask = async (taskId: string) => {
        if (!user || !customer) return;
        try {
            const updatedTasks = (customer.tasks || []).filter(task => task.id !== taskId);
            const updatedCustomer: Customer = { ...customer, tasks: updatedTasks };
            await storage.updateCustomer(user.uid, updatedCustomer);
            onDataUpdated();
            toast({
                title: "Görev Silindi",
                description: "Görev başarıyla listeden kaldırıldı.",
            });
        } catch (error) {
            console.error("Görev silinirken hata oluştu:", error);
            toast({
                title: "Hata",
                description: "Görev silinemedi.",
                variant: "destructive",
            });
        }
    };

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: notesContent,
    onUpdate: ({ editor }) => {
      setNotesContent(editor.getHTML());
    },
  });

  const formatCurrency = (amount: number, currency: Currency) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY' }).format(amount);
  };

  const safeFormatDate = (dateString: string | null | undefined, formatStr: string) => {
    if (!dateString) return "-";
    const date = parseISO(dateString);
    return isValid(date) ? format(date, formatStr, { locale: tr }) : "Geçersiz Tarih";
  };

  const renderTransactionDetail = (item: AppUnifiedTransaction) => {
    if (item.transactionType === 'sale') {
      const saleItem = item as Sale;
      return (
        <div className="flex flex-col text-xs">
          {saleItem.stockItemId && (
            <span className="font-semibold">Stok: {stockItemDisplayNames[saleItem.stockItemId] || '...'}</span>
          )}
          <span>{saleItem.description}</span>
        </div>
      );
    }
    if (item.transactionType === 'payment') {
      const paymentItem = item as Payment;
      return (
        <div className="flex flex-col text-xs">
          <span className="font-semibold">Yöntem: {paymentItem.method}</span>
          <span>{paymentItem.description}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <>
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push(`/customers/${customer.id}/extract`)}>
                  <FileText className="mr-2 h-4 w-4" /> Ekstre Görüntüle
              </Button>
              <Button variant="outline" onClick={() => setShowEditCustomerModal(true)}>
                  <Edit3 className="mr-2 h-4 w-4" /> Düzenle
              </Button>
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Sil
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Müşteriyi Sil</AlertDialogTitle>
                          <AlertDialogDescription>
                              Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve müşteriye ait tüm satış ve ödeme kayıtları silinir.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCustomerDelete}>Sil</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
          </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Satış</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {formatCurrency(totalSales, 'TRY')}
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Ödeme</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {formatCurrency(totalPayments, 'TRY')}
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bakiye</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${balance < 0 ? 'text-green-500' : 'text-red-500'}`}>
                   {formatCurrency(balance, 'TRY')}
                </div>
            </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList>
            <TabsTrigger value="transactions">İşlemler</TabsTrigger>
            <TabsTrigger value="notes">Notlar</TabsTrigger>
            <TabsTrigger value="contact-history">İletişim Geçmişi</TabsTrigger>
            <TabsTrigger value="tasks">Görevler</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>İşlemler</CardTitle>
                        <div className="flex gap-2">
                             <Button onClick={() => { setEditingSale(null); setSaleFormValues(EMPTY_SALE_FORM_VALUES); setShowSaleModal(true); }}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Satış Ekle
                            </Button>
                            <Button onClick={() => { setEditingPayment(null); setPaymentFormValues(EMPTY_PAYMENT_FORM_VALUES); setShowPaymentModal(true); }}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Ödeme Ekle
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tarih</TableHead>
                                <TableHead>Tip</TableHead>
                                <TableHead>Tutar</TableHead>
                                <TableHead>Detay</TableHead>
                                <TableHead className="text-right">İşlemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedTransactions.map((item) => (
                                <TableRow key={`${item.transactionType}-${item.id}`}>
                                    <TableCell>{format(parseISO(item.date), 'dd.MM.yyyy')}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.transactionType === 'sale' ? 'destructive' : 'default'}>
                                            {item.transactionType === 'sale' ? 'Satış' : 'Ödeme'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{formatCurrency(item.amount, item.currency || 'TRY')}</TableCell>
                                    <TableCell>
                                      {renderTransactionDetail(item)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button variant="ghost" size="sm" onClick={() => {
                                           if (item.transactionType === 'sale') {
                                                setEditingSale(item as Sale);
                                                setSaleFormValues({ 
                                                    ...(item as Sale), 
                                                    amount: (item as Sale).amount.toString(),
                                                    quantity: (item as Sale).quantity?.toString(),
                                                    unitPrice: (item as Sale).unitPrice?.toString(),
                                                    description: (item as Sale).description || '',
                                                    date: parseISO((item as Sale).date) 
                                                });
                                                setShowSaleModal(true);
                                            } else {
                                                setEditingPayment(item as Payment);
                                                setPaymentFormValues({ 
                                                    ...(item as Payment), 
                                                    amount: (item as Payment).amount.toString(),
                                                    date: parseISO((item as Payment).date), 
                                                    checkDate: (item as Payment).checkDate ? parseISO((item as Payment).checkDate as string) : null 
                                                });
                                                setShowPaymentModal(true);
                                            }
                                       }}> <Pencil className="h-4 w-4" /> </Button>
                                      <DeleteConfirmationModal
                                          isOpen={deletingSaleId === item.id || deletingPaymentId === item.id}
                                          onClose={() => { setDeletingSaleId(null); setDeletingPaymentId(null); }}
                                          onConfirm={() => item.transactionType === 'sale' ? handleDeleteSale(item.id) : handleDeletePayment(item.id)}
                                          title={item.transactionType === 'sale' ? "Satışı Sil" : "Ödemeyi Sil"}
                                          description={`Bu ${item.transactionType === 'sale' ? 'satışı' : 'ödemeyi'} silmek istediğinizden emin misiniz?`}
                                      />
                                      <Button variant="ghost" size="sm" onClick={() => item.transactionType === 'sale' ? setDeletingSaleId(item.id) : setDeletingPaymentId(item.id)}> <Trash2 className="h-4 w-4" /> </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
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
                        <Button onClick={() => {
                            setEditingContactHistoryItem(null);
                            setContactHistoryFormValues(EMPTY_CONTACT_HISTORY_FORM_VALUES);
                            setShowContactHistoryModal(true);
                        }}>
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
                                    <TableCell>{format(parseISO(item.date), 'dd.MM.yyyy')}</TableCell>
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
                                            onClick={() => handleDeleteContactHistoryItem(item.id)}
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
                        <Button onClick={() => {
                            setEditingTask(null);
                            setTaskFormValues(EMPTY_TASK_FORM_VALUES);
                            setShowTaskModal(true);
                        }}>
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
                                        <TableCell>{task.dueDate ? format(parseISO(task.dueDate), 'dd.MM.yyyy') : '-'}</TableCell>
                                        <TableCell>{task.status}</TableCell>
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
      </Tabs>
    </div>

    <EditCustomerModal
      isOpen={showEditCustomerModal}
      onClose={() => setShowEditCustomerModal(false)}
      customer={customer}
      onSave={handleCustomerUpdate}
    />
    <SaleModal
      isOpen={showSaleModal}
      onClose={() => setShowSaleModal(false)}
      onSubmit={handleSaleSubmit}
      formValues={saleFormValues}
      setFormValues={setSaleFormValues}
      availableStockItems={availableStockItems}
    />
    <PaymentModal
      isOpen={showPaymentModal}
      onClose={() => setShowPaymentModal(false)}
      onSubmit={handlePaymentSubmit}
      formValues={paymentFormValues}
      setFormValues={setPaymentFormValues}
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

    </>
  );
}
