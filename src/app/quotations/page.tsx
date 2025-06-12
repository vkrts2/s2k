// src/app/quotations/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Quotation, PortfolioItem, Customer } from "@/lib/types";
import {
  getQuotations,
  addQuotation as storageAddQuotation,
  updateQuotation as storageUpdateQuotation,
  deleteQuotation as storageDeleteQuotation,
  getCustomers, // Müşteri seçmek için
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileText } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { QuotationList } from "@/components/quotations/quotation-list";
import { QuotationForm, QuotationFormOutputValues } from "@/components/quotations/quotation-form";
import { formatISO } from "date-fns";

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | undefined>(undefined);
  const [deletingQuotationId, setDeletingQuotationId] = useState<string | null>(null);

  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const loadData = useCallback(async () => {
    console.log("loadData: Initializing. user:", user, "authLoading:", authLoading);
    if (!user || authLoading) {
      setIsLoading(false);
      console.log("loadData: User not available or auth loading. Skipping data load.");
      return;
    }
    setIsLoading(true);
    try {
      console.log("loadData: Attempting to fetch quotations for user.uid:", user.uid);
      const loadedQuotations = await getQuotations(user.uid);
      console.log("loadData: fetched quotations received:", loadedQuotations);
      setQuotations(loadedQuotations);

      console.log("loadData: Attempting to fetch customers for user.uid:", user.uid);
      const loadedCustomers = await getCustomers(user.uid); // Müşteri seçimi için
      console.log("loadData: fetched customers received:", loadedCustomers);
      setCustomers(loadedCustomers);
      document.title = "Fiyat Teklifleri | ERMAY";
    } catch (error) {
      console.error("Error loading quotations data:", error);
      toast({
        title: "Veri Yükleme Hatası",
        description: "Fiyat teklifleri veya müşteri verileri yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
      setQuotations([]);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, user, authLoading]);

  useEffect(() => {
    if (typeof window !== "undefined") {
        loadData();
    }
  }, [loadData, authLoading, user]);

  const handleFormSubmit = useCallback(
    async (data: QuotationFormOutputValues) => {
      if (!user) {
        toast({
          title: "Yetkilendirme Hatası",
          description: "İşlem yapmak için giriş yapmış olmalısınız.",
          variant: "destructive",
        });
        return;
      }

      // Tarihleri ISO string formatına dönüştür
      const dataToSubmit = {
        ...data,
        date: formatISO(data.date), // Convert Date to ISO string
        validUntilDate: data.validUntilDate ? formatISO(data.validUntilDate) : undefined, // Convert Date to ISO string if exists
      };

      let savedQuotation: Quotation;
      if ('id' in dataToSubmit && dataToSubmit.id) { // Editing existing quotation
        savedQuotation = await storageUpdateQuotation(user.uid, dataToSubmit as Quotation);
      } else { // Adding new quotation
        savedQuotation = await storageAddQuotation(user.uid, dataToSubmit as Omit<Quotation, 'id' | 'createdAt' | 'updatedAt' | 'quotationNumber'>);
      }
      setShowFormModal(false);
      setEditingQuotation(undefined);
      toast({
        title: editingQuotation ? "Fiyat Teklifi Güncellendi" : "Fiyat Teklifi Eklendi",
        description: `${savedQuotation.quotationNumber} numaralı teklif başarıyla ${editingQuotation ? 'güncellendi' : 'kaydedildi'}.`,
      });
      loadData(); 
    },
    [editingQuotation, toast, loadData, user]
  );

  const openAddModal = () => {
    setEditingQuotation(undefined);
    setShowFormModal(true);
  };

  const openEditModal = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setShowFormModal(true);
  };

  const openDeleteConfirmDialog = (quotationId: string) => {
    setDeletingQuotationId(quotationId);
  };

  const handleDelete = useCallback(async () => {
    if (!deletingQuotationId) return;
    if (!user) {
      toast({
        title: "Yetkilendirme Hatası",
        description: "İşlem yapmak için giriş yapmış olmalısınız.",
        variant: "destructive",
      });
      return;
    }
    const quotationToDelete = quotations.find(q => q.id === deletingQuotationId);
    await storageDeleteQuotation(user.uid, deletingQuotationId);
    toast({
      title: "Fiyat Teklifi Silindi",
      description: `"${quotationToDelete?.quotationNumber || 'Seçili'}" numaralı teklif başarıyla silindi.`,
    });
    setDeletingQuotationId(null);
    loadData();
  }, [deletingQuotationId, quotations, loadData, toast, user]);

  if (isLoading || authLoading) {
    return <div className="flex justify-center items-center h-full"><p>Fiyat teklifleri yükleniyor...</p></div>;
  }

  console.log("Rendering QuotationsPage. Current quotations state:", quotations);
  console.log("Rendering QuotationsPage. Current customers state:", customers);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <FileText className="mr-3 h-8 w-8 text-primary" />
          Fiyat Teklifleri
        </h1>
        <Button onClick={openAddModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Yeni Fiyat Teklifi Oluştur
        </Button>
      </div>

      <Dialog open={showFormModal} onOpenChange={(isOpen) => {
        setShowFormModal(isOpen);
        if (!isOpen) setEditingQuotation(undefined);
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto"> {/* Form daha geniş olabilir ve kaydırılabilir */}
          <DialogHeader>
            <DialogTitle>{editingQuotation ? "Fiyat Teklifini Düzenle" : "Yeni Fiyat Teklifi Oluştur"}</DialogTitle>
            <DialogDescription>
              {editingQuotation ? "Teklif bilgilerini güncelleyin." : "Yeni teklif için bilgileri girin."}
            </DialogDescription>
          </DialogHeader>
          <QuotationForm
            onSubmit={handleFormSubmit}
            initialData={editingQuotation}
            customers={customers}
            className="border-0 p-0 shadow-none"
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingQuotationId} onOpenChange={(isOpen) => { if(!isOpen) setDeletingQuotationId(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu fiyat teklifi kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingQuotationId(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuotationList
        quotations={quotations}
        onEdit={openEditModal}
        onDelete={openDeleteConfirmDialog}
        isLoading={isLoading}
      />
    </div>
  );
}

    