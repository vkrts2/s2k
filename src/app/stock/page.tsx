// src/app/stock/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { StockItem } from "@/lib/types";
import {
  getStockItems,
  addStockItem as storageAddStockItem,
  updateStockItem as storageUpdateStockItem,
  deleteStockItem as storageDeleteStockItem,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { PlusCircle, Package } from "lucide-react";
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
import { StockList } from "@/components/stock/stock-list";
import { StockForm } from "@/components/stock/stock-form";
import { useAuth } from "@/contexts/AuthContext";
import Link from 'next/link';
import BackToHomeButton from '@/components/common/back-to-home-button';
import { CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/table";

export default function StockPage() {
  const { user, loading: authLoading } = useAuth();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<StockItem | undefined>(undefined);
  const [deletingStockItemId, setDeletingStockItemId] = useState<string | null>(null);

  const { toast } = useToast();

  console.log("StockPage render - authLoading:", authLoading, "User:", user ? user.uid : "null");

  const loadItems = useCallback(async () => {
    console.log("loadItems called - User:", user ? user.uid : "null", "authLoading:", authLoading);
    if (authLoading || !user) {
      setIsLoading(false);
      if (!user && !authLoading) {
        console.log("Bu sayfayı görüntülemek için giriş yapmalısınız.");
      }
      return;
    }
    
    setIsLoading(true);
    try {
      const loadedItems = await getStockItems(user.uid);
      setStockItems(loadedItems);
    } catch (error) {
      console.error("Stok kalemleri yüklenirken hata oluştu:", error);
      toast({
        title: "Stok Yükleme Hatası",
        description: "Stok kalemleri yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
      setStockItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, authLoading]);

  useEffect(() => {
    document.title = "Stok Yönetimi | ERMAY";
    console.log("StockPage useEffect - authLoading:", authLoading, "User:", user ? user.uid : "null");
    if (!authLoading && user) {
      console.log("StockPage useEffect: authLoading is false and user is present, calling loadItems.");
      loadItems();
    }
  }, [loadItems, authLoading, user]);

  const handleFormSubmit = useCallback(async (data: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'> | StockItem) => {
    if (!user) return;
    let savedItem: StockItem;
    try {
      if ('id' in data && data.id) {
        savedItem = await storageUpdateStockItem(user.uid, data as StockItem);
      } else {
        savedItem = await storageAddStockItem(user.uid, data as Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'>);
      }
      setShowFormModal(false);
      setEditingStockItem(undefined);
      toast({
        title: editingStockItem ? "Ürün Güncellendi" : "Ürün Eklendi",
        description: `${savedItem.name} adlı ürün başarıyla ${editingStockItem ? 'güncellendi' : 'kaydedildi'}.`,
      });
      loadItems();
    } catch (error) {
      console.error("Ürün kaydedilirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Ürün kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [editingStockItem, toast, loadItems, user]);

  const openAddModal = () => {
    setEditingStockItem(undefined);
    setShowFormModal(true);
  };

  const openEditModal = (item: StockItem) => {
    setEditingStockItem(item);
    setShowFormModal(true);
  };

  const openDeleteConfirmDialog = (itemId: string) => {
    setDeletingStockItemId(itemId);
  };

  const handleDelete = useCallback(async () => {
    if (!deletingStockItemId || !user) return;
    const itemToDelete = stockItems.find(item => item.id === deletingStockItemId);
    try {
      await storageDeleteStockItem(user.uid, deletingStockItemId);
      toast({
        title: "Ürün Silindi",
        description: `"${itemToDelete?.name || 'Seçili'}" adlı ürün başarıyla silindi.`,
      });
      setDeletingStockItemId(null);
      loadItems();
    } catch (error) {
      console.error("Ürün silinirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Ürün silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [deletingStockItemId, toast, loadItems, stockItems, user]);

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
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Package className="mr-3 h-8 w-8 text-primary" />
          Stok Kalemleri
        </h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/stock-movements">Stok Hareketleri</Link>
          </Button>
          <Button onClick={openAddModal}>
            <PlusCircle className="mr-2 h-4 w-4" /> Yeni Ürün Ekle
          </Button>
        </div>
      </div>

      <Dialog open={showFormModal} onOpenChange={(isOpen) => {
        setShowFormModal(isOpen);
        if (!isOpen) setEditingStockItem(undefined);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStockItem ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</DialogTitle>
            <DialogDescription>
              {editingStockItem ? "Ürün adını güncelleyin." : "Yeni ürün için adını girin."}
            </DialogDescription>
          </DialogHeader>
          <StockForm
            onSubmit={handleFormSubmit}
            initialData={editingStockItem}
            className="border-0 p-0 shadow-none"
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingStockItemId} onOpenChange={(isOpen) => { if(!isOpen) setDeletingStockItemId(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu ürün kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingStockItemId(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <StockList
              items={stockItems}
              onEdit={openEditModal}
              onDelete={openDeleteConfirmDialog}
            />
          </Table>
        </div>
      </CardContent>
      </div>
    </div>
  );
}
