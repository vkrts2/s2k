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
import BackToHomeButton from '@/components/common/back-to-home-button';

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
          description: "Lütfen bir .json dosyası seçin.",
          variant: "destructive",
        });
        setSelectedFile(null);
      }
    }
  };

  const confirmRestoreData = () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const backupData = JSON.parse(jsonString);
        
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
      } catch (error) {
        console.error("Geri yükleme hatası:", error);
        toast({
          title: "Geri Yükleme Hatası",
          description: "Dosya okunurken veya veriler geri yüklenirken bir hata oluştu. Dosyanın bozuk olmadığından emin olun.",
          variant: "destructive",
        });
      } finally {
        setShowRestoreConfirm(false);
      }
    };
    reader.readAsText(selectedFile);
  };

  return (
    <div className="container mx-auto py-8">
      <BackToHomeButton />
      <Card>
        <CardHeader>
          <CardTitle>Ayarlar</CardTitle>
          <CardDescription>Uygulama genel ayarları, veri yedekleme ve geri yükleme işlemleri.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h3 className="text-lg font-medium">Genel Ayarlar</h3>
            <p className="text-sm text-muted-foreground">
              Bu bölüm ileride tema, dil veya diğer kullanıcı tercihleri için genişletilebilir.
            </p>
          </div>
          
          <Separator />

          <div>
            <h3 className="text-lg font-medium">Veri Yönetimi</h3>
            <p className="text-sm text-muted-foreground">
              Uygulama verilerinizi yedekleyin veya yedekten geri yükleyin. Tüm veriler tarayıcınızda saklanır.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Verileri Yedekle</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    Tüm müşteri, tedarikçi, işlem, yapılacaklar, portföy, arşiv ve link verilerinizi tek bir JSON dosyası olarak bilgisayarınıza indirin.
                  </CardDescription>
                  <Button onClick={handleBackupData}>
                    <Download className="mr-2 h-4 w-4" /> Yedeklemeyi Başlat
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Verileri Geri Yükle</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    Daha önce yedeklediğiniz bir JSON dosyasını seçerek verilerinizi geri yükleyebilirsiniz.
                    <span className="mt-2 flex items-start text-destructive font-semibold">
                      <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                      **Uyarı:** Bu işlem mevcut tüm verilerinizin üzerine yazacaktır ve geri alınamaz.
                    </span>
                  </CardDescription>
                  <div className="flex items-center gap-2">
                    <Input id="restore-file-input" type="file" accept=".json" onChange={handleFileChange} className="flex-grow"/>
                    <Button onClick={() => setShowRestoreConfirm(true)} disabled={!selectedFile}>
                      <Upload className="mr-2 h-4 w-4" /> Yükle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem, mevcut tüm verilerinizi seçtiğiniz yedekleme dosyasındaki verilerle değiştirecektir.
              Bu eylem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestoreData}>Evet, Geri Yükle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
