'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, Edit, Trash, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/types';

const purchaseOrderFormSchema = z.object({
  supplierId: z.string().min(1, { message: "Tedarikçi seçimi zorunludur." }),
  supplierName: z.string().min(1, { message: "Tedarikçi adı zorunludur." }),
  orderNumber: z.string().min(1, { message: "Sipariş numarası zorunludur." }),
  orderDate: z.string({
    required_error: "Sipariş tarihi zorunludur.",
  }),
  expectedDeliveryDate: z.string().optional().or(z.literal("")),
  status: z.enum(['Beklemede', 'Onaylandı', 'Tamamlandı', 'İptal Edildi']),
  notes: z.string().optional(),
  items: z.array(z.object({
    productName: z.string().min(1, { message: "Ürün adı zorunludur." }),
    quantity: z.number().min(1, { message: "Miktar en az 1 olmalıdır." }),
    unitPrice: z.number().min(0, { message: "Birim fiyat negatif olamaz." }),
    id: z.string().optional(),
    total: z.number().optional(),
  })).min(1, { message: "En az bir ürün eklemelisiniz." }),
});

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    {
      id: "po1",
      supplierId: "1",
      supplierName: "ABC Malzemeleri",
      orderNumber: "PO-2024-001",
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 gün sonrası
      status: 'Beklemede',
      items: [
        { id: "poi1", productName: "Kalem", quantity: 100, unitPrice: 0.5, total: 50 },
        { id: "poi2", productName: "Defter", quantity: 50, unitPrice: 2.0, total: 100 },
      ],
      totalAmount: 150,
      createdAt: new Date().toISOString(),
    },
    {
      id: "po2",
      supplierId: "2",
      supplierName: "XYZ Üretim",
      orderNumber: "PO-2024-002",
      orderDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 gün öncesi
      status: 'Tamamlandı',
      items: [
        { id: "poi3", productName: "Çelik Boru", quantity: 10, unitPrice: 50.0, total: 500 },
      ],
      totalAmount: 500,
      createdAt: new Date().toISOString(),
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      supplierId: '',
      supplierName: '',
      orderNumber: '',
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: '',
      status: 'Beklemede',
      notes: '',
      items: [],
    },
  });

  const handleAddPurchaseOrder = (values: PurchaseOrderFormValues) => {
    const newOrder: PurchaseOrder = {
      id: Math.random().toString(36).substr(2, 9),
      ...values,
      items: values.items.map(item => ({
        ...item,
        id: item.id || Math.random().toString(36).substr(2, 9),
        total: item.quantity * item.unitPrice,
      })),
      totalAmount: values.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPurchaseOrders(prev => [...prev, newOrder]);
    setShowOrderModal(false);
    form.reset();
  };

  const handleEditPurchaseOrder = (values: PurchaseOrderFormValues) => {
    if (!editingOrder) return;
    setPurchaseOrders(prev =>
      prev.map(order =>
        order.id === editingOrder.id
          ? {
              ...order,
              ...values,
              items: values.items.map(item => ({
                ...item,
                id: item.id || Math.random().toString(36).substr(2, 9),
                total: item.quantity * item.unitPrice,
              })),
              totalAmount: values.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
              updatedAt: new Date().toISOString(),
            }
          : order
      )
    );
    setShowOrderModal(false);
    setEditingOrder(null);
    form.reset();
  };

  const handleDeletePurchaseOrder = (id: string) => {
    setPurchaseOrders(prev => prev.filter(order => order.id !== id));
  };

  const openEditModal = (order: PurchaseOrder) => {
    setEditingOrder(order);
    form.reset({
      ...order,
      orderDate: order.orderDate.split('T')[0], // Tarih formatını ayarla
      expectedDeliveryDate: order.expectedDeliveryDate?.split('T')[0] || '',
    });
    setShowOrderModal(true);
  };

  const filteredOrders = purchaseOrders.filter(order => 
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Satın Alma Siparişleri</h2>
        <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingOrder(null); form.reset(); setShowOrderModal(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Satın Alma Siparişi
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>{editingOrder ? 'Satın Alma Siparişi Düzenle' : 'Yeni Satın Alma Siparişi Ekle'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(editingOrder ? handleEditPurchaseOrder : handleAddPurchaseOrder)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="supplierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tedarikçi Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="Tedarikçi adı" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="orderNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sipariş Numarası</FormLabel>
                      <FormControl>
                        <Input placeholder="Örn: PO-2024-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="orderDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Sipariş Tarihi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP", { locale: tr })
                              ) : (
                                <span>Tarih seçin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expectedDeliveryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tahmini Teslim Tarihi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP", { locale: tr })
                              ) : (
                                <span>Tarih seçin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durum</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Durum seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Beklemede">Beklemede</SelectItem>
                          <SelectItem value="Onaylandı">Onaylandı</SelectItem>
                          <SelectItem value="Tamamlandı">Tamamlandı</SelectItem>
                          <SelectItem value="İptal Edildi">İptal Edildi</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Satın Alma Kalemleri */}
                <div>
                  <Label>Sipariş Kalemleri</Label>
                  {form.watch('items').map((item, index) => (
                    <div key={index} className="flex space-x-2 mt-2 items-end">
                      <FormField
                        control={form.control}
                        name={`items.${index}.productName`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className={index === 0 ? "block" : "sr-only"}>Ürün Adı</FormLabel>
                            <FormControl>
                              <Input placeholder="Ürün adı" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="w-24">
                            <FormLabel className={index === 0 ? "block" : "sr-only"}>Miktar</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Miktar" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem className="w-28">
                            <FormLabel className={index === 0 ? "block" : "sr-only"}>Birim Fiyat</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="Fiyat" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        onClick={() => {
                          const currentItems = form.getValues('items');
                          form.setValue('items', currentItems.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      form.setValue('items', [...form.getValues('items'), { id: Math.random().toString(36).substr(2, 9), productName: '', quantity: 1, unitPrice: 0, total: 0 }]);
                    }}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Kalem Ekle
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notlar</FormLabel>
                      <FormControl>
                        <Input placeholder="Siparişle ilgili notlar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">{editingOrder ? 'Kaydet' : 'Ekle'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Satın Alma Siparişleri Listesi</CardTitle>
          <CardDescription>Tüm satın alma siparişlerinizi buradan yönetin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Label htmlFor="search" className="sr-only">Ara</Label>
            <Input
              id="search"
              type="text"
              placeholder="Sipariş numarası veya tedarikçi ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline"><Search className="h-4 w-4" /></Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sipariş No</TableHead>
                <TableHead>Tedarikçi</TableHead>
                <TableHead>Sipariş Tarihi</TableHead>
                <TableHead>Tahmini Teslim</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Toplam Tutar</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.supplierName}</TableCell>
                  <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                  <TableCell>{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{order.status}</TableCell>
                  <TableCell>{order.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openEditModal(order)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="sm" className="ml-2" onClick={() => handleDeletePurchaseOrder(order.id)}><Trash className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredOrders.length === 0 && (
            <p className="text-center text-muted-foreground mt-4">Hiç satın alma siparişi bulunamadı.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 