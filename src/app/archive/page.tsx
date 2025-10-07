// src/app/archive/page.tsx
"use client";

import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadCloud, Trash2, FolderArchive, Download } from 'lucide-react'; // Download ikonu eklendi
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { ArchivedFile } from '@/lib/types';
import { getArchivedFilesMetadata, addArchivedFile, deleteArchivedFile } from '@/lib/storage';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import BackToHomeButton from '@/components/common/back-to-home-button';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function ArchivePage() {
  const [archivedFiles, setArchivedFiles] = useState<ArchivedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // Dosya işleme durumu için
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const loadArchivedFiles = useCallback(async () => {
    if (!user || authLoading) {
      setIsLoading(false);
      return;
    }
    console.log("loadArchivedFiles: User object", user, "User UID:", user?.uid);
    setIsLoading(true);
    try {
        const fetchedFiles = await getArchivedFilesMetadata(user.uid);
        setArchivedFiles(fetchedFiles);
    } catch (error) {
        console.error("Error loading archived files metadata:", error);
        toast({
            title: "Meta Veri Yükleme Hatası",
            description: "Arşivlenmiş dosya bilgileri yüklenirken bir sorun oluştu.",
            variant: "destructive",
        });
        setArchivedFiles([]); // Hata durumunda boş dizi döndür
    } finally {
        setIsLoading(false);
    }
  }, [toast, user, authLoading]);

  useEffect(() => {
    document.title = "Dosya Arşivi | ERMAY";
    if (!authLoading && user) {
      loadArchivedFiles();
    }
  }, [authLoading, user, loadArchivedFiles]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleFileUpload = useCallback(async () => {
    if (!selectedFile) {
      toast({
        title: "Hata",
        description: "Lütfen önce bir dosya seçin.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const fileMetadataInput: Omit<ArchivedFile, 'id' | 'uploadDate'> = {
        name: selectedFile.name,
        type: selectedFile.type || 'application/octet-stream',
        size: selectedFile.size,
      };
      
      // Dosya içeriğini Blob olarak alıyoruz
      const fileBlob = new Blob([selectedFile], { type: selectedFile.type });
      
      // Dosyayı IndexedDB'ye kaydediyoruz
      // await storeFileInDB(fileMetadataInput.name, fileBlob);
      
      // Metadata'yı Firestore'a kaydediyoruz
      await addArchivedFile(user!.uid, fileMetadataInput, fileBlob);
      
      setSelectedFile(null); // Reset file input
      const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
      loadArchivedFiles();
      toast({
        title: "Başarılı",
        description: `${selectedFile.name} adlı dosya ve bilgileri arşive eklendi.`,
      });
    } catch (error: any) {
      console.error("File upload error:", error);
      toast({
        title: "Dosya Ekleme Hatası",
        description: error.message || "Dosya arşive eklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, loadArchivedFiles, toast, user]);

  const handleDeleteFile = useCallback(async (fileId: string, fileName: string) => {
    setIsProcessing(true);
    if (!user) {
      toast({
        title: "Yetkilendirme Hatası",
        description: "İşlem yapmak için giriş yapmış olmalısınız.",
        variant: "destructive",
      });
      return;
    }
    try {
      // Önce IndexedDB'den dosyayı siliyoruz
      // await deleteFileFromDB(fileName);
      // Sonra Firestore'dan metadata'yı siliyoruz
      await deleteArchivedFile(user!.uid, fileId);
      loadArchivedFiles();
      toast({
        title: "Başarılı",
        description: `${fileName} adlı dosya ve bilgisi arşivden silindi.`,
      });
    } catch (error: any) {
      console.error("File deletion error:", error);
      toast({
        title: "Dosya Silme Hatası",
        description: error.message || "Dosya silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [loadArchivedFiles, toast, user]);

  const handleDownloadFile = useCallback(async (fileId: string, fileName: string) => {
    setIsProcessing(true);
    try {
      // IndexedDB'den dosyayı alıyoruz
      // const fileBlob = await getFileFromDB(fileName);
      // if (fileBlob) {
      //   const url = URL.createObjectURL(fileBlob);
      //   const a = document.createElement('a');
      //   a.href = url;
      //   a.download = fileName;
      //   a.click();
      //   URL.revokeObjectURL(url);
      // }
      toast({
        title: "Hata",
        description: "Dosya bulunamadı veya içeriği bozuk.",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error("File download error:", error);
      toast({
        title: "Dosya İndirme Hatası",
        description: error.message || "Dosya indirilirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Arşivlenmiş dosya bilgileri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <BackToHomeButton />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <FolderArchive className="mr-3 h-7 w-7 text-primary" />
            Dosya Arşivi
          </CardTitle>
          <CardDescription>
            Belgelerinizi ve dosyalarınızı buradan yönetin. Dosyalar tarayıcınızın yerel depolama alanında (IndexedDB) saklanır. 
            Tarayıcı verilerini temizlerseniz bu dosyalar kaybolabilir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
            <div className="flex-grow">
              <Label htmlFor="file-upload-input" className="mb-1 block text-sm font-medium">
                Arşive Dosya Ekle
              </Label>
              <Input
                id="file-upload-input"
                type="file"
                onChange={handleFileChange}
                className="cursor-pointer"
                disabled={isProcessing}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  Seçilen dosya: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>
            <Button onClick={handleFileUpload} disabled={!selectedFile || isProcessing}>
              {isProcessing && !selectedFile ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div> Yükleniyor...</> : <><UploadCloud className="mr-2 h-4 w-4" /> Seçileni Arşive Ekle</>}
            </Button>
          </div>

          {archivedFiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Arşivde hiç dosya yok. Yukarıdan ekleyebilirsiniz.
            </p>
          ) : (
            <ScrollArea className="h-[400px] pr-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dosya Adı</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Boyut</TableHead>
                    <TableHead>Yüklenme Tarihi</TableHead>
                    <TableHead className="text-right">Eylemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(archivedFiles) && archivedFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">{file.name}</TableCell>
                      <TableCell>{file.type}</TableCell>
                      <TableCell>{formatFileSize(file.size)}</TableCell>
                      <TableCell>
                        {format(parseISO(file.uploadDate), "dd MMM yyyy, HH:mm", { locale: tr })}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleDownloadFile(file.id, file.name)}
                            disabled={isProcessing}
                            className="h-8 w-8"
                            aria-label="Dosyayı indir"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFile(file.id, file.name)}
                          disabled={isProcessing}
                          className="text-destructive hover:text-destructive/80 h-8 w-8"
                          aria-label="Dosyayı ve bilgisini sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
