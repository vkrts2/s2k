"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, CalendarIcon, FileText, Printer, Search, Check } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import BackToHomeButton from '@/components/common/back-to-home-button';
import { getCustomers, getOrders, addOrder, updateOrder, deleteOrder } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Order, OrderItem } from '@/lib/types';

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

export default function OrdersPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    orderDate: new Date(),
    deliveryDate: new Date(),
    status: 'pending' as Order['status'],
    priority: 'medium' as Order['priority'],
    currency: 'TRY',
    notes: '',
    items: [] as OrderItem[]
  });

  useEffect(() => {
    if (!user) return;
    getOrders(user.uid).then((orders) => {
      // Tarih alanlarını güvenli şekilde Date nesnesine çevir
      const safeOrders = orders.map(order => ({
        ...order,
        orderDate: parseSafeDate(order.orderDate),
        deliveryDate: parseSafeDate(order.deliveryDate),
      }));
      setOrders(safeOrders);
    });
  }, [user]);

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

  useEffect(() => {
    if (!user) return;
    getCustomers(user.uid).then((customers) => {
      // Sadece customers koleksiyonundan gelen müşterileri filtrele (portfolio olmayanlar)
      const regularCustomers = customers.filter(customer => !customer.id.startsWith('portfolio_'));
      setCustomers(regularCustomers);
    });
  }, [user]);

  const saveOrders = async (newOrders: Order[]) => {
    setOrders(newOrders);
  };

  const handleAddOrder = async () => {
    if (!user) return;
    
    try {
      const newOrderData = {
        orderNumber: `SIP-${Date.now()}`,
        customerName: orderForm.customerName,
        customerId: '',
        orderDate: orderForm.orderDate,
        deliveryDate: orderForm.deliveryDate,
        status: orderForm.status as Order['status'],
        priority: orderForm.priority,
        totalAmount: 0, // Artık kalemlerden hesaplanmıyor
        currency: orderForm.currency,
        items: orderForm.items,
        notes: orderForm.notes,
      };
      
      const newOrder = await addOrder(user.uid, newOrderData);
      setOrders([newOrder, ...orders]);
      setShowOrderModal(false);
      resetForm();
      toast({
        title: "Başarılı",
        description: "Sipariş başarıyla eklendi.",
      });
      // confirm kutusu kaldırıldı
    } catch (error) {
      toast({
        title: "Hata",
        description: "Sipariş eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setOrderForm({
      customerName: order.customerName,
      orderDate: new Date(order.orderDate),
      deliveryDate: new Date(order.deliveryDate),
      status: order.status,
      priority: order.priority,
      currency: order.currency,
      notes: order.notes || '',
      items: order.items.map(item => ({
        ...item,
        quantity: typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 1,
        unit: item.unit || 'top',
      })),
    });
    setShowOrderModal(true);
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder || !user) return;
    
    try {
      const updatedOrderData = {
        ...editingOrder,
        customerName: orderForm.customerName,
        orderDate: orderForm.orderDate,
        deliveryDate: orderForm.deliveryDate,
        status: orderForm.status as Order['status'],
        priority: orderForm.priority,
        totalAmount: 0, // Artık kalemlerden hesaplanmıyor
        currency: orderForm.currency,
        items: orderForm.items,
        notes: orderForm.notes,
      };
      
      const updatedOrder = await updateOrder(user.uid, updatedOrderData);
      const newOrders = orders.map(order =>
        order.id === updatedOrder.id ? updatedOrder : order
      );
      setOrders(newOrders);
      setShowOrderModal(false);
      setEditingOrder(null);
      resetForm();
      toast({
        title: "Başarılı",
        description: "Sipariş başarıyla güncellendi.",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Sipariş güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!user) return;
    
    try {
      await deleteOrder(user.uid, orderId);
      const updatedOrders = orders.filter(order => order.id !== orderId);
      setOrders(updatedOrders);
      toast({
        title: "Başarılı",
        description: "Sipariş başarıyla silindi.",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Sipariş silinirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      handleDeleteOrder(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handlePrintOrder = (order: Order) => {
    const data = encodeURIComponent(JSON.stringify(order));
    window.open(`/orders/${order.id}/print?data=${data}`, '_blank');
  };

  // İşlemler kısmındaki handleDownloadOrder fonksiyonunu PDF indirme için güncelle
  const handleDownloadOrder = (order: Order) => {
    // Yazdırma sayfasını yeni sekmede açıp PDF indirmeyi başlatacak bir URL oluştur
    const url = `/orders/${order.id}/print?pdf=1`;
    window.open(url, '_blank');
    toast({
      title: "PDF İndiriliyor",
      description: "Sipariş PDF dosyanız yeni sekmede hazırlanıyor.",
    });
  };

  // Siparişi tamamlandı olarak işaretle
  const handleMarkAsDelivered = async (order: Order) => {
    if (!user) return;
    const updatedOrder = { ...order, status: 'delivered' as Order['status'] };
    await updateOrder(user.uid, updatedOrder);
    setOrders(orders.map(o => o.id === order.id ? updatedOrder : o));
    toast({
      title: 'Sipariş tamamlandı olarak işaretlendi',
      description: `${order.orderNumber} teslim edildi olarak güncellendi.`,
    });
  };

  const resetForm = () => {
    setOrderForm({
      customerName: '',
      orderDate: new Date(),
      deliveryDate: new Date(),
      status: 'pending',
      priority: 'medium',
      currency: 'TRY',
      notes: '',
      items: []
    });
  };

  const addOrderItem = () => {
    setOrderForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Math.random().toString(36).substr(2, 9),
          productName: '',
          quantity: 1,
          unit: 'top',
          specifications: '',
        },
      ],
    }));
  };

  const removeOrderItem = (index: number) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateOrderItem = <K extends keyof OrderItem>(index: number, field: K, value: OrderItem[K]) => {
    setOrderForm(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] } as OrderItem;
      (item[field] as OrderItem[K]) = value;
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const filteredOrders = orders
    .filter(order => {
      const orderNum = (order.orderNumber ?? '').toString().toLowerCase();
      const customer = (order.customerName ?? '').toString().toLowerCase();
      const query = (searchQuery ?? '').toString().toLowerCase();
      return orderNum.includes(query) || customer.includes(query);
    })
    .sort((a, b) => {
      // Tamamlanan siparişleri alta al, bekleyen siparişleri üste al
      const statusPriority = {
        'pending': 1,
        'confirmed': 2,
        'in_production': 3,
        'ready': 4,
        'delivered': 5,
        'cancelled': 6
      };
      
      const aPriority = statusPriority[a.status] || 7;
      const bPriority = statusPriority[b.status] || 7;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Aynı durumda olan siparişleri tarihe göre sırala (en yeni üstte)
      return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
    });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Sipariş Yönetimi</h2>
        <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingOrder(null); setShowOrderModal(true); resetForm(); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Sipariş
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-screen-md w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background z-50 pb-4 border-b">
              <DialogTitle>{editingOrder ? "Sipariş Düzenle" : "Yeni Sipariş"}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Müşteri</Label>
                  <Select value={orderForm.customerName} onValueChange={(value) => setOrderForm(prev => ({ ...prev, customerName: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Müşteri seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.name} value={customer.name}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Öncelik</Label>
                  <Select value={orderForm.priority} onValueChange={(value: Order['priority']) => setOrderForm(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Düşük</SelectItem>
                      <SelectItem value="medium">Orta</SelectItem>
                      <SelectItem value="high">Yüksek</SelectItem>
                      <SelectItem value="urgent">Acil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sipariş Tarihi</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {format(orderForm.orderDate, "dd.MM.yyyy")}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={orderForm.orderDate}
                        onSelect={(date) => date && setOrderForm(prev => ({ ...prev, orderDate: date }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Teslimat Tarihi</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {format(orderForm.deliveryDate, "dd.MM.yyyy")}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={orderForm.deliveryDate}
                        onSelect={(date) => date && setOrderForm(prev => ({ ...prev, deliveryDate: date }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Durum</Label>
                  <Select value={orderForm.status} onValueChange={(value: Order['status']) => setOrderForm(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Beklemede</SelectItem>
                      <SelectItem value="confirmed">Onaylandı</SelectItem>
                      <SelectItem value="in_production">Üretimde</SelectItem>
                      <SelectItem value="ready">Hazır</SelectItem>
                      <SelectItem value="delivered">Teslim Edildi</SelectItem>
                      <SelectItem value="cancelled">İptal Edildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Para Birimi</Label>
                  <Select value={orderForm.currency} onValueChange={(value) => setOrderForm(prev => ({ ...prev, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">₺ - Türk Lirası</SelectItem>
                      <SelectItem value="USD">$ - Dolar</SelectItem>
                      <SelectItem value="EUR">€ - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Notlar</Label>
                <Textarea
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Sipariş notları..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Sipariş Kalemleri</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Kalem Ekle
                  </Button>
                </div>
                {orderForm.items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 mb-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Kalem {index + 1}</h4>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeOrderItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Ürün/Hizmet Adı</Label>
                        <Input
                          value={item.productName}
                          onChange={(e) => updateOrderItem(index, 'productName', e.target.value)}
                          placeholder="Ürün veya hizmet adı"
                        />
                      </div>
                      <div>
                        <Label>Miktar</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, 'quantity', Number(e.target.value))}
                            placeholder="Miktar"
                          />
                          <select
                            className="border rounded px-2 py-1"
                            value={item.unit}
                            onChange={e => updateOrderItem(index, 'unit', e.target.value as OrderItem['unit'])}
                          >
                            <option value="top">Top Adeti</option>
                            <option value="kg">Kg</option>
                            <option value="mt">Mt</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>Teknik Özellikler</Label>
                      <Textarea
                        value={item.specifications || ''}
                        onChange={(e) => updateOrderItem(index, 'specifications', e.target.value)}
                        placeholder="Teknik özellikler ve detaylar..."
                      />
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowOrderModal(false)}>
                  İptal
                </Button>
                <Button onClick={editingOrder ? handleUpdateOrder : handleAddOrder}>
                  {editingOrder ? "Güncelle" : "Ekle"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Siparişler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Sipariş ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sipariş No</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Sipariş Tarihi</TableHead>
                  <TableHead>Teslimat Tarihi</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Öncelik</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto font-medium"
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        {order.orderNumber}
                      </Button>
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>{format(new Date(order.orderDate), "dd.MM.yyyy", { locale: tr })}</TableCell>
                    <TableCell>{format(new Date(order.deliveryDate), "dd.MM.yyyy", { locale: tr })}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'in_production' ? 'bg-orange-100 text-orange-800' :
                        order.status === 'ready' ? 'bg-green-100 text-green-800' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {orderStatuses[order.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                        order.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                        order.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {orderPriorities[order.priority]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {order.totalAmount.toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: order.currency
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          title="Siparişi Yazdır"
                          onClick={() => handlePrintOrder(order)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="icon"
                          title="Siparişi Tamamlandı Olarak İşaretle"
                          onClick={() => handleMarkAsDelivered(order)}
                          disabled={order.status === 'delivered'}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Siparişi Düzenle"
                          onClick={() => handleEditOrder(order)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Siparişi Sil"
                          onClick={() => setDeleteConfirmId(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Silme Onayı</AlertDialogTitle>
            <AlertDialogDescription>
              Bu siparişi silmek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hayır</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Evet</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 