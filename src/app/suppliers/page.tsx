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

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt?: string;
}

const supplierFormSchema = z.object({
  name: z.string().min(2, { message: "Tedarikçi adı en az 2 karakter olmalıdır." }),
  contactPerson: z.string().optional(),
  email: z.string().email({ message: "Geçerli bir e-posta adresi giriniz." }).optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
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
    },
  });

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
        savedSupplier = await storageUpdateSupplier(user.uid, data as Supplier);
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
  }, [editingSupplier, toast, loadData, user]);
  
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
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (supplier.email && supplier.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (supplier.phone && supplier.phone.includes(searchQuery))
  );

  if (authLoading || isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Yükleniyor...</p></div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center h-full"><p>Bu sayfayı görüntülemek için giriş yapmalısınız.</p></div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
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
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yetkili Kişi</FormLabel>
                      <FormControl>
                        <Input placeholder="Yetkili kişinin adı" {...field} />
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
                        <Input placeholder="eposta@tedarikci.com" {...field} />
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
                        <Input placeholder="5xx xxx xx xx" {...field} />
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
                  <Button type="submit">{editingSupplier ? 'Kaydet' : 'Ekle'}</Button>
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
          <div className="flex items-center space-x-2 mb-4">
            <Label htmlFor="search" className="sr-only">Ara</Label>
            <Input
              id="search"
              type="text"
              placeholder="Tedarikçi ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline"><Search className="h-4 w-4" /></Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adı</TableHead>
                <TableHead>Yetkili Kişi</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Adres</TableHead>
                <TableHead>Oluşturulma Tarihi</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/suppliers/${supplier.id}`}
                      className="text-primary underline hover:text-primary/80 transition-colors"
                    >
                      {supplier.name}
                    </Link>
                  </TableCell>
                  <TableCell>{supplier.contactPerson || '-'}</TableCell>
                  <TableCell>{supplier.email || '-'}</TableCell>
                  <TableCell>{supplier.phone || '-'}</TableCell>
                  <TableCell>{supplier.address || '-'}</TableCell>
                  <TableCell>{new Date(supplier.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openEditSupplierModal(supplier)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="sm" className="ml-2" onClick={() => openDeleteConfirmDialog(supplier.id)}><Trash className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredSuppliers.length === 0 && (
            <p className="text-center text-muted-foreground mt-4">Hiç tedarikçi bulunamadı.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingSupplierId} onOpenChange={(isOpen) => {
        if(!isOpen) setDeletingSupplierId(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu, tedarikçiyi ve bu tedarikçiye ait tüm alım ve ödeme kayıtlarını kalıcı olarak silecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingSupplierId(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
