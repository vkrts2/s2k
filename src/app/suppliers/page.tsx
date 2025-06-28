"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Supplier, Purchase, PaymentToSupplier } from "@/lib/types";
import {
  getSuppliers,
  addSupplier as storageAddSupplier,
  updateSupplier as storageUpdateSupplier,
  deleteSupplier as storageDeleteSupplier,
  getPurchases,
  getPaymentsToSuppliers,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Edit, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { SupplierList } from "@/components/suppliers/supplier-list";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Link from "next/link";
import { format, parseISO } from 'date-fns';
import BackToHomeButton from '@/components/common/back-to-home-button';

// Force re-evaluation

const supplierFormSchema = z.object({
  name: z.string().min(2, { message: "Tedarikçi adı en az 2 karakter olmalıdır." }),
  contactPerson: z.string().optional(),
  email: z.string().email({ message: "Geçerli bir e-posta adresi giriniz." }).optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  taxOffice: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export default function SuppliersPage() {
  const { user, loading: authLoading } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([]);
  const [allPaymentsToSuppliers, setAllPaymentsToSuppliers] = useState<PaymentToSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplierId, setDeletingSupplierId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { toast } = useToast();

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      taxOffice: '',
    },
  });

  const formatCurrency = (amount: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const calculateSupplierBalance = useCallback((supplierId: string) => {
    const supplierPurchases = allPurchases.filter(p => p.supplierId === supplierId);
    const supplierPayments = allPaymentsToSuppliers.filter(p => p.supplierId === supplierId);

    const totalPurchases = supplierPurchases.reduce((sum, p) => sum + p.amount, 0);
    const totalPayments = supplierPayments.reduce((sum, p) => sum + p.amount, 0);

    return totalPurchases - totalPayments;
  }, [allPurchases, allPaymentsToSuppliers]);

  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const loadedSuppliers = await getSuppliers(user.uid);
      loadedSuppliers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setSuppliers(loadedSuppliers);
      setAllPurchases(await getPurchases(user.uid));
      setAllPaymentsToSuppliers(await getPaymentsToSuppliers(user.uid));
    } catch (error) {
      console.error("Tedarikçi verileri yüklenirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Tedarikçi verileri yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [loadData, authLoading]);

  const handleFormSubmit = useCallback(async (data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> | Supplier) => {
    if (!user) return;

    let savedSupplier: Supplier;
    try {
      if ('id' in data && data.id) {
        const eski = suppliers.find(s => s.id === data.id);
        savedSupplier = await storageUpdateSupplier(user.uid, { ...eski, ...data } as Supplier);
      } else {
        savedSupplier = await storageAddSupplier(user.uid, data as Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>);
      }
      setShowFormModal(false);
      setEditingSupplier(null);
      toast({
        title: editingSupplier ? "Tedarikçi Güncellendi" : "Tedarikçi Eklendi",
        description: `${savedSupplier.name} tedarikçi bilgileri ${editingSupplier ? 'güncellendi' : 'kaydedildi'}.`,
      });
      loadData();
    } catch (error) {
      console.error("Tedarikçi kaydedilirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Tedarikçi kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [editingSupplier, toast, loadData, user, suppliers]);
  
  const openEditSupplierModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowFormModal(true);
  };
  
  const openDeleteConfirmDialog = (supplierId: string) => {
    setDeletingSupplierId(supplierId);
  };

  const handleDelete = useCallback(async () => {
    if (!deletingSupplierId || !user) return;
    try {
      await storageDeleteSupplier(user.uid, deletingSupplierId);
      toast({ title: "Tedarikçi Silindi", description: "Tedarikçi bilgileri ve ilişkili alım/ödeme kayıtları kaldırıldı." });
      setDeletingSupplierId(null);
      loadData();
    } catch (error) {
      console.error("Tedarikçi silinirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Tedarikçi silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [deletingSupplierId, toast, loadData, user]);

  const openAddSupplierModal = () => {
    setEditingSupplier(null);
    setShowFormModal(true);
  };

  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Yükleniyor...</p></div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center h-full"><p>Bu sayfayı görüntülemek için giriş yapmalısınız.</p></div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Tedarikçiler</h2>
        <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
          <DialogTrigger asChild>
            <Button onClick={openAddSupplierModal}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Tedarikçi
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingSupplier ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi Ekle'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(editingSupplier ? handleFormSubmit : handleFormSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tedarikçi Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="Tedarikçi adı" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-posta</FormLabel>
                      <FormControl>
                        <Input placeholder="E-posta adresi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input placeholder="Telefon numarası" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vergi No</FormLabel>
                      <FormControl>
                        <Input placeholder="Vergi numarası" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxOffice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vergi Dairesi</FormLabel>
                      <FormControl>
                        <Input placeholder="Vergi dairesi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adres</FormLabel>
                      <FormControl>
                        <Input placeholder="Tedarikçi adresi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tedarikçi Listesi</CardTitle>
          <CardDescription>Tüm tedarikçilerinizi buradan yönetin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center py-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tedarikçi ara..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adı</TableHead>
                  {/* <TableHead>Adres</TableHead> */}
                  {/* <TableHead>Oluşturulma Tarihi</TableHead> */}
                  <TableHead className="text-right">Bakiye</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length ? (
                  filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <Link href={`/suppliers/${supplier.id}`} className="font-medium">
                          {supplier.name}
                        </Link>
                      </TableCell>
                      {/* <TableCell>{supplier.address || '-'}</TableCell> */}
                      {/* <TableCell>{format(parseISO(supplier.createdAt), 'dd.MM.yyyy')}</TableCell> */}
                      <TableCell className="text-right">
                        {formatCurrency(calculateSupplierBalance(supplier.id), supplier.defaultCurrency || 'TRY')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEditSupplierModal(supplier)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => openDeleteConfirmDialog(supplier.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Tedarikçi bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Listenin dışında tek bir AlertDialog ile silme onayı */}
      <AlertDialog open={!!deletingSupplierId} onOpenChange={(open) => { if (!open) setDeletingSupplierId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tedarikçiyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu tedarikçiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm ilişkili alım/ödeme kayıtlarını da silecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
