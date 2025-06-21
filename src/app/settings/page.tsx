// src/app/settings/page.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Download, Upload, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { format } from 'date-fns';

const LOCALSTORAGE_KEYS = [
  "ermay_customers",
  "ermay_sales",
  "ermay_payments",
  "ermay_suppliers",
  "ermay_purchases",
  "ermay_payments_to_suppliers",
  "ermay_todos",
  "ermay_portfolio_items",
  "ermay_archived_files_metadata",
  "ermay_useful_links",
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const handleBackupData = () => {
    try {
      const backupData: Record<string, any> = {};
      LOCALSTORAGE_KEYS.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          backupData[key] = JSON.parse(data);
        }
      });

      if (Object.keys(backupData).length === 0) {
        toast({
          title: "Yedeklenecek Veri Yok",
          description: "Uygulamada yedeklenecek kayıtlı veri bulunamadı.",
          variant: "default",
        });
        return;
      }

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const formattedDate = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      a.download = `ERMAY_yedek_${formattedDate}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Veriler Yedeklendi",
        description: `ERMAY_yedek_${formattedDate}.json dosyası başarıyla indirildi.`,
      });
    } catch (error) {
      console.error("Yedekleme hatası:", error);
      toast({
        title: "Yedekleme Hatası",
        description: "Veriler yedeklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === "application/json") {
        setSelectedFile(file);
      } else {
        toast({
          title: "Geçersiz Dosya Türü",
          description: "Lütfen .json uzantılı bir yedek dosyası seçin.",
          variant: "destructive",
        });
        setSelectedFile(null);
        // Reset file input
        event.target.value = "";
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleRestoreData = () => {
    if (!selectedFile) {
      toast({
        title: "Dosya Seçilmedi",
        description: "Lütfen geri yüklemek için bir yedek dosyası seçin.",
        variant: "destructive",
      });
      return;
    }
    setShowRestoreConfirm(true);
  };

  const confirmRestoreData = () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const backupData = JSON.parse(jsonString);

        // Önce mevcut verileri temizleyebilir veya üzerine yazabiliriz.
        // Güvenlik için, sadece yedekte olan key'leri güncelleyelim.
        // İsteğe bağlı olarak, tüm ermay key'lerini önce silebiliriz.
        // LOCALSTORAGE_KEYS.forEach(key => localStorage.removeItem(key));


        let restoredKeyCount = 0;
        for (const key in backupData) {
          if (LOCALSTORAGE_KEYS.includes(key) && backupData.hasOwnProperty(key)) {
            localStorage.setItem(key, JSON.stringify(backupData[key]));
            restoredKeyCount++;
          }
        }
        
        if (restoredKeyCount === 0) {
             toast({
                title: "Geri Yükleme Başarısız",
                description: "Yedek dosyasında geçerli ERMAY verisi bulunamadı veya formatı bozuk.",
                variant: "destructive",
             });
             return;
        }

        toast({
          title: "Veriler Geri Yüklendi",
          description: "Veriler yedek dosyasından başarıyla geri yüklendi. Değişikliklerin tam olarak yansıması için uygulamayı yeniden başlatmanız veya sayfayı yenilemeniz önerilir.",
          duration: 7000,
        });
        setSelectedFile(null);
        const fileInput = document.getElementById('restore-file-input') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = "";
        }
        // Sayfayı yeniden yükleyerek verilerin güncel halinin gösterilmesi sağlanabilir.
        // window.location.reload(); // Kullanıcıya bırakmak daha iyi olabilir.
      } catch (error) {
        console.error("Geri yükleme hatası:", error);
        toast({
          title: "Geri Yükleme Hatası",
          description: "Yedek dosyası okunurken veya veriler geri yüklenirken bir sorun oluştu. Dosyanın formatı bozuk olabilir.",
          variant: "destructive",
        });
      } finally {
        setShowRestoreConfirm(false);
      }
    };
    reader.onerror = () => {
        console.error("Dosya okuma hatası:", reader.error);
        toast({
            title: "Dosya Okuma Hatası",
            description: "Seçilen dosya okunurken bir hata oluştu.",
            variant: "destructive",
        });
        setShowRestoreConfirm(false);
    };
    reader.readAsText(selectedFile);
  };

  const handleClearLocalSalesPayments = () => {
    localStorage.removeItem('ermay_sales');
    localStorage.removeItem('ermay_payments');
    toast({
      title: 'Yerel Satış ve Ödeme Verileri Silindi',
      description: 'Localda tutulan eski satış ve ödeme kayıtları temizlendi.',
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <SettingsIcon className="mr-3 h-8 w-8 text-primary" /> Ayarlar
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            Genel Ayarlar
          </CardTitle>
          <CardDescription>Uygulama genel ayarları.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Bu bölüm ileride tema, dil veya diğer kullanıcı tercihleri için genişletilebilir.
          </p>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
             <Download className="mr-2 h-5 w-5 text-primary" /> Veri Yönetimi
          </CardTitle>
          <CardDescription>Uygulama verilerinizi yedekleyin veya yedekten geri yükleyin. Tüm veriler tarayıcınızda saklanır.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">Verileri Yedekle</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Tüm müşteri, tedarikçi, işlem, yapılacaklar, portföy, arşiv ve link verilerinizi tek bir JSON dosyası olarak bilgisayarınıza indirin.
            </p>
            <Button onClick={handleBackupData}>
              <Download className="mr-2 h-4 w-4" /> Yedeklemeyi Başlat
            </Button>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium mb-2">Verileri Geri Yükle</h4>
            <p className="text-sm text-muted-foreground mb-1">
              Daha önce yedeklediğiniz bir JSON dosyasını seçerek verilerinizi geri yükleyebilirsiniz.
            </p>
            <p className="text-xs text-destructive mb-3 flex items-center gap-1">
                <AlertTriangle size={14} /> **Uyarı:** Bu işlem mevcut tüm verilerinizin üzerine yazacaktır ve geri alınamaz.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="w-full sm:flex-grow">
                <Label htmlFor="restore-file-input">Yedek Dosyası (.json)</Label>
                <Input
                  id="restore-file-input"
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleRestoreData} disabled={!selectedFile} className="w-full sm:w-auto">
                <Upload className="mr-2 h-4 w-4" /> Yedekten Geri Yükle
              </Button>
            </div>
            {selectedFile && (
              <p className="text-xs text-muted-foreground mt-1">
                Seçilen dosya: {selectedFile.name}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-destructive">
                <AlertTriangle className="mr-2 h-5 w-5" /> Emin misiniz?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Mevcut tüm ERMAY verileriniz seçtiğiniz yedek dosyasındaki verilerle **değiştirilecektir**. 
              Devam etmek istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestoreData}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Evet, Geri Yükle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Separator className="my-6" />
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Yerel Satış ve Ödeme Verilerini Temizle</h3>
        <Button variant="destructive" onClick={handleClearLocalSalesPayments}>
          Yerel Satış ve Ödeme Kayıtlarını Sil
        </Button>
      </div>

    </div>
  );
}
