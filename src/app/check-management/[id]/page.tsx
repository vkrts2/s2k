// src/app/check-management/[id]/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useAuth } from '@/contexts/AuthContext';
import { getCheckById } from '@/lib/storage';
import type { BankCheck } from '@/lib/types';
import BackToHomeButton from '@/components/common/back-to-home-button';

export default function CheckDetailPage() {
  const params = useParams();
  const checkId = typeof params.id === 'string' ? params.id : undefined;
  const { user } = useAuth();
  const [check, setCheck] = useState<BankCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !checkId) return;
    
    const fetchCheck = async () => {
      try {
        const fetchedCheck = await getCheckById(user.uid, checkId);
        if (fetchedCheck) {
          setCheck(fetchedCheck);
          document.title = `Çek: ${fetchedCheck.checkNumber} | ERMAY`;
        } else {
          setError("Çek bulunamadı");
        }
      } catch (err) {
        console.error("Çek yüklenirken hata:", err);
        setError("Çek yüklenirken bir hata oluştu");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCheck();
  }, [user, checkId]);

  const getStatusBadge = (status: BankCheck['status']) => {
    const statusConfig = {
      pending: { label: 'Beklemede', className: 'bg-yellow-100 text-yellow-800' },
      cleared: { label: 'Tahsil Edildi', className: 'bg-green-100 text-green-800' },
      bounced: { label: 'Karşılıksız', className: 'bg-red-100 text-red-800' },
      cancelled: { label: 'İptal Edildi', className: 'bg-gray-100 text-gray-800' },
    };
    
    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Yükleniyor...</div>
      </div>
    );
  }

  if (error || !check) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center text-red-500">{error || "Çek bulunamadı"}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri Dön
          </Button>
          <h1 className="text-3xl font-bold">Çek Detayları</h1>
        </div>
        <div className="flex space-x-2 print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Yazdır
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Çek Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle>Çek Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Çek Numarası</label>
                <p className="text-lg font-semibold">{check.checkNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Durum</label>
                <div className="mt-1">{getStatusBadge(check.status)}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Banka Adı</label>
                <p className="text-lg">{check.bankName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Şube Adı</label>
                <p className="text-lg">{check.branchName || '-'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Hesap Numarası</label>
                <p className="text-lg">{check.accountNumber || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tutar</label>
                <p className="text-lg font-semibold text-green-600">
                  {Number(check.amount).toLocaleString('tr-TR', { 
                    style: 'currency', 
                    currency: 'TRY' 
                  })}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Keşide Tarihi</label>
                <p className="text-lg">
                  {format(new Date(check.issueDate), "dd.MM.yyyy", { locale: tr })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Vade Tarihi</label>
                <p className="text-lg">
                  {format(new Date(check.dueDate), "dd.MM.yyyy", { locale: tr })}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Taraf Tipi</label>
                <p className="text-lg capitalize">
                  {check.partyType === 'customer' ? 'Müşteri' : 'Tedarikçi'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Taraf Adı</label>
                <p className="text-lg font-semibold">{check.partyName}</p>
              </div>
            </div>
            
            {check.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">Açıklama</label>
                <p className="text-lg">{check.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Çek Görselleri */}
        <Card>
          <CardHeader>
            <CardTitle>Çek Görselleri</CardTitle>
          </CardHeader>
          <CardContent>
            {check.images && check.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {check.images.map((imageName, index) => (
                  <div key={index} className="border rounded-lg p-4 text-center">
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                      <span className="text-gray-500 text-sm">Görsel {index + 1}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{imageName}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 w-full"
                      onClick={() => {
                        // TODO: Implement image download/view functionality
                        console.log('Viewing image:', imageName);
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Görüntüle
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Bu çek için henüz görsel eklenmemiş</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
