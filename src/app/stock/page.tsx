// src/app/stock/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { StockItem } from "@/lib/types";
import {
  getStockItems,
  addStockItem as storageAddStockItem,
  updateStockItem as storageUpdateStockItem,
  deleteStockItem as storageDeleteStockItem,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { PlusCircle, Package, FileDown, FileUp } from "lucide-react";
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
import BackToHomeButton from '@/components/common/back-to-home-button';
import { CardContent } from "@/components/ui/card";
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function StockPage() {
  const { user, loading: authLoading } = useAuth();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<StockItem | undefined>(undefined);
  const [deletingStockItemId, setDeletingStockItemId] = useState<string | null>(null);

  // Toplu ekleme (stok kartlarını toplu oluşturma)
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Not used anymore (unlinked bind UI removed)

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

  // Toplu stok kartı ekleme işlemi
  const openBulkModal = () => {
    setBulkText("");
    setBulkOpen(true);
  };

  // Excel şablonu indir
  const handleDownloadTemplate = useCallback(() => {
    // Sütunlar ve örnek satır
    const headers = [
      'name',
      'description',
      'unit',
      'salePrice.amount',
      'salePrice.currency',
      'currentStock',
      'sku',
      'barcode',
      'category',
      'minStock',
      'maxStock',
    ];
    const sample = [[
      'Örn: 10x100 Vida',
      'Açıklama (isteğe bağlı)',
      'ADET',
      0,
      'TRY',
      0,
      'SKU-123',
      'BARKOD-123',
      'Bağlantı Elemanları',
      0,
      0,
    ]];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'StokSablon');
    XLSX.writeFile(wb, `stok_sablon_${Date.now()}.xlsx`);
  }, []);

  // Excel'den içe aktar
  const handleExcelChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (rows.length === 0) {
        toast({ title: 'Boş Dosya', description: 'Excel dosyasında veri bulunamadı.', variant: 'destructive' });
        return;
      }
      let ok = 0, fail = 0;
      for (const r of rows) {
        // Esnek alan adları: Türkçe başlık gelirse karşılıklarını yakala
        const get = (keys: string[]) => {
          for (const k of keys) if (r[k] !== undefined) return r[k];
          return undefined;
        };
        const name = get(['name','isim','ürün','urun','Ürün Adı']);
        if (!name || String(name).trim()==='') { fail++; continue; }
        const description = get(['description','açıklama','aciklama']);
        const unit = get(['unit','birim']);
        const priceAmt = Number(get(['salePrice.amount','salePrice_amount','fiyat','satis_fiyati','Satış Fiyatı']) ?? 0) || 0;
        const priceCur = String(get(['salePrice.currency','salePrice_currency','para_birimi','currency']) ?? 'TRY') || 'TRY';
        const currentStock = Number(get(['currentStock','mevcut_stok','stok'])) || 0;
        const sku = get(['sku','stok_kodu']);
        const barcode = get(['barcode','barkod']);
        const category = get(['category','kategori']);
        const minStock = Number(get(['minStock','min_stok'])) || 0;
        const maxStock = Number(get(['maxStock','max_stok'])) || 0;

        try {
          await storageAddStockItem(user.uid, {
            name: String(name),
            description: description ? String(description) : "",
            unit: unit ? String(unit) : "",
            salePrice: { amount: priceAmt, currency: priceCur as any },
            currentStock,
            sku: sku ? String(sku) : undefined as any,
            barcode: barcode ? String(barcode) : undefined as any,
            category: category ? String(category) : undefined as any,
            minStock: Number.isFinite(minStock) ? minStock : undefined as any,
            maxStock: Number.isFinite(maxStock) ? maxStock : undefined as any,
          } as Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'>);
          ok++;
        } catch (err) {
          console.error('Excel import item error', err, r);
          fail++;
        }
      }
      toast({ title: 'Excel İçe Aktarma', description: `${ok} kayıt eklendi, ${fail} kayıt atlandı.` });
      await loadItems();
    } catch (err) {
      console.error('Excel okuma hatası', err);
      toast({ title: 'Hata', description: 'Excel dosyası okunamadı.', variant: 'destructive' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [user, loadItems, toast]);

  const handleBulkSubmit = useCallback(async () => {
    if (!user) return;
    const names = bulkText
      .split(/\r?\n/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (names.length === 0) {
      toast({ title: 'Boş Liste', description: 'Eklemek için en az bir ürün adı girin.', variant: 'destructive' });
      return;
    }
    try {
      setBulkSubmitting(true);
      let ok = 0;
      for (const name of names) {
        try {
          await storageAddStockItem(user.uid, {
            name,
            description: "",
            currentStock: 0,
            unit: "",
            salePrice: { amount: 0, currency: 'TRY' },
          } as Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'>);
          ok++;
        } catch (e) {
          console.error('Toplu ekle hata:', e);
        }
      }
      toast({ title: 'Toplu Ekleme Tamamlandı', description: `${ok}/${names.length} ürün eklendi.` });
      setBulkOpen(false);
      await loadItems();
    } finally {
      setBulkSubmitting(false);
    }
  }, [bulkText, user, toast, loadItems]);

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
          <Button onClick={openAddModal}>
            <PlusCircle className="mr-2 h-4 w-4" /> Yeni Ürün Ekle
          </Button>
          <Button variant="outline" onClick={openBulkModal}>
            <PlusCircle className="mr-2 h-4 w-4" /> Toplu Ürün Ekle
          </Button>
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <FileDown className="mr-2 h-4 w-4" /> Excel Şablon
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelChange} />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <FileUp className="mr-2 h-4 w-4" /> Excel'den Ekle
          </Button>
        </div>
      </div>

      <Dialog open={showFormModal} onOpenChange={(isOpen: boolean) => {
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

      {/* Toplu Ürün Ekle Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Toplu Ürün Ekle</DialogTitle>
            <DialogDescription>Her satıra bir ürün adı gelecek şekilde listeyi yapıştırın.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ürün Adları (satır satır)</label>
            <textarea
              className="w-full h-48 border rounded-md p-2 bg-background"
              placeholder={"Örn:\nVida\nSomun\nPul"}
              value={bulkText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBulkText(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setBulkOpen(false)}>İptal</Button>
            <Button onClick={handleBulkSubmit} disabled={bulkSubmitting}>{bulkSubmitting ? 'Ekleniyor...' : 'Ekle'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingStockItemId} onOpenChange={(isOpen: boolean) => { if(!isOpen) setDeletingStockItemId(null);}}>
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
          <StockList
            items={stockItems}
            onEdit={openEditModal}
            onDelete={openDeleteConfirmDialog}
          />
        </div>
      </CardContent>
      </div>
    </div>
  );
}
