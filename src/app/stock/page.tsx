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
import { getPurchases, getSupplierById, getSales, getCustomerById, updatePurchase, updateSale } from "@/lib/storage";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function StockPage() {
  const { user, loading: authLoading } = useAuth();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<StockItem | undefined>(undefined);
  const [deletingStockItemId, setDeletingStockItemId] = useState<string | null>(null);
  const [unlinkedPurchases, setUnlinkedPurchases] = useState<any[]>([]);
  const [unlinkedSales, setUnlinkedSales] = useState<any[]>([]);

  // Bağlama modalı state (tekil veya toplu)
  const [bindOpen, setBindOpen] = useState(false);
  const [bindRecords, setBindRecords] = useState<Array<{ type: 'purchase' | 'sale' | 'purchaseItem' | 'saleItem'; raw: any; itemIndex?: number }>>([]);
  const [bindMode, setBindMode] = useState<'existing' | 'new'>('existing');
  const [selectedStockItemId, setSelectedStockItemId] = useState<string | undefined>(undefined);
  const [newItemName, setNewItemName] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [bindSubmitting, setBindSubmitting] = useState(false);

  // Toplu seçim state
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<Set<string>>(new Set());
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());

  // '+N kalem' detaylarını aç/kapat
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set());
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());

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
      const [loadedItems, purchases, sales] = await Promise.all([
        getStockItems(user.uid),
        getPurchases(user.uid),
        getSales(user.uid),
      ]);
      setStockItems(loadedItems);

      // Stoğa bağlanmamış alışları bul (stockItemId yok veya null)
      const rawUnlinked = purchases.filter(p => !p.stockItemId);
      // Tedarikçi isimlerini çözümle
      const supplierIds = Array.from(new Set(rawUnlinked.map(p => p.supplierId).filter(Boolean)));
      const supplierMap: Record<string, string> = {};
      await Promise.all(supplierIds.map(async (sid) => {
        try { const s = await getSupplierById(user.uid, sid); if (s) supplierMap[sid] = s.name; } catch {}
      }));

      const normalized = rawUnlinked.map(p => ({
        id: p.id,
        date: p.date,
        supplierName: supplierMap[p.supplierId] || 'Bilinmeyen Tedarikçi',
        productName: p.manualProductName || p.description || 'İsimsiz Ürün',
        quantity: p.quantityPurchased ?? (Array.isArray(p.invoiceItems) ? (p.invoiceItems.reduce((acc, it) => acc + (it.quantity || 0), 0)) : undefined),
        amount: p.amount,
        currency: p.currency,
        raw: p,
      }));
      setUnlinkedPurchases(normalized);

      // Stoğa bağlanmamış satışları bul (stockItemId yok veya null)
      const rawUnlinkedSales = sales.filter(s => !s.stockItemId);
      const customerIds = Array.from(new Set(rawUnlinkedSales.map(s => s.customerId).filter(Boolean)));
      const customerMap: Record<string, string> = {};
      await Promise.all(customerIds.map(async (cid) => {
        try { const c = await getCustomerById(user.uid, cid); if (c) customerMap[cid] = c.name; } catch {}
      }));
      const normalizedSales = rawUnlinkedSales.map(s => ({
        id: s.id,
        date: s.date,
        customerName: customerMap[s.customerId] || 'Bilinmeyen Müşteri',
        productName: s.description || 'İsimsiz Ürün',
        quantity: s.quantity ?? (Array.isArray(s.items) ? (s.items.reduce((acc, it) => acc + (it.quantity || 0), 0)) : undefined),
        amount: s.subtotal ?? s.amount,
        currency: s.currency,
        raw: s,
      }));
      setUnlinkedSales(normalizedSales);
    } catch (error) {
      console.error("Stok kalemleri yüklenirken hata oluştu:", error);
      toast({
        title: "Stok Yükleme Hatası",
        description: "Stok kalemleri yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
      setStockItems([]);
      setUnlinkedPurchases([]);
      setUnlinkedSales([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, authLoading]);

  const openBindModal = useCallback((record: { type: 'purchase' | 'sale' | 'purchaseItem' | 'saleItem'; raw: any; itemIndex?: number }) => {
    setBindRecords([record]);
    setBindMode('existing');
    setSelectedStockItemId(undefined);
    setNewItemName("");
    setNewItemUnit("");
    setNewItemDesc("");
    setBindOpen(true);
  }, []);

  const openBulkBindModal = useCallback(() => {
    const records: Array<{ type: 'purchase' | 'sale'; raw: any }> = [];
    unlinkedPurchases.forEach(p => { if (selectedPurchaseIds.has(p.id)) records.push({ type: 'purchase', raw: p.raw }); });
    unlinkedSales.forEach(s => { if (selectedSaleIds.has(s.id)) records.push({ type: 'sale', raw: s.raw }); });
    if (records.length === 0) return;
    setBindRecords(records);
    setBindMode('existing');
    setSelectedStockItemId(undefined);
    setNewItemName("");
    setNewItemUnit("");
    setNewItemDesc("");
    setBindOpen(true);
  }, [unlinkedPurchases, unlinkedSales, selectedPurchaseIds, selectedSaleIds]);

  const togglePurchaseSelection = useCallback((id: string) => {
    setSelectedPurchaseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSaleSelection = useCallback((id: string) => {
    setSelectedSaleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleBind = useCallback(async () => {
    if (!user || bindRecords.length === 0) return;
    try {
      setBindSubmitting(true);
      let stockItemIdToUse: string | undefined = selectedStockItemId;
      if (bindMode === 'new') {
        if (!newItemName.trim()) {
          toast({ title: 'Eksik Bilgi', description: 'Yeni stok kalemi için ad gereklidir.', variant: 'destructive' });
          setBindSubmitting(false);
          return;
        }
        const created = await storageAddStockItem(user.uid, {
          name: newItemName.trim(),
          description: newItemDesc || undefined,
          unit: newItemUnit || undefined,
          currentStock: 0,
          salePrice: undefined as any,
        } as any);
        stockItemIdToUse = created.id;
      }
      if (!stockItemIdToUse) {
        toast({ title: 'Seçim Gerekli', description: 'Bir stok kalemi seçin veya yeni oluşturun.', variant: 'destructive' });
        setBindSubmitting(false);
        return;
      }
      let success = 0;
      for (const rec of bindRecords) {
        try {
          if (rec.type === 'purchase') {
            await updatePurchase(user.uid, { ...rec.raw, stockItemId: stockItemIdToUse });
          } else if (rec.type === 'sale') {
            await updateSale(user.uid, { ...rec.raw, stockItemId: stockItemIdToUse });
          } else if (rec.type === 'purchaseItem') {
            const parent = { ...rec.raw };
            const idx = rec.itemIndex as number;
            const items = Array.isArray(parent.invoiceItems) ? [...parent.invoiceItems] : [];
            if (items[idx]) {
              items[idx] = { ...items[idx], stockItemId: stockItemIdToUse };
            }
            await updatePurchase(user.uid, { ...parent, invoiceItems: items });
          } else if (rec.type === 'saleItem') {
            const parent = { ...rec.raw };
            const idx = rec.itemIndex as number;
            const items = Array.isArray(parent.items) ? [...parent.items] : [];
            if (items[idx]) {
              items[idx] = { ...items[idx], stockItemId: stockItemIdToUse };
            }
            await updateSale(user.uid, { ...parent, items });
          }
          success++;
        } catch (e) {
          console.error('Single bind failed for', rec, e);
        }
      }

      toast({ title: 'Bağlama Tamamlandı', description: `${success}/${bindRecords.length} kayıt bağlandı.` });
      setBindOpen(false);
      setBindRecords([]);
      setSelectedPurchaseIds(new Set());
      setSelectedSaleIds(new Set());
      await loadItems();
    } catch (e) {
      console.error('handleBind error', e);
      toast({ title: 'Hata', description: 'Bağlama sırasında bir sorun oluştu.', variant: 'destructive' });
    } finally {
      setBindSubmitting(false);
    }
  }, [user, bindRecords, bindMode, newItemName, newItemDesc, newItemUnit, selectedStockItemId, toast, loadItems]);

  // '+N kalem' içerenleri ayırmak için regex ve türev listeler
  const extraRegex = useMemo(() => /\+\s*\d+\s*kalem/i, []);
  const purchasesExtra = useMemo(() => unlinkedPurchases.filter(p => extraRegex.test((p.productName || "").toString())), [unlinkedPurchases, extraRegex]);
  const purchasesNormal = useMemo(() => unlinkedPurchases.filter(p => !extraRegex.test((p.productName || "").toString())), [unlinkedPurchases, extraRegex]);
  const salesExtra = useMemo(() => unlinkedSales.filter(s => extraRegex.test((s.productName || "").toString())), [unlinkedSales, extraRegex]);
  const salesNormal = useMemo(() => unlinkedSales.filter(s => !extraRegex.test((s.productName || "").toString())), [unlinkedSales, extraRegex]);

  const togglePurchaseExpand = useCallback((id: string) => {
    setExpandedPurchases(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const toggleSaleExpand = useCallback((id: string) => {
    setExpandedSales(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

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

      {/* Stoğa Eklenmemiş Alışlar */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Stoğa Eklenmemiş Alışlar</CardTitle>
          <Button size="sm" variant="outline" onClick={loadItems} disabled={isLoading}>Yenile</Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between pb-3">
            <div className="text-sm text-muted-foreground">Seçili: {selectedPurchaseIds.size}</div>
            <div>
              <Button size="sm" onClick={openBulkBindModal} disabled={selectedPurchaseIds.size === 0}>Seçilenleri Stoğa Bağla</Button>
            </div>
          </div>
          <div className="pb-2 font-medium">+N kalem içerenler</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[1%]"></TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>Tedarikçi</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Para Birimi</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchasesExtra.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">Kayıt bulunamadı.</TableCell>
                </TableRow>
              ) : (
                purchasesExtra.map((p) => (
                  <>
                  <TableRow key={p.id}>
                    <TableCell>
                      <input type="checkbox" checked={selectedPurchaseIds.has(p.id)} onChange={() => togglePurchaseSelection(p.id)} />
                    </TableCell>
                    <TableCell>{format(parseISO(p.date), 'dd MMMM yyyy', { locale: tr })}</TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <button className="text-xs px-2 py-0.5 rounded bg-muted" onClick={() => togglePurchaseExpand(p.id)}>{expandedPurchases.has(p.id) ? '−' : '+'}</button>
                      <span>{p.productName}</span>
                    </TableCell>
                    <TableCell>{p.supplierName}</TableCell>
                    <TableCell className="text-right">{p.quantity ?? '-'}</TableCell>
                    <TableCell className="text-right">{p.amount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{p.currency}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => openBindModal({ type: 'purchase', raw: p.raw })}>Stoğa Bağla</Button>
                    </TableCell>
                  </TableRow>
                  {expandedPurchases.has(p.id) && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="rounded-md border p-3 bg-background/50">
                          <div className="text-sm font-medium mb-2">Fatura Kalemleri</div>
                          <div className="space-y-2">
                            {(p.raw?.invoiceItems || []).map((it: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                                <div className="flex-1">
                                  <div className="font-medium">{it.productName}</div>
                                  <div className="text-muted-foreground">{it.quantity ?? '-'} {it.unit || ''} · Birim: {it.unitPrice ?? '-'}</div>
                                </div>
                                <div className="shrink-0">
                                  {it.stockItemId ? (
                                    <span className="text-emerald-500 text-xs">Stoğa Bağlı</span>
                                  ) : (
                                    <Button size="sm" onClick={() => openBindModal({ type: 'purchaseItem', raw: p.raw, itemIndex: idx })}>Kalemi Stoğa Bağla</Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
          <div className="pt-6 pb-2 font-medium">Diğerleri</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[1%]"></TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>Tedarikçi</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Para Birimi</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchasesNormal.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">Kayıt bulunamadı.</TableCell>
                </TableRow>
              ) : (
                purchasesNormal.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <input type="checkbox" checked={selectedPurchaseIds.has(p.id)} onChange={() => togglePurchaseSelection(p.id)} />
                    </TableCell>
                    <TableCell>{format(parseISO(p.date), 'dd MMMM yyyy', { locale: tr })}</TableCell>
                    <TableCell className="font-medium">{p.productName}</TableCell>
                    <TableCell>{p.supplierName}</TableCell>
                    <TableCell className="text-right">{p.quantity ?? '-'}</TableCell>
                    <TableCell className="text-right">{p.amount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{p.currency}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => openBindModal({ type: 'purchase', raw: p.raw })}>Stoğa Bağla</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stoğa Eklenmemiş Satışlar */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Stoğa Eklenmemiş Satışlar</CardTitle>
          <Button size="sm" variant="outline" onClick={loadItems} disabled={isLoading}>Yenile</Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between pb-3">
            <div className="text-sm text-muted-foreground">Seçili: {selectedSaleIds.size}</div>
            <div>
              <Button size="sm" onClick={openBulkBindModal} disabled={selectedSaleIds.size === 0}>Seçilenleri Stoğa Bağla</Button>
            </div>
          </div>
          <div className="pb-2 font-medium">+N kalem içerenler</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[1%]"></TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Para Birimi</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesExtra.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">Kayıt bulunamadı.</TableCell>
                </TableRow>
              ) : (
                salesExtra.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <input type="checkbox" checked={selectedSaleIds.has(s.id)} onChange={() => toggleSaleSelection(s.id)} />
                    </TableCell>
                    <TableCell>{format(parseISO(s.date), 'dd MMMM yyyy', { locale: tr })}</TableCell>
                    <TableCell className="font-medium">{s.productName}</TableCell>
                    <TableCell>{s.customerName}</TableCell>
                    <TableCell className="text-right">{s.quantity ?? '-'}</TableCell>
                    <TableCell className="text-right">{s.amount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{s.currency}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => openBindModal({ type: 'sale', raw: s.raw })}>Stoğa Bağla</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="pt-6 pb-2 font-medium">Diğerleri</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[1%]"></TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Para Birimi</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesNormal.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">Kayıt bulunamadı.</TableCell>
                </TableRow>
              ) : (
                salesNormal.map((s) => (
                  <>
                  <TableRow key={s.id}>
                    <TableCell>
                      <input type="checkbox" checked={selectedSaleIds.has(s.id)} onChange={() => toggleSaleSelection(s.id)} />
                    </TableCell>
                    <TableCell>{format(parseISO(s.date), 'dd MMMM yyyy', { locale: tr })}</TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <button className="text-xs px-2 py-0.5 rounded bg-muted" onClick={() => toggleSaleExpand(s.id)}>{expandedSales.has(s.id) ? '−' : '+'}</button>
                      <span>{s.productName}</span>
                    </TableCell>
                    <TableCell>{s.customerName}</TableCell>
                    <TableCell className="text-right">{s.quantity ?? '-'}</TableCell>
                    <TableCell className="text-right">{s.amount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{s.currency}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => openBindModal({ type: 'sale', raw: s.raw })}>Stoğa Bağla</Button>
                    </TableCell>
                  </TableRow>
                  {expandedSales.has(s.id) && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="rounded-md border p-3 bg-background/50">
                          <div className="text-sm font-medium mb-2">Satış Kalemleri</div>
                          <div className="space-y-2">
                            {(s.raw?.items || []).map((it: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                                <div className="flex-1">
                                  <div className="font-medium">{it.productName}</div>
                                  <div className="text-muted-foreground">{it.quantity ?? '-'} {it.unit || ''} · Birim: {it.unitPrice ?? '-'}</div>
                                </div>
                                <div className="shrink-0">
                                  {it.stockItemId ? (
                                    <span className="text-emerald-500 text-xs">Stoğa Bağlı</span>
                                  ) : (
                                    <Button size="sm" onClick={() => openBindModal({ type: 'saleItem', raw: s.raw, itemIndex: idx })}>Kalemi Stoğa Bağla</Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stoğa Bağla Modal */}
      <Dialog open={bindOpen} onOpenChange={setBindOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Stoğa Bağla</DialogTitle>
            <DialogDescription>
              Kaydı mevcut bir stok kalemine bağlayın veya yeni bir stok kalemi oluşturun.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">Bağlama Şekli</Label>
              <div className="flex gap-2">
                <Button type="button" variant={bindMode === 'existing' ? 'default' : 'outline'} size="sm" onClick={() => setBindMode('existing')}>Mevcut Kalem</Button>
                <Button type="button" variant={bindMode === 'new' ? 'default' : 'outline'} size="sm" onClick={() => setBindMode('new')}>Yeni Kalem</Button>
              </div>
            </div>

            {bindMode === 'existing' ? (
              <div>
                <Label className="mb-2 block">Stok Kalemi Seç</Label>
                <Select value={selectedStockItemId} onValueChange={(v) => setSelectedStockItemId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockItems.map((si) => (
                      <SelectItem key={si.id} value={si.id}>{si.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Ad</Label>
                  <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Örn: 200 gr Keçe" />
                </div>
                <div>
                  <Label>Birim</Label>
                  <Input value={newItemUnit} onChange={(e) => setNewItemUnit(e.target.value)} placeholder="adet, kg, mt..." />
                </div>
                <div>
                  <Label>Açıklama</Label>
                  <Input value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} placeholder="Opsiyonel" />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBindOpen(false)}>Vazgeç</Button>
              <Button type="button" onClick={handleBind} disabled={bindSubmitting}>{bindSubmitting ? 'Bağlanıyor...' : 'Bağla'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
