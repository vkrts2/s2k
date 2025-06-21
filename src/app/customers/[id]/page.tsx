"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Customer, Sale, Payment, StockItem, ContactHistoryItem, SaleFormValues, PaymentFormValues, CustomerTask, TaskFormValues } from '@/lib/types';
import * as storage from '@/lib/storage';
import { CustomerDetailPageClient } from '@/components/customers/customer-detail-page';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatISO } from 'date-fns';

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = typeof params.id === 'string' ? params.id : undefined;
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [availableStockItems, setAvailableStockItems] = useState<StockItem[]>([]);
  const [contactHistory, setContactHistory] = useState<ContactHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCustomerFound, setIsCustomerFound] = useState(true);

  const router = useRouter();

  const fetchStockItems = useCallback(async () => {
    if (!user) return;
    try {
      const items = await storage.getStockItems(user.uid);
      setAvailableStockItems(items);
    } catch (error) {
      console.error("Stok kalemleri getirilirken hata oluştu:", error);
      toast({ title: "Hata", description: "Stok kalemleri getirilemedi.", variant: "destructive" });
    }
  }, [user?.uid, toast]);

  const fetchContactHistory = useCallback(async () => {
    if (!user || !customerId) return;
    try {
      const history = await storage.getContactHistory(user.uid, customerId);
      setContactHistory(history);
    } catch (error) {
      console.error("İletişim geçmişi getirilirken hata oluştu:", error);
      toast({ title: "Hata", description: "İletişim geçmişi getirilemedi.", variant: "destructive" });
    }
  }, [user?.uid, customerId, toast]);

  const fetchData = useCallback(async () => {
    if (!user || !customerId) return;
    setIsLoading(true);
    setError(null);
    try {
        const fetchedCustomer = await storage.getCustomerById(user.uid, customerId);
        if (fetchedCustomer) {
          setCustomer(fetchedCustomer);
          setSales(await storage.getSales(user.uid, customerId));
          setPayments(await storage.getPayments(user.uid, customerId));
          await fetchStockItems();
          await fetchContactHistory();
          document.title = `${fetchedCustomer.name} | Müşteri Detayları | ERMAY`;
        } else {
          setIsCustomerFound(false);
        }
    } catch (e) {
      console.error("Error fetching customer data:", e);
      setError("Müşteri verileri yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, [customerId, user?.uid, fetchStockItems, fetchContactHistory]);

  useEffect(() => {
    if (!authLoading && user?.uid) {
      fetchData();
    }
  }, [authLoading, user?.uid, fetchData]);

    // Olay Yöneticileri (Event Handlers) with OPTIMISTIC UPDATES
    const handleSaleSubmit = async (values: SaleFormValues, editingSale: Sale | null) => {
        if (!user || !customer) return;
        // amount alanı kontrolü
        const parsedAmount = parseFloat(values.amount.toString());
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            toast({ title: "Hata", description: "Lütfen geçerli bir tutar girin.", variant: "destructive" });
            return;
        }
        try {
            const saleData = { ...values, customerId: customer.id, date: formatISO(values.date), amount: parsedAmount, quantity: values.quantity ? parseFloat(values.quantity.toString()) : undefined, unitPrice: values.unitPrice ? parseFloat(values.unitPrice.toString()) : undefined, category: 'satis' as const, tags: [] };
            if (editingSale) {
                const updatedSale: Sale = { ...editingSale, ...saleData, updatedAt: formatISO(new Date()) };
                await storage.updateSale(user.uid, updatedSale);
                setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
                toast({ title: 'Başarılı!', description: 'Satış başarıyla güncellendi.' });
            } else {
                const newSale = await storage.addSale(user.uid, saleData);
                setSales(prev => [newSale, ...prev]);
                toast({ title: 'Başarılı!', description: 'Satış başarıyla eklendi.' });
            }
        } catch (error) {
            console.error("Satış kaydedilirken hata:", error);
            toast({ title: "Hata", description: "Satış kaydedilemedi.", variant: "destructive" });
        }
    };

    const handlePaymentSubmit = async (values: PaymentFormValues, editingPayment: Payment | null) => {
        if (!user || !customer) return;
        try {
            const paymentData = { ...values, customerId: customer.id, date: formatISO(values.date), amount: parseFloat(values.amount.toString()), checkDate: values.checkDate ? formatISO(values.checkDate) : null, category: 'odeme' as const, tags: [] };
            if (editingPayment) {
                const updatedPayment: Payment = { ...editingPayment, ...paymentData, updatedAt: formatISO(new Date()) };
                await storage.updatePayment(user.uid, updatedPayment);
                setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
                toast({ title: 'Başarılı!', description: 'Ödeme başarıyla güncellendi.' });
            } else {
                const newPaymentData: Omit<Payment, 'id' | 'transactionType'> = { ...paymentData, createdAt: formatISO(new Date()), updatedAt: formatISO(new Date()) };
                const newPayment = await storage.addPayment(user.uid, newPaymentData);
                setPayments(prev => [newPayment, ...prev]);
                toast({ title: 'Başarılı!', description: 'Ödeme başarıyla eklendi.' });
            }
        } catch (error) {
            console.error("Ödeme kaydedilirken hata:", error);
            toast({ title: "Hata", description: "Ödeme kaydedilemedi.", variant: "destructive" });
        }
    };
    
    const handleSaleDelete = async (saleId: string) => {
        if (!user) return;
        try {
            // Önce UI'ı güncelle
            setSales(prev => prev.filter(s => s.id !== saleId));
            
            // Silme işlemini gerçekleştir
            await storage.storageDeleteSale(user.uid, saleId);
            
            // Kısa bir gecikme sonrası Firestore'dan tekrar kontrol et
            setTimeout(async () => {
                try {
                    const verifySnap = await storage.getSales(user.uid, customerId);
                    setSales(verifySnap);
                } catch (verifyError) {
                    console.error("Veri doğrulama hatası:", verifyError);
                }
            }, 1000);
    
            toast({ title: "Başarılı", description: "Satış başarıyla silindi." });
        } catch (error) {
            console.error("Satış silinirken hata:", error);
            // Hata durumunda silinen veriyi geri al
            const currentSales = await storage.getSales(user.uid, customerId);
            setSales(currentSales);
            toast({ 
                title: "Hata", 
                description: "Satış silinemedi. Lütfen tekrar deneyin.", 
                variant: "destructive" 
            });
        }
    };

    const handlePaymentDelete = async (paymentId: string) => {
        if (!user) return;
        try {
            await storage.storageDeletePayment(user.uid, paymentId);
            setPayments(prev => prev.filter(p => p.id !== paymentId));
            toast({ title: "Başarılı", description: "Ödeme başarıyla silindi." });
        } catch (error) {
            console.error("Ödeme silinirken hata:", error);
            toast({ title: "Hata", description: "Ödeme silinemedi.", variant: "destructive" });
        }
    };

    const handleCustomerDelete = async () => {
        if (!user || !customerId) return;
        try {
            await storage.deleteCustomer(user.uid, customerId);
            toast({ title: "Başarılı", description: "Müşteri başarıyla silindi." });
            router.push('/customers');
        } catch (error) {
            console.error("Müşteri silinirken hata:", error);
            toast({ title: "Hata", description: "Müşteri silinemedi.", variant: "destructive" });
        }
    };

    const handleCustomerUpdate = async (updatedData: Partial<Customer>) => {
        if (!user || !customer) return;
        try {
            const updatedCustomer = { ...customer, ...updatedData } as Customer;
            await storage.updateCustomer(user.uid, updatedCustomer);
            setCustomer(updatedCustomer);
            toast({ title: 'Başarılı!', description: 'Müşteri bilgileri güncellendi.' });
        } catch (error) {
            console.error("Müşteri güncellenirken hata oluştu:", error);
            toast({ title: "Hata", description: "Müşteri güncellenemedi.", variant: "destructive" });
        }
    };

    const handleNotesSave = async (notes: string) => {
        if (!user || !customer) return;
        try {
            const updatedCustomer = { ...customer, notes };
            await storage.updateCustomer(user.uid, updatedCustomer as Customer);
            setCustomer(updatedCustomer as Customer);
            toast({ title: 'Başarılı!', description: 'Notlar kaydedildi.' });
        } catch (error) {
            console.error('Failed to save notes:', error);
            toast({ title: 'Hata', description: 'Notlar kaydedilemedi.', variant: 'destructive' });
        }
    };

    const handleContactHistorySubmit = async (values: Omit<ContactHistoryItem, 'id'>, editingItem: ContactHistoryItem | null) => {
        if (!user || !customer) return;
        try {
            if (editingItem) {
                await storage.updateContactHistory(user.uid, { ...values, id: editingItem.id });
            } else {
                await storage.addContactHistory(user.uid, values);
            }
            fetchContactHistory();
        } catch (error) {
            console.error("İletişim kaydı kaydedilirken hata:", error);
            toast({ title: "Hata", description: "İletişim kaydı kaydedilemedi.", variant: "destructive" });
        }
    };

    const handleContactHistoryDelete = async (itemId: string) => {
        if (!user) return;
        try {
            await storage.deleteContactHistory(user.uid, itemId);
            fetchContactHistory();
        } catch (error) {
            console.error("İletişim kaydı silinirken hata:", error);
            toast({ title: "Hata", description: "İletişim kaydı silinemedi.", variant: "destructive" });
        }
    };

    const handleTaskSubmit = async (values: TaskFormValues, editingTask: CustomerTask | null) => {
        if (!user || !customer) return;
        let updatedTasks: CustomerTask[];
        if (editingTask) {
            updatedTasks = (customer.tasks || []).map(task =>
                task.id === editingTask.id ? { ...task, ...values, updatedAt: formatISO(new Date()), dueDate: values.dueDate ? formatISO(values.dueDate) : undefined } : task
            );
        } else {
            const newTask: CustomerTask = {
                id: `task_${Date.now()}`,
                ...values,
                createdAt: formatISO(new Date()),
                updatedAt: formatISO(new Date()),
                dueDate: values.dueDate ? formatISO(values.dueDate) : undefined,
            };
            updatedTasks = [...(customer.tasks || []), newTask];
        }
        await handleCustomerUpdate({ tasks: updatedTasks });
    };

    const handleTaskDelete = async (taskId: string) => {
        if (!customer) return;
        const updatedTasks = (customer.tasks || []).filter(task => task.id !== taskId);
        await handleCustomerUpdate({ tasks: updatedTasks });
    };

    // Satış ve ödeme işlemlerinde amount alanı olmayan kayıtları filtrele
    const filteredSales = sales.filter(sale => typeof sale.amount === 'number' && !isNaN(sale.amount));
    const filteredPayments = payments.filter(payment => typeof payment.amount === 'number' && !isNaN(payment.amount));

  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Bir Hata Oluştu</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button asChild variant="outline">
          <Link href="/customers">Müşteriler Sayfasına Geri Dön</Link>
        </Button>
      </div>
    );
  }

  if (!isCustomerFound || !customer) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Müşteri Bulunamadı</h1>
        <p className="text-muted-foreground mb-4">
          Bu ID ({customerId || 'N/A'}) ile bir müşteri bulunamadı.
        </p>
        <Button asChild variant="outline">
          <Link href="/customers">Müşteriler Sayfasına Geri Dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <CustomerDetailPageClient
      customer={customer}
      sales={filteredSales}
      payments={filteredPayments}
      user={user}
      availableStockItems={availableStockItems}
      contactHistory={contactHistory}
      notes={customer.notes || ''}
      onSaleSubmit={handleSaleSubmit}
      onPaymentSubmit={handlePaymentSubmit}
      onSaleDelete={handleSaleDelete}
      onPaymentDelete={handlePaymentDelete}
      onCustomerDelete={handleCustomerDelete}
      onCustomerUpdate={handleCustomerUpdate}
      onNotesSave={handleNotesSave}
      onContactHistorySubmit={handleContactHistorySubmit}
      onContactHistoryDelete={handleContactHistoryDelete}
      onTaskSubmit={handleTaskSubmit}
      onTaskDelete={handleTaskDelete}
      fetchContactHistory={fetchContactHistory}
    />
  );
}
