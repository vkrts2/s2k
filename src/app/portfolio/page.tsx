// src/app/portfolio/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Briefcase, Filter } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { PortfolioItem, PortfolioSector } from '@/lib/types';
import { portfolioSectors } from '@/lib/types'; // Sektörleri import et
import { getPortfolioItems, addPortfolioItem, updatePortfolioItem, deletePortfolioItem } from '@/lib/storage';
import { PortfolioForm } from '@/components/portfolio/portfolio-form';
import { PortfolioList } from '@/components/portfolio/portfolio-list';

const ALL_CITIES_VALUE = "all_cities";
const ALL_SECTORS_VALUE = "all_sectors";

export default function PortfolioPage() {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | undefined>(undefined);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const [selectedCity, setSelectedCity] = useState<string>(ALL_CITIES_VALUE);
  const [selectedSector, setSelectedSector] = useState<PortfolioSector | typeof ALL_SECTORS_VALUE>(ALL_SECTORS_VALUE);

  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const loadItems = useCallback(async () => {
    if (!user || authLoading) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const items = await getPortfolioItems(user.uid);
      setPortfolioItems(items);
    } catch (e) {
      console.error("Portföy kalemleri yüklenirken hata oluştu:", e);
      toast({
        title: "Veri Yükleme Hatası",
        description: "Portföy kalemleri yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
      setPortfolioItems([]); // Hata durumunda boş dizi döndür
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading, toast]);

  useEffect(() => {
    document.title = "Portföy Listesi | ERMAY";
    if (!authLoading && user) {
      loadItems();
    }
  }, [authLoading, user, loadItems]);

  const handleFormSubmit = useCallback(
    async (data: Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'> | PortfolioItem) => {
      if (!user) {
        toast({
          title: "Yetkilendirme Hatası",
          description: "İşlem yapmak için giriş yapmış olmalısınız.",
          variant: "destructive",
        });
        return;
      }
      let savedItem: PortfolioItem;
      if ('id' in data && data.id) { // Düzenleme
        savedItem = await updatePortfolioItem(user.uid, data as PortfolioItem);
      } else { // Ekleme
        savedItem = await addPortfolioItem(user.uid, data as Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'>);
      }
      setShowFormModal(false);
      setEditingItem(undefined);
      toast({
        title: editingItem ? "Portföy Kaydı Güncellendi" : "Portföy Kaydı Eklendi",
        description: `${savedItem.companyName} bilgileri başarıyla ${editingItem ? 'güncellendi' : 'kaydedildi'}.`,
      });
      loadItems();
    },
    [editingItem, toast, loadItems, user]
  );

  const openAddModal = () => {
    setEditingItem(undefined);
    setShowFormModal(true);
  };

  const openEditModal = (item: PortfolioItem) => {
    setEditingItem(item);
    setShowFormModal(true);
  };

  const openDeleteConfirmDialog = (itemId: string) => {
    setDeletingItemId(itemId);
  };

  const handleDelete = useCallback(async () => {
    if (!deletingItemId) return;
    if (!user) {
      toast({
        title: "Yetkilendirme Hatası",
        description: "İşlem yapmak için giriş yapmış olmalısınız.",
        variant: "destructive",
      });
      return;
    }
    await deletePortfolioItem(user.uid, deletingItemId);
    toast({ title: "Portföy Kaydı Silindi", description: "Kayıt başarıyla silindi." });
    setDeletingItemId(null);
    loadItems();
  }, [deletingItemId, loadItems, toast, user]);

  const uniqueCities = useMemo(() => {
    if (!Array.isArray(portfolioItems)) return [];
    const cities = new Set(portfolioItems.map(item => item.city).filter(Boolean) as string[]);
    return Array.from(cities).sort();
  }, [portfolioItems]);

  const filteredItems = useMemo(() => {
    if (!Array.isArray(portfolioItems)) return [];
    return portfolioItems.filter(item => {
      const cityMatch = selectedCity === ALL_CITIES_VALUE || item.city === selectedCity;
      const sectorMatch = selectedSector === ALL_SECTORS_VALUE || item.sector === selectedSector;
      return cityMatch && sectorMatch;
    });
  }, [portfolioItems, selectedCity, selectedSector]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Portföy kayıtları yükleniyor...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Briefcase className="mr-3 h-8 w-8 text-primary" />
          Portföy Listesi
        </h1>
        <Button onClick={openAddModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Portföy Kaydı Ekle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filtrele
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city-filter">Bulunduğu İl</Label>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger id="city-filter">
                <SelectValue placeholder="İl Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CITIES_VALUE}>Tüm İller</SelectItem>
                {uniqueCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sector-filter">Sektör</Label>
            <Select 
                value={selectedSector} 
                onValueChange={(value) => setSelectedSector(value as PortfolioSector | typeof ALL_SECTORS_VALUE)}
            >
              <SelectTrigger id="sector-filter">
                <SelectValue placeholder="Sektör Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SECTORS_VALUE}>Tüm Sektörler</SelectItem>
                {portfolioSectors.map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showFormModal} onOpenChange={(isOpen) => {
        setShowFormModal(isOpen);
        if (!isOpen) setEditingItem(undefined);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Portföy Kaydını Düzenle" : "Yeni Portföy Kaydı Ekle"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Firma bilgilerini güncelleyin." : "Yeni portföy kaydı için bilgileri girin."}
            </DialogDescription>
          </DialogHeader>
          <PortfolioForm
            onSubmit={handleFormSubmit}
            initialData={editingItem}
            className="border-0 p-0 shadow-none"
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingItemId} onOpenChange={(isOpen) => { if(!isOpen) setDeletingItemId(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu portföy kaydı kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingItemId(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PortfolioList
        items={filteredItems}
        onEdit={openEditModal}
        onDelete={openDeleteConfirmDialog}
      />
    </div>
  );
}
