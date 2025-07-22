// src/app/useful-links/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2, ExternalLink, Link as LinkIconLucide } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { UsefulLink as UsefulLinkType } from '@/lib/types'; // Renamed to avoid conflict
import { getUsefulLinks, addUsefulLink, deleteUsefulLink } from '@/lib/storage';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link'; // For internal navigation if needed, not for the useful links themselves
import BackToHomeButton from '@/components/common/back-to-home-button';

export default function UsefulLinksPage() {
  const [links, setLinks] = useState<UsefulLinkType[]>([]);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const loadLinks = useCallback(async () => {
    if (!user || authLoading) {
      setIsLoading(false);
      console.log("loadLinks: User not available or auth loading. User:", user, "Auth Loading:", authLoading);
      return;
    }
    console.log("loadLinks: Attempting to load links for user.uid:", user.uid);
    setIsLoading(true);
    try {
        const fetchedLinks = await getUsefulLinks(user.uid);
        console.log("loadLinks: fetchedLinks received:", fetchedLinks);
        setLinks(fetchedLinks);
    } catch (error) {
        console.error("Error loading useful links:", error);
        toast({
            title: "Link Yükleme Hatası",
            description: "Kaydedilmiş linkler yüklenirken bir sorun oluştu.",
            variant: "destructive",
        });
        setLinks([]); // Hata durumunda boş dizi döndür
    }
    finally {
      setIsLoading(false);
    }
  }, [toast, user, authLoading]);

  useEffect(() => {
    document.title = "Faydalı Linkler | ERMAY";
    if (!authLoading && user) {
      loadLinks();
    }
  }, [authLoading, user, loadLinks]);

  const handleAddLink = useCallback(async () => {
    if (!newLinkName.trim() || !newLinkUrl.trim()) {
      toast({
        title: "Hata",
        description: "Link adı ve URL boş olamaz.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
      toast({
        title: "Yetkilendirme Hatası",
        description: "İşlem yapmak için giriş yapmış olmalısınız.",
        variant: "destructive",
      });
      return;
    }
    try {
      // Basic URL validation (can be more sophisticated)
      new URL(newLinkUrl); 
    } catch (_) {
      toast({
        title: "Hata",
        description: "Lütfen geçerli bir URL girin (örn: https://google.com).",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = await addUsefulLink(user.uid, { name: newLinkName, url: newLinkUrl });
      console.log('Link başarıyla eklendi:', result);
      setNewLinkName('');
      setNewLinkUrl('');
      loadLinks(); 
      toast({
        title: "Başarılı",
        description: "Yeni link eklendi.",
      });
    } catch (error: any) {
      console.error('Link eklenirken hata:', error);
      toast({
        title: "Link Ekleme Hatası",
        description: error.message || "Link eklenirken bir sorun oluştu. Firestore yazma izninizi kontrol edin.",
        variant: "destructive",
      });
    }
  }, [newLinkName, newLinkUrl, loadLinks, toast, user]);

  const handleDeleteLink = useCallback(async (id: string, name: string) => {
    if (!user) {
      toast({
        title: "Yetkilendirme Hatası",
        description: "İşlem yapmak için giriş yapmış olmalısınız.",
        variant: "destructive",
      });
      return;
    }
    try {
      await deleteUsefulLink(user.uid, id);
      loadLinks(); 
      toast({
        title: "Başarılı",
        description: `"${name}" adlı link silindi.`,
      });
    } catch (error: any) {
      toast({
        title: "Link Silme Hatası",
        description: error.message || "Link silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [loadLinks, toast, user]);

  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Faydalı linkler yükleniyor...</p>
      </div>
    );
  }

  console.log("Rendering UsefulLinksPage. Current links state:", links);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <BackToHomeButton />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <LinkIconLucide className="mr-3 h-7 w-7 text-primary" />
            Faydalı Linkler
          </CardTitle>
          <CardDescription>Sık kullandığınız web sitelerini ve kaynakları buraya kaydedin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <Label htmlFor="link-name" className="mb-1 block text-sm font-medium">Link Adı / Açıklaması</Label>
                <Input
                  id="link-name"
                  type="text"
                  placeholder="Örn: Google Haberler"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                />
              </div>
               <div>
                <Label htmlFor="link-url" className="mb-1 block text-sm font-medium">URL (Web Adresi)</Label>
                <Input
                  id="link-url"
                  type="url"
                  placeholder="https://news.google.com"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleAddLink} className="sm:w-auto sm:ml-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Link Ekle
            </Button>
          </div>

          {links.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Henüz kaydedilmiş link yok. Yukarıdan ekleyebilirsiniz!
            </p>
          ) : (
            <ScrollArea className="h-[400px] pr-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Link Adı</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Eklenme Tarihi</TableHead>
                    <TableHead className="text-right">Eylemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">{link.name}</TableCell>
                      <TableCell>
                        <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-primary hover:underline flex items-center gap-1 truncate max-w-xs"
                            title={link.url}
                        >
                          {link.url} <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(link.createdAt), "dd MMM yyyy, HH:mm", { locale: tr })}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteLink(link.id, link.name)}
                          className="text-destructive hover:text-destructive/80 h-8 w-8"
                          aria-label="Linki sil"
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
