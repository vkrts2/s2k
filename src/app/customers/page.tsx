"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Customer, Sale, Payment } from "@/lib/types";
import {
  getCustomers,
  addCustomer as storageAddCustomer,
  updateCustomer as storageUpdateCustomer,
  deleteCustomer as storageDeleteCustomer,
  getSales,
  getPayments,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CustomerList } from "@/components/customers/customer-list";
import { CustomerForm } from "@/components/customers/customer-form";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function CustomersPage() {
  const { user, loading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);

  const { toast } = useToast();

  console.log("CustomersPage render - authLoading:", authLoading, "User:", user ? user.uid : "null");

  const loadData = useCallback(async () => {
    console.log("loadData called - User:", user ? user.uid : "null", "authLoading:", authLoading);
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    if (!user) {
      setIsLoading(false);
      console.log("loadData: User is null, returning.");
      return;
    }
    
    setIsLoading(true);
    try {
      const loadedCustomers = await getCustomers(user.uid);
      loadedCustomers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setCustomers(loadedCustomers);
      setAllSales(await getSales(user.uid));
      setAllPayments(await getPayments(user.uid));
    } catch (error) {
      console.error("Müşteri verileri yüklenirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Müşteri verileri yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, authLoading]);

  useEffect(() => {
    console.log("CustomersPage useEffect - authLoading:", authLoading, "User:", user ? user.uid : "null");
    if (!authLoading) {
      console.log("CustomersPage useEffect: authLoading is false, calling loadData.");
      loadData();
    }
  }, [loadData, authLoading]);

  const handleFormSubmit = useCallback(async (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> | Customer) => {
    if (!user) return;

    let savedCustomer: Customer;
    try {
      if ('id' in data && data.id) {
        savedCustomer = await storageUpdateCustomer(user.uid, data as Customer);
      } else {
        savedCustomer = await storageAddCustomer(user.uid, data as Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>);
      }
      setShowFormModal(false);
      setEditingCustomer(undefined);
      toast({
        title: editingCustomer ? "Müşteri Güncellendi" : "Müşteri Eklendi",
        description: `${savedCustomer.name} müşteri bilgileri ${editingCustomer ? 'güncellendi' : 'kaydedildi'}.`,
      });
      loadData();
    } catch (error) {
      console.error("Müşteri kaydedilirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Müşteri kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [editingCustomer, toast, loadData, user]);
  
  const openEditCustomerModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowFormModal(true);
  };
  
  const openDeleteConfirmDialog = (customerId: string) => {
    setDeletingCustomerId(customerId);
  };

  const handleDelete = useCallback(async () => {
    if (!deletingCustomerId || !user) return;
    try {
      await storageDeleteCustomer(user.uid, deletingCustomerId);
      toast({ title: "Müşteri Silindi", description: "Müşteri bilgileri ve ilişkili satış/ödemeler kaldırıldı." });
      setDeletingCustomerId(null);
      loadData();
    } catch (error) {
      console.error("Müşteri silinirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Müşteri silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [deletingCustomerId, toast, loadData, user]);

  const openAddCustomerModal = () => {
    setEditingCustomer(undefined);
    setShowFormModal(true);
  };

  if (authLoading || isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Yükleniyor...</p></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Giriş Yapmanız Gerekiyor</h1>
        <p className="text-muted-foreground mb-4">
          Bu sayfayı görüntülemek için lütfen giriş yapın.
        </p>
        <Button asChild>
          <Link href="/login">Giriş Yap</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Müşteriler</h1>
        <Button onClick={openAddCustomerModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Müşteri Ekle
        </Button>
      </div>

      <Dialog open={showFormModal} onOpenChange={(isOpen) => {
        setShowFormModal(isOpen);
        if (!isOpen) setEditingCustomer(undefined);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Müşteriyi Düzenle" : "Yeni Müşteri Ekle"}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? "Müşteri bilgilerini güncelleyin." : "Yeni müşteri için bilgileri girin."}
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            onSubmit={handleFormSubmit}
            initialData={editingCustomer}
            className="border-0 p-0 shadow-none"
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingCustomerId} onOpenChange={(isOpen) => {
        if(!isOpen) setDeletingCustomerId(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu müşteri kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCustomerId(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomerList
        customers={customers}
        sales={allSales}
        payments={allPayments}
        isLoading={isLoading}
        onEdit={openEditCustomerModal}
        onDelete={openDeleteConfirmDialog}
      />
    </div>
  );
}
