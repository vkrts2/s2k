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
import { PlusCircle, ClipboardList, Loader2 } from "lucide-react";
import BackToHomeButton from '@/components/common/back-to-home-button';

export default function CostsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [costs, setCosts] = useState<Cost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCost, setEditingCost] = useState<Cost | undefined>(undefined);
  const [deletingCostId, setDeletingCostId] = useState<string | null>(null);

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
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <CostList items={costs} onEdit={openEditModal} onDelete={setDeletingCostId} />
          )}
        </div>
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