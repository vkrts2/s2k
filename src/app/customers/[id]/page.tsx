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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
        if (!user || !customer) {
            toast({ title: "Hata", description: "Oturum doğrulanamadı. Lütfen tekrar deneyin.", variant: "destructive" });
            throw new Error('Missing user or customer');
        }
        if (!values.date || !(values.date instanceof Date) || isNaN(values.date.getTime())) {
            toast({ title: "Hata", description: "Lütfen geçerli bir tarih girin.", variant: "destructive" });
            throw new Error('Invalid date');
        }
        const parsedAmount = parseFloat(values.amount.toString().replace(',', '.'));
        if (isNaN(parsedAmount)) {
            toast({ title: "Hata", description: "Lütfen geçerli bir tutar girin.", variant: "destructive" });
            throw new Error('Invalid amount');
        }
        try {
            if (editingSale) {
                const qty = values.quantity ? parseFloat(values.quantity.toString().replace(',', '.')) : NaN;
                const price = values.unitPrice ? parseFloat(values.unitPrice.toString().replace(',', '.')) : NaN;

                const saleData: Sale = {
                    ...editingSale,
                    amount: parsedAmount,
                    date: formatISO(values.date as Date),
                    currency: values.currency,
                    description: values.description || '',
                    stockItemId: values.stockItemId || null,
                    quantity: !isNaN(qty) ? qty : null,
                    unitPrice: !isNaN(price) ? price : null,
                    taxRate: (values as any).taxRate !== undefined ? parseFloat((values as any).taxRate || '0') : editingSale.taxRate,
                    taxAmount: (values as any).taxAmount !== undefined ? parseFloat((values as any).taxAmount || '0') : editingSale.taxAmount,
                    subtotal: (values as any).subtotal !== undefined ? parseFloat((values as any).subtotal || '0') : editingSale.subtotal,
                    invoiceType: (values as any).invoiceType ?? editingSale.invoiceType,
                    items: (values as any).items ?? editingSale.items,
                    updatedAt: new Date().toISOString()
                };
                const updatedSale = await storage.updateSale(user.uid, saleData);
                // Önce iyimser güncelle
                setSales((prev: Sale[]) => prev.map((s: Sale) => s.id === updatedSale.id ? updatedSale : s));
                // Arka planda tazele, hatayı yok say
                storage.getSales(user.uid, customer.id).then(setSales).catch(() => {});
                toast({ title: 'Başarılı!', description: 'Satış başarıyla güncellendi.' });
            } else {
                const qty = values.quantity ? parseFloat(values.quantity.toString().replace(',', '.')) : NaN;
                const price = values.unitPrice ? parseFloat(values.unitPrice.toString().replace(',', '.')) : NaN;

                const newSaleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'transactionType'> = {
                  customerId: customer.id,
                  amount: parsedAmount,
                  date: (values.date as Date).toISOString(),
                  currency: values.currency,
                  description: values.description || '',
                  stockItemId: values.stockItemId || null,
                  quantity: !isNaN(qty) ? qty : null,
                  unitPrice: !isNaN(price) ? price : null,
                  taxRate: parseFloat((values as any).taxRate || '0'),
                  taxAmount: parseFloat((values as any).taxAmount || '0'),
                  subtotal: parseFloat((values as any).subtotal || '0'),
                  items: (values as any).items || undefined,
                  invoiceType: (values as any).invoiceType || undefined,
                  category: 'satis',
                  tags: [],
                };
                const newSale = await storage.addSale(user.uid, newSaleData);
                // Önce iyimser ekle
                setSales((prev: Sale[]) => [newSale, ...prev]);
                // Arka planda tazele, olası index hatasını yut
                storage.getSales(user.uid, customer.id).then(setSales).catch(() => {});
                toast({ title: 'Başarılı!', description: 'Satış başarıyla eklendi.' });
            }
        } catch (error) {
            console.error("Satış kaydedilirken hata:", error);
            toast({ title: "Hata", description: "Satış kaydedilemedi.", variant: "destructive" });
            throw error;
        }
    };

    const handlePaymentSubmit = async (values: PaymentFormValues, editingPayment: Payment | null) => {
        if (!user || !customer) return;
        try {
            // Ensure date is a valid Date before formatting
            if (!values.date || !(values.date instanceof Date) || isNaN(values.date.getTime())) {
                toast({ title: "Hata", description: "Lütfen geçerli bir tarih girin.", variant: "destructive" });
                return;
            }
            if (editingPayment) {
                 const paymentData: Payment = {
                    ...editingPayment,
                    date: formatISO(values.date as Date),
                    amount: parseFloat(values.amount.toString()),
                    currency: values.currency,
                    method: values.method,
                    description: values.description,
                    referenceNumber: values.referenceNumber,
                    checkDate: values.checkDate ? formatISO(values.checkDate as Date) : undefined,
                    checkSerialNumber: values.checkSerialNumber,
                    updatedAt: formatISO(new Date())
                };
                const updatedPayment = await storage.updatePayment(user.uid, paymentData);
                setPayments((prev: Payment[]) => prev.map((p: Payment) => p.id === updatedPayment.id ? updatedPayment : p));
                toast({ title: 'Başarılı!', description: 'Ödeme başarıyla güncellendi.' });
            } else {
                const now = new Date().toISOString();
                const newPaymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'transactionType'> = {
                    customerId: customer.id,
                    date: formatISO(values.date as Date),
                    amount: parseFloat(values.amount.toString()),
                    currency: values.currency,
                    method: values.method,
                    description: values.description,
                    referenceNumber: values.referenceNumber,
                    checkDate: values.checkDate ? formatISO(values.checkDate as Date) : undefined,
                    checkSerialNumber: values.checkSerialNumber,
                    category: 'odeme',
                    tags: [],
                };
                // Çek görseli varsa ekle (storage.addPayment içinde yüklenir)
                const maybeWithFile: any = { ...newPaymentData };
                // Görseli varsa, base64 veya URL bilgisini geçir (storage bu bilgilere göre yükleyecek)
                if ((values as any).checkImageUrl) {
                  (maybeWithFile as any).checkImageUrl = (values as any).checkImageUrl;
                } else if ((values as any).checkImageData) {
                  // Sunucu API üzerinden dataURL ile yükle, URL'i ekle
                  try {
                    const body = new FormData();
                    body.append('uid', user.uid);
                    body.append('dataUrl', (values as any).checkImageData);
                    if ((values as any).checkImageMimeType) body.append('mime', (values as any).checkImageMimeType);
                    const res = await fetch('/api/upload-check-image', { method: 'POST', body });
                    const json = await res.json();
                    if (res.ok && json?.url) {
                      (maybeWithFile as any).checkImageUrl = json.url;
                    }
                  } catch (e) {
                    console.error('Çek görseli API yükleme hatası:', e);
                  }
                }
                // API dönüşünde URL gelmemişse fallback olarak base64'i dokümana da yaz (detayda geçici görünür)
                if (!(maybeWithFile as any).checkImageUrl && (values as any).checkImageData) {
                  (maybeWithFile as any).checkImageData = (values as any).checkImageData;
                }
                const newPayment = await storage.addPayment(user.uid, { ...maybeWithFile, createdAt: now, updatedAt: now } as any);
                setPayments((prev: Payment[]) => [newPayment, ...prev]);
                toast({ title: 'Başarılı!', description: 'Ödeme başarıyla eklendi.' });

                // Eğer ödeme yöntemi çek ise, Çek Yönetimi'ne de otomatik kayıt aç
                if (values.method === 'cek') {
                  try {
                    const images: string[] | undefined = (maybeWithFile as any).checkImageUrl
                      ? [(maybeWithFile as any).checkImageUrl]
                      : undefined;
                    await storage.addCheck(user.uid, {
                      checkNumber: values.checkSerialNumber || newPayment.referenceNumber || '',
                      bankName: '',
                      branchName: undefined,
                      accountNumber: undefined,
                      amount: parseFloat(values.amount.toString()),
                      issueDate: formatISO(values.date as Date),
                      dueDate: values.checkDate ? (values.checkDate instanceof Date && !isNaN(values.checkDate.getTime()) ? formatISO(values.checkDate) : formatISO(values.date as Date)) : formatISO(values.date as Date),
                      status: 'pending',
                      partyName: customer.name,
                      partyType: 'customer',
                      description: values.description || undefined,
                      images,
                    });
                  } catch (e) {
                    console.error('Çek kaydı oluşturulurken hata:', e);
                    toast({ title: 'Uyarı', description: 'Ödeme kaydedildi ancak çek kaydı eklenemedi.', variant: 'destructive' });
                  }
                }
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
            setSales((prev: Sale[]) => prev.filter((s: Sale) => s.id !== saleId));
            
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
            setPayments((prev: Payment[]) => prev.filter((p: Payment) => p.id !== paymentId));
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
            updatedTasks = (customer.tasks || []).map((task: CustomerTask) =>
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
        const updatedTasks = (customer.tasks || []).filter((task: CustomerTask) => task.id !== taskId);
        await handleCustomerUpdate({ tasks: updatedTasks });
    };

    // Satış ve ödeme işlemlerinde amount alanı olmayan kayıtları filtrele
    const filteredSales = sales.filter((sale: Sale) => typeof sale.amount === 'number' && !isNaN(sale.amount));
    const filteredPayments = payments.filter((payment: Payment) => typeof payment.amount === 'number' && !isNaN(payment.amount));

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
    />
  );
}
