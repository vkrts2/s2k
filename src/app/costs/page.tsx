"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Cost } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';

import {
  getCosts,
  addCost,
  updateCost,
  deleteCost,
} from "@/lib/storage";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
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

import { CostList } from "@/components/costs/cost-list";
import { CostForm } from "@/components/costs/cost-form";
import { PlusCircle, ClipboardList, Loader2, TrendingUp, Building, BarChart3 } from "lucide-react";
import BackToHomeButton from '@/components/common/back-to-home-button';

interface ProfitMarginData {
  productName: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface CostCenterData {
  department: string;
  totalCost: number;
  budget: number;
  variance: number;
  percentage: number;
}

export default function CostsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [costs, setCosts] = useState<Cost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCost, setEditingCost] = useState<Cost | undefined>(undefined);
  const [deletingCostId, setDeletingCostId] = useState<string | null>(null);

  // Mock data for profit margin analysis
  const profitMarginData: ProfitMarginData[] = [
    { productName: "Ürün A", revenue: 50000, cost: 35000, profit: 15000, margin: 30 },
    { productName: "Ürün B", revenue: 75000, cost: 45000, profit: 30000, margin: 40 },
    { productName: "Ürün C", revenue: 30000, cost: 25000, profit: 5000, margin: 16.7 },
    { productName: "Ürün D", revenue: 45000, cost: 40000, profit: 5000, margin: 11.1 }
  ];

  // Mock data for cost centers
  const costCenterData: CostCenterData[] = [
    { department: "Satış", totalCost: 25000, budget: 30000, variance: -5000, percentage: 83.3 },
    { department: "Üretim", totalCost: 45000, budget: 40000, variance: 5000, percentage: 112.5 },
    { department: "Pazarlama", totalCost: 15000, budget: 20000, variance: -5000, percentage: 75 },
    { department: "İdari", totalCost: 20000, budget: 18000, variance: 2000, percentage: 111.1 }
  ];

  const loadCosts = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const loadedCosts = await getCosts(user.uid);
      setCosts(loadedCosts);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Maliyetler yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      loadCosts();
    }
  }, [user, loadCosts]);

  const handleFormSubmit = async (data: Omit<Cost, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      if (editingCost) {
        await updateCost(user.uid, { ...editingCost, ...data });
        toast({ title: "Başarılı", description: "Maliyet başarıyla güncellendi." });
      } else {
        await addCost(user.uid, data);
        toast({ title: "Başarılı", description: "Maliyet başarıyla eklendi." });
      }
      setShowFormModal(false);
      setEditingCost(undefined);
      loadCosts();
    } catch (error) {
      toast({
        title: "Hata",
        description: "Maliyet kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!user || !deletingCostId) return;
    try {
      await deleteCost(user.uid, deletingCostId);
      toast({ title: "Başarılı", description: "Maliyet başarıyla silindi." });
      loadCosts();
    } catch (error) {
      toast({
        title: "Hata",
        description: "Maliyet silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setDeletingCostId(null);
    }
  };
  
  const openAddModal = () => {
    setEditingCost(undefined);
    setShowFormModal(true);
  };

  const openEditModal = (cost: Cost) => {
    setEditingCost(cost);
    setShowFormModal(true);
  };
  
  if (authLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <h1 className="text-2xl font-bold mb-4">Giriş Gerekli</h1>
        <p className="mb-4">Bu sayfayı görüntülemek için lütfen giriş yapın.</p>
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
            <ClipboardList className="mr-3 h-8 w-8 text-primary" />
            Maliyet Yönetimi
          </h1>
          <Button onClick={openAddModal}>
            <PlusCircle className="mr-2 h-4 w-4" /> Yeni Maliyet Ekle
          </Button>
        </div>
        
        <Tabs defaultValue="costs" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="costs">Maliyetler</TabsTrigger>
            <TabsTrigger value="profit-margin">Kâr Marjı</TabsTrigger>
            <TabsTrigger value="cost-centers">Maliyet Merkezleri</TabsTrigger>
          </TabsList>
          
          <TabsContent value="costs" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <CostList items={costs} onEdit={openEditModal} onDelete={setDeletingCostId} />
            )}
          </TabsContent>
          
          <TabsContent value="profit-margin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Kâr Marjı Analizi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profitMarginData.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">{item.productName}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.margin > 25 ? 'bg-green-100 text-green-800' :
                          item.margin > 15 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          %{item.margin.toFixed(1)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Gelir:</span>
                          <div className="font-medium">₺{item.revenue.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Maliyet:</span>
                          <div className="font-medium">₺{item.cost.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Kâr:</span>
                          <div className="font-medium text-green-600">₺{item.profit.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="cost-centers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Maliyet Merkezi Analizi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costCenterData.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-medium">{item.department}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.variance < 0 ? 'bg-green-100 text-green-800' :
                          item.variance > 0 ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.variance > 0 ? '+' : ''}₺{item.variance.toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Toplam Maliyet:</span>
                          <span className="font-medium">₺{item.totalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Bütçe:</span>
                          <span className="font-medium">₺{item.budget.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              item.percentage > 100 ? 'bg-red-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          Bütçe kullanımı: %{item.percentage.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showFormModal} onOpenChange={(isOpen) => {
          if (!isOpen) setEditingCost(undefined);
          setShowFormModal(isOpen);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCost ? "Maliyeti Düzenle" : "Yeni Maliyet Ekle"}</DialogTitle>
              <DialogDescription>
                {editingCost ? "Maliyet açıklamasını güncelleyin." : "Yeni maliyetin açıklamasını girin."}
              </DialogDescription>
            </DialogHeader>
            <CostForm 
              onSubmit={handleFormSubmit} 
              initialData={editingCost} 
              isSubmitting={isSubmitting} 
            />
          </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!deletingCostId} onOpenChange={(isOpen) => { if (!isOpen) setDeletingCostId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
              <AlertDialogDescription>
                Bu işlem geri alınamaz. Bu maliyet kalıcı olarak silinecektir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>Sil</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
} 