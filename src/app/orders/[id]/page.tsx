"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, FileText, ArrowLeft, Edit } from 'lucide-react';
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { useToast } from "@/hooks/use-toast";
import { getOrderById } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import type { Order } from '@/lib/types';

const orderStatuses = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  in_production: 'Üretimde',
  ready: 'Hazır',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Edildi'
};

const orderPriorities = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  urgent: 'Acil'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_production: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!user || !params.id) return;
      
      try {
        const orderData = await getOrderById(user.uid, params.id as string);
        if (orderData) {
          setOrder(orderData);
        } else {
          toast({
            title: "Hata",
            description: "Sipariş bulunamadı.",
            variant: "destructive",
          });
          router.push('/orders');
        }
      } catch (error) {
        toast({
          title: "Hata",
          description: "Sipariş yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
        router.push('/orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [user, params.id, router, toast]);

  const handlePrintOrder = () => {
    if (!order) return;
    const data = encodeURIComponent(JSON.stringify(order));
    window.open(`/orders/${order.id}/print?data=${data}`, '_blank');
  };

  const handleDownloadOrder = () => {
    if (!order) return;
    
    const orderData = {
      siparisNo: order.orderNumber,
      musteri: order.customerName,
      siparisTarihi: format(parseSafeDate(order.orderDate), "dd.MM.yyyy"),
      teslimatTarihi: format(parseSafeDate(order.deliveryDate), "dd.MM.yyyy"),
      durum: orderStatuses[order.status],
      oncelik: orderPriorities[order.priority],
      toplamTutar: order.totalAmount.toLocaleString('tr-TR', {
        style: 'currency',
        currency: order.currency
      }),
      kalemler: order.items.map(item => ({
        urun: item.productName,
        miktar: item.quantity,
        birim: item.unit,
        ozellikler: item.specifications
      })),
      notlar: order.notes
    };

    const blob = new Blob([JSON.stringify(orderData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${order.orderNumber}_siparis.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEditOrder = () => {
    if (!order) return;
    router.push(`/orders?edit=${order.id}`);
  };

  // Güvenli tarih parse fonksiyonu
  function parseSafeDate(val: any): Date {
    if (!val) return new Date();
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    if (typeof val === 'string' && val.trim() !== '') {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Sipariş bulunamadı</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/orders')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri Dön
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Sipariş Detayı</h1>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handlePrintOrder}
            className="flex items-center space-x-2"
          >
            <Printer className="h-4 w-4" />
            Yazdır
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadOrder}
            className="flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            İndir
          </Button>
          <Button
            onClick={handleEditOrder}
            className="flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            Düzenle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sipariş Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle>Sipariş Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Sipariş No</label>
                <p className="text-lg font-semibold">{order.orderNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Müşteri</label>
                <p className="text-lg font-semibold">{order.customerName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Sipariş Tarihi</label>
                <p className="text-lg">{format(parseSafeDate(order.orderDate), "dd.MM.yyyy", { locale: tr })}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Teslimat Tarihi</label>
                <p className="text-lg">{format(parseSafeDate(order.deliveryDate), "dd.MM.yyyy", { locale: tr })}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Durum</label>
                <Badge className={statusColors[order.status]}>
                  {orderStatuses[order.status]}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Öncelik</label>
                <Badge className={priorityColors[order.priority]}>
                  {orderPriorities[order.priority]}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Toplam Tutar</label>
              <p className="text-2xl font-bold text-green-600">
                {order.totalAmount.toLocaleString('tr-TR', {
                  style: 'currency',
                  currency: order.currency
                })}
              </p>
            </div>
            {order.notes && (
              <div>
                <label className="text-sm font-medium text-gray-500">Notlar</label>
                <p className="text-sm bg-gray-50 p-3 rounded-md">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sipariş Kalemleri */}
        <Card>
          <CardHeader>
            <CardTitle>Sipariş Kalemleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün/Hizmet</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Birim</TableHead>
                    <TableHead>Özellikler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.specifications || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sipariş Geçmişi */}
      <Card>
        <CardHeader>
          <CardTitle>Sipariş Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium">Sipariş Oluşturuldu</p>
                <p className="text-sm text-gray-500">
                  {order.createdAt ? format(new Date(order.createdAt), "dd.MM.yyyy HH:mm", { locale: tr }) : 'Tarih bilgisi yok'}
                </p>
              </div>
            </div>
            {order.updatedAt && order.updatedAt !== order.createdAt && (
              <div className="flex items-center space-x-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Sipariş Güncellendi</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(order.updatedAt), "dd.MM.yyyy HH:mm", { locale: tr })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 