"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, MapPin, Building2, Home, Factory, Store, Landmark } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getPortfolioItems, addPortfolioItem, updatePortfolioItem, deletePortfolioItem, addCustomer } from '@/lib/storage';
import { useAuth } from "@/contexts/AuthContext";
import { PortfolioList } from "@/components/portfolio/portfolio-list";
import BackToHomeButton from '@/components/common/back-to-home-button';
import type { PortfolioItem, PortfolioSector } from '@/lib/types';
import { portfolioSectors } from '@/lib/types';
import ExcelJS from 'exceljs';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from "@/components/ui/form";
import { fetchProvinces, fetchDistrictsByProvince, fetchTaxOfficesByCity } from "@/lib/turkey";

const ALL_CITIES_VALUE = "all";
const ALL_SECTORS_VALUE = "all";

// Form şeması ve tipleri
const portfolioFormSchema = z.object({
  companyName: z.string().min(2, "Firma adı en az 2 karakter olmalı"),
  taxId: z.string().optional(),
  taxOffice: z.string().optional(),
  gsm: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  sector: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  notes: z.string().optional(),
});
type PortfolioFormValues = z.infer<typeof portfolioFormSchema>;

export default function PortfolioPage() {
  const { toast } = useToast();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState(ALL_CITIES_VALUE);
  const { user } = useAuth();



  const [confirmAddCustomerItem, setConfirmAddCustomerItem] = useState<PortfolioItem | null>(null);

  const uniqueSectors = Array.from(
    new Set(
      portfolioItems
        .map((item: PortfolioItem): string =>
          typeof item.sector === "string" ? item.sector.trim() : ""
        )
        .filter((s: string): s is string => !!s && s !== "")
    )
  );
  const [selectedSector, setSelectedSector] = useState(ALL_SECTORS_VALUE);

  const uniqueCities = Array.from(
    new Set(
      portfolioItems
        .map((item: PortfolioItem): string =>
          typeof item.city === "string" ? item.city.trim() : ""
        )
        .filter((c: string): c is string => !!c && c !== "")
    )
  );

  useEffect(() => {
    if (!user) return;
    getPortfolioItems(user.uid).then(items => setPortfolioItems(items));
  }, [user]);



  const handleEditItem = (item: PortfolioItem) => {
    console.log('DÜZENLEME MODU AÇILIYOR', item);
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user) return;
    await deletePortfolioItem(user.uid, itemId);
    setPortfolioItems(prev => prev.filter(item => item.id !== itemId));
    toast({
      title: "Başarılı",
      description: "Portföy kaydı başarıyla silindi.",
    });
  };

  const resetForm = () => {
    setEditingItem(null);
  };

  const filteredItems = portfolioItems.filter((item: PortfolioItem) =>
    (selectedCity === ALL_CITIES_VALUE || (item.city || "") === selectedCity) &&
    (selectedSector === ALL_SECTORS_VALUE || (item.sector || "") === selectedSector) &&
    (item.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     (item.address || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
     (item.district || "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Portföy kaydını müşterilere ekle
  const handleAddToCustomers = async (item: PortfolioItem) => {
    if (!user) {
      toast({
        title: "Giriş gerekli",
        description: "Müşteri eklemek için giriş yapmalısınız.",
        variant: "destructive",
      });
      return;
    }
    try {
      await addCustomer(user.uid, {
        name: item.companyName,
        email: item.email || '',
        phone: item.phone || '',
        address: `${item.address || ''} ${item.district || ''} ${item.city || ''}`.trim(),
        taxId: item.taxId || '',
        taxOffice: item.taxOffice || '',
        notes: item.notes || '',
      });
      toast({
        title: "Başarılı",
        description: `${item.companyName} müşterilere başarıyla eklendi!`,
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Müşteri eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
    setConfirmAddCustomerItem(null); // Dialogu kapat
  };

  // Portföyü indir fonksiyonu
  const handleDownloadPortfolio = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Portföy Listesi');
    worksheet.columns = [
      { header: 'Firma İsmi', key: 'companyName', width: 30 },
      { header: 'Sektör', key: 'sector', width: 20 },
      { header: 'İl', key: 'city', width: 15 },
      { header: 'İlçe', key: 'district', width: 15 },
      { header: 'Telefon', key: 'phone', width: 18 },
      { header: 'E-posta', key: 'email', width: 25 },
      { header: 'Adres', key: 'address', width: 40 },
      { header: 'Notlar', key: 'notes', width: 30 },
    ];
    portfolioItems.forEach((item: PortfolioItem) => {
      worksheet.addRow({
        companyName: item.companyName || '',
        sector: item.sector || '',
        city: item.city || '',
        district: item.district || '',
        phone: item.phone || '',
        email: item.email || '',
        address: item.address || '',
        notes: item.notes || '',
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfoy_listesi.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };



  // Görüşme durumu değiştiğinde çağrılacak fonksiyon
  const handleContactedChange = async (updatedItem: PortfolioItem, contacted: boolean) => {
    // Portföy öğelerini güncelle
    setPortfolioItems(prevItems => 
      prevItems.map(item => 
        item.id === updatedItem.id ? {...item, contacted} : item
      )
    );

    // Veritabanında da güncelle
    if (user) {
      const newItem = { ...updatedItem, contacted };
      await updatePortfolioItem(user.uid, newItem);
    }

    // Bildirim göster
    toast({
      title: contacted ? "Görüşme kaydedildi" : "Görüşme durumu kaldırıldı",
      description: `${updatedItem.companyName} firması için görüşme durumu güncellendi.`,
    });
  };



  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Portföy Listesi</h2>
        <Button onClick={handleDownloadPortfolio} variant="outline">
          Portföyü İndir
        </Button>
        <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingItem(null); resetForm(); setShowItemModal(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Portföy Kaydını Düzenle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Portföy Kaydını Düzenle" : "Yeni Portföy Kaydı"}</DialogTitle>
            </DialogHeader>
            <PortfolioForm
              initialData={editingItem ? editingItem : undefined}
              onSubmit={async (data: PortfolioFormValues) => {
                if (!user) return;
                try {
                  // Form verilerini temizle - undefined değerleri null'a çevir
                  const cleanedData = { ...data };
                  Object.keys(cleanedData).forEach(key => {
                    if (cleanedData[key as keyof PortfolioFormValues] === undefined || cleanedData[key as keyof PortfolioFormValues] === '') {
                      (cleanedData as any)[key] = null;
                    }
                  });

                  if (editingItem) {
                    // Güncelleme
                    const updatedItem: PortfolioItem = {
                      ...editingItem,
                      ...cleanedData,
                      sector: cleanedData.sector as PortfolioSector,
                      createdAt: editingItem.createdAt,
                      updatedAt: new Date().toISOString(),
                    };
                    await updatePortfolioItem(user.uid, updatedItem);
                    const items = await getPortfolioItems(user.uid);
                    setPortfolioItems(items);
                    setShowItemModal(false);
                    resetForm();
                    toast({ title: "Başarılı", description: "Portföy kaydı başarıyla güncellendi." });
                  } else {
                    // Ekleme
                    const newItem = {
                      ...cleanedData,
                      sector: cleanedData.sector as PortfolioSector,
                    };
                    const added = await addPortfolioItem(user.uid, newItem);
                    const items = await getPortfolioItems(user.uid);
                    setPortfolioItems(items);
                    setShowItemModal(false);
                    resetForm();
                    toast({ title: "Başarılı", description: "Portföy kaydı başarıyla eklendi." });
                  }
                } catch (error) {
                  console.error('PORTFÖY İŞLEM HATASI', error);
                  toast({ 
                    title: "Hata", 
                    description: "İşlem sırasında bir hata oluştu.", 
                    variant: "destructive" 
                  });
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portföy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-4 flex-1">
              <Input
                placeholder="Ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="İl seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CITIES_VALUE}>Tüm İller</SelectItem>
                  {uniqueCities
                    .filter((city): city is string => typeof city === "string" && city.trim().length > 0)
                    .map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sektör seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SECTORS_VALUE}>Tüm Sektörler</SelectItem>
                  {uniqueSectors
                    .filter((sector): sector is string => typeof sector === "string" && sector.trim().length > 0)
                    .map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* PortfolioList bileşenine onContactedChange prop'unu ekleyin */}
          <PortfolioList 
            items={filteredItems} 
            onEdit={handleEditItem} 
            onDelete={handleDeleteItem} 
            onAddToCustomers={handleAddToCustomers}
            onContactedChange={handleContactedChange}
          />
        </CardContent>
      </Card>

      {/* Müşterilere ekle onay dialogu */}
      <Dialog open={!!confirmAddCustomerItem} onOpenChange={(open) => { if (!open) setConfirmAddCustomerItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Müşterilere Ekle</DialogTitle>
          </DialogHeader>
          <div>
            <p>
              <b>{confirmAddCustomerItem?.companyName}</b> adlı portföy kaydını müşterilere eklemek istiyor musunuz?
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmAddCustomerItem(null)}>
              Hayır
            </Button>
            <Button onClick={() => confirmAddCustomerItem && handleAddToCustomers(confirmAddCustomerItem)}>
              Evet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// react-hook-form ile portföy formu
export function PortfolioForm({ initialData, onSubmit }: { initialData?: PortfolioItem, onSubmit: (data: PortfolioFormValues) => void }) {
  const { user } = useAuth();
  const form = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioFormSchema),
    defaultValues: initialData ? {
      companyName: initialData.companyName,
      taxId: initialData.taxId || "",
      taxOffice: initialData.taxOffice || "",
      gsm: initialData.gsm || "",
      phone: initialData.phone || "",
      email: initialData.email || "",
      website: initialData.website || "",
      address: initialData.address || "",
      sector: initialData.sector || "",
      city: initialData.city || "",
      district: initialData.district || "",
      notes: initialData.notes || "",
    } : {
      companyName: "",
      taxId: "",
      taxOffice: "",
      gsm: "",
      phone: "",
      email: "",
      website: "",
      address: "",
      sector: "",
      city: "",
      district: "",
      notes: "",
    },
  });

  // Türkiye il/ilçe/vergi dairesi state'leri
  const [provinces, setProvinces] = React.useState<string[]>([]);
  const [districts, setDistricts] = React.useState<string[]>([]);
  const [taxOffices, setTaxOffices] = React.useState<string[]>([]);

  React.useEffect(() => {
    let mounted = true;
    fetchProvinces().then((list) => { if (mounted) setProvinces(list.map(p => p.name)); });
    return () => { mounted = false; };
  }, []);

  const selectedCity = form.watch("city") || "";
  React.useEffect(() => {
    let mounted = true;
    if (!selectedCity) { setDistricts([]); setTaxOffices([]); return; }
    fetchDistrictsByProvince(selectedCity).then((d) => { if (mounted) setDistricts(d); });
    fetchTaxOfficesByCity(selectedCity).then((o) => { if (mounted) setTaxOffices(o); });
    form.setValue("district", "");
    return () => { mounted = false; };
  }, [selectedCity]);
  // Form reset işlemi için useEffect
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        companyName: initialData.companyName,
        taxId: initialData.taxId || "",
        taxOffice: initialData.taxOffice || "",
        gsm: initialData.gsm || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        website: initialData.website || "",
        address: initialData.address || "",
        sector: initialData.sector || "",
        city: initialData.city || "",
        district: initialData.district || "",
        notes: initialData.notes || "",
      });
    } else {
      form.reset({
        companyName: "",
        taxId: "",
        taxOffice: "",
        gsm: "",
        phone: "",
        email: "",
        website: "",
        address: "",
        sector: "",
        city: "",
        district: "",
        notes: "",
      });
    }
  }, [initialData, form]);
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 py-2">
        <FormField control={form.control} name="companyName" render={({ field }) => (
          <FormItem>
            <FormLabel>Firma İsmi</FormLabel>
            <FormControl><Input placeholder="Firma adı yazın" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="taxId" render={({ field }) => (
          <FormItem>
            <FormLabel>VKN</FormLabel>
            <FormControl><Input placeholder="Vergi Kimlik Numarası" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="taxOffice" render={({ field }) => (
          <FormItem>
            <FormLabel>Vergi Dairesi</FormLabel>
            <FormControl><Input placeholder="Vergi Dairesi" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="gsm" render={({ field }) => (
          <FormItem>
            <FormLabel>GSM Numarası</FormLabel>
            <FormControl><Input placeholder="GSM numarası" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem>
            <FormLabel>Telefon Numarası</FormLabel>
            <FormControl><Input placeholder="Telefon numarası" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>E-posta Adresi</FormLabel>
            <FormControl><Input placeholder="E-posta adresi" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="website" render={({ field }) => (
          <FormItem>
            <FormLabel>İnternet Sitesi</FormLabel>
            <FormControl><Input placeholder="https://firma.com" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel>Adres</FormLabel>
            <FormControl><Input placeholder="Firma adresi" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="sector" render={({ field }) => (
          <FormItem>
            <FormLabel>Sektör</FormLabel>
            <FormControl><Input placeholder="Sektör girin" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="city" render={({ field }) => (
          <FormItem>
            <FormLabel>İl</FormLabel>
            <Select value={field.value || ""} onValueChange={(v) => field.onChange(v)}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="İl seçin" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {provinces.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="district" render={({ field }) => (
          <FormItem>
            <FormLabel>İlçe</FormLabel>
            <Select value={field.value || ""} onValueChange={(v) => field.onChange(v)} disabled={!selectedCity}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder={selectedCity ? "İlçe seçin" : "Önce il seçin"} /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {districts.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notlar</FormLabel>
            <FormControl><Textarea placeholder="Ek notlar..." {...field} rows={3} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end pt-2">
          <Button type="submit">
            {initialData ? "Güncelle" : "Ekle"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
