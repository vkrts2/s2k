// src/app/portfolio/[id]/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { PortfolioItem } from '@/lib/types';
import { getPortfolioItemById, updatePortfolioItem } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Briefcase, ArrowLeft, Save } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from "@/contexts/AuthContext"; // Bu satırı ekleyin

export default function PortfolioItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth(); // Bu satırı ekleyin
  const itemId = typeof params.id === 'string' ? params.id : undefined;

  const [portfolioItem, setPortfolioItem] = useState<PortfolioItem | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolioItem = useCallback(async () => { // async ekleyin
    if (!itemId || !user) { // user kontrolü ekleyin
      setError("Portföy kaydı ID bulunamadı veya oturum açılmamış.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const item = await getPortfolioItemById(user.uid, itemId); // await ve user.uid ekleyin
      if (item) {
        setPortfolioItem(item);
        setNotes(item.notes || '');
        document.title = `${item.companyName} | Portföy Detayı | ERMAY`;
      } else {
        setError("Portföy kaydı bulunamadı.");
        document.title = "Kayıt Bulunamadı | Portföy | ERMAY";
      }
    } catch (e: any) {
      console.error("Portföy kaydı yüklenirken hata:", e);
      setError("Portföy kaydı yüklenirken bir hata oluştu.");
      document.title = "Hata | Portföy | ERMAY";
    } finally {
      setIsLoading(false);
    }
  }, [itemId, user]); // user bağımlılığını ekleyin

  useEffect(() => {
    if (typeof window !== "undefined") { // Ensure runs on client
        loadPortfolioItem();
    }
  }, [loadPortfolioItem]);

  const handleSaveNotes = useCallback(async () => {
    if (!portfolioItem || !user) return; // user kontrolü ekleyin
    setIsSaving(true);
    try {
      const updatedItem = { ...portfolioItem, notes: notes };
      await updatePortfolioItem(user.uid, updatedItem); // await ve user.uid ekleyin
      setPortfolioItem(updatedItem); // Update local state immediately
      toast({
        title: "Notlar Kaydedildi",
        description: `${portfolioItem.companyName} için notlar başarıyla güncellendi.`,
      });
    } catch (e: any) {
      console.error("Notlar kaydedilirken hata:", e);
      toast({
        title: "Kayıt Hatası",
        description: "Notlar kaydedilirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [portfolioItem, notes, toast, user]); // user bağımlılığını ekleyin
  
  const safeFormatDate = (dateString: string | undefined) => {
    if (!dateString) return "Bilinmiyor";
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, "d MMMM yyyy, HH:mm", { locale: tr }) : "Geçersiz Tarih";
    } catch {
      return "Tarih Format Hatası";
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Portföy kaydı yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Bir Hata Oluştu</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.push('/portfolio')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Portföy Listesine Geri Dön
        </Button>
      </div>
    );
  }

  if (!portfolioItem) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Portföy Kaydı Bulunamadı</h1>
        <p className="text-muted-foreground mb-4">
          Bu ID ({itemId || 'N/A'}) ile bir portföy kaydı bulunamadı.
        </p>
        <Button variant="outline" onClick={() => router.push('/portfolio')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Portföy Listesine Geri Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="outline" onClick={() => router.push('/portfolio')} className="mb-4 print:hidden">
        <ArrowLeft className="mr-2 h-4 w-4" /> Portföy Listesine Geri Dön
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <Briefcase className="mr-3 h-7 w-7 text-primary" />
            {portfolioItem.companyName}
          </CardTitle>
          <CardDescription>Sektör: {portfolioItem.sector}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {portfolioItem.phone && <p><strong>Telefon:</strong> {portfolioItem.phone}</p>}
          {portfolioItem.address && <p><strong>Adres:</strong> {portfolioItem.address}</p>}
          {portfolioItem.city && <p><strong>İl:</strong> {portfolioItem.city}</p>}
          <p className="text-xs text-muted-foreground pt-2">
            Kayıt Tarihi: {safeFormatDate(portfolioItem.createdAt)} <br />
            Son Güncelleme: {safeFormatDate(portfolioItem.updatedAt)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notlar</CardTitle>
          <CardDescription>Bu portföy kaydıyla ilgili özel notlarınızı buraya ekleyebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="portfolio-notes">Notlarınız</Label>
            <Textarea
              id="portfolio-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bu firma veya kişi hakkında notlar..."
              rows={6}
              className="resize-y"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSaveNotes} disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Notları Kaydet
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
