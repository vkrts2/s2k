import React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { tr } from 'date-fns/locale';
import { Textarea } from '../ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import type { Currency, StockItem } from '@/lib/types';

enum PurchaseType {
  STOCK = 'stock',
  MANUAL = 'manual',
}

const purchaseFormSchema = z.object({
  purchaseType: z.enum([PurchaseType.STOCK, PurchaseType.MANUAL]),
  stockItemId: z.string().optional(),
  manualProductName: z.string().optional(),
  date: z.date({ required_error: 'Tarih zorunludur' }),
  dateInput: z.string().optional(),
  // Basit form alanları (faturalı değilken)
  quantityPurchased: z.string().optional(),
  unitPrice: z.string().optional(),
  amount: z.string().min(1, 'Tutar zorunludur'),
  currency: z.string().min(1, 'Para birimi zorunludur'),
  description: z.string().optional(),
  // Faturalı alış modu
  useInvoiceItems: z.boolean().optional(),
  items: z
    .array(
      z.object({
        id: z.string(),
        productName: z.string().min(1, 'Ürün/Hizmet zorunludur'),
        quantity: z.number().min(0, 'Miktar geçersiz'),
        unit: z.string().optional().default('ad'),
        unitPrice: z.number().min(0, 'Birim fiyat geçersiz'),
        taxRate: z.number().min(0).max(100).default(20),
      })
    )
    .optional(),
}).refine((data) => {
  if (data.purchaseType === PurchaseType.STOCK) {
    // Faturalı moddaysa stok ürünü zorunlu tutma
    if (data.useInvoiceItems) return true;
    return !!data.stockItemId;
  } else {
    return !!data.manualProductName;
  }
}, {
  message: 'Ürün bilgisi zorunludur',
  path: ['stockItemId', 'manualProductName'],
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: PurchaseFormValues) => Promise<void>;
  initialData?: Partial<PurchaseFormValues>;
  availableStockItems: StockItem[];
  supplierName?: string;
  invoiceMode?: boolean;
}

export function PurchaseModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  availableStockItems,
  supplierName,
  invoiceMode,
}: PurchaseModalProps) {
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: initialData || {
      purchaseType: PurchaseType.STOCK,
      stockItemId: undefined,
      manualProductName: '',
      date: undefined,
      dateInput: '',
      quantityPurchased: '',
      unitPrice: '',
      amount: '',
      currency: 'TRY' as Currency,
      description: '',
      useInvoiceItems: invoiceMode ?? false,
      items: invoiceMode ? [] : undefined,
    },
  });

  const purchaseType = useWatch({ control: form.control, name: 'purchaseType' });
  const useInvoiceItems = useWatch({ control: form.control, name: 'useInvoiceItems' });
  const items = useWatch({ control: form.control, name: 'items' });

  // Otomatik tutar hesaplama
  const quantity = useWatch({ control: form.control, name: 'quantityPurchased' });
  const unitPrice = useWatch({ control: form.control, name: 'unitPrice' });
  React.useEffect(() => {
    const q = parseFloat(quantity);
    const u = parseFloat(unitPrice);
    if (!isNaN(q) && !isNaN(u)) {
      const calculated = (q * u).toFixed(2);
      if (form.getValues('amount') !== calculated) {
        form.setValue('amount', calculated);
      }
    }
  }, [quantity, unitPrice]);

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        useInvoiceItems: invoiceMode ?? false,
        items: invoiceMode ? [] : undefined,
        ...initialData,
      });
    }
  }, [initialData]);

  // Stok ürünü seçildiğinde açıklamayı otomatik doldur
  React.useEffect(() => {
    if (purchaseType === PurchaseType.STOCK) {
      const stockItemId = form.getValues('stockItemId');
      const selectedItem = availableStockItems.find(item => item.id === stockItemId);
      if (selectedItem && form.getValues('description') !== selectedItem.name) {
        form.setValue('description', selectedItem.name);
      }
    }
  }, [form.watch('stockItemId'), purchaseType]);

  // Manuel alışta ürün adı girildiğinde açıklamayı otomatik doldur
  React.useEffect(() => {
    if (purchaseType === PurchaseType.MANUAL) {
      const manualProductName = form.getValues('manualProductName');
      if (manualProductName && form.getValues('description') !== manualProductName) {
        form.setValue('description', manualProductName);
      }
    }
  }, [form.watch('manualProductName'), purchaseType]);

  // Faturalı kalemler toplamları
  const computedTotals = React.useMemo(() => {
    if (!useInvoiceItems || !items || items.length === 0) return { subTotal: 0, taxAmount: 0, grandTotal: 0 };
    const sub = items.reduce((acc: number, it: any) => acc + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0);
    const tax = items.reduce((acc: number, it: any) => acc + ((Number(it.quantity || 0) * Number(it.unitPrice || 0)) * (Number(it.taxRate || 0) / 100)), 0);
    const grand = sub + tax;
    return { subTotal: sub, taxAmount: tax, grandTotal: grand };
  }, [useInvoiceItems, items]);

  React.useEffect(() => {
    if (useInvoiceItems) {
      // amount alanını grand total ile senkronize et
      const val = computedTotals.grandTotal.toFixed(2);
      if (form.getValues('amount') !== val) {
        form.setValue('amount', val);
      }
    }
  }, [computedTotals, useInvoiceItems]);

  const handleSubmit = async (data: PurchaseFormValues) => {
    // Faturalı modda açıklamayı otomatik derle
    if (useInvoiceItems && items && items.length > 0) {
      const summary = `${items.length} kalem faturalı alış`;
      if (!data.description) {
        data.description = summary;
      }
    }
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alış Ekle</DialogTitle>
          <DialogDescription>Yeni bir alış işlemi ekleyin veya mevcut bir alışı düzenleyin.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Üst bilgi */}
            {supplierName && (
              <div>
                <Label className="text-sm text-muted-foreground">Tedarikçi</Label>
                <Input value={supplierName} readOnly className="opacity-80" />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tarih</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="gg.aa.yyyy"
                        value={form.watch('dateInput') ?? (field.value ? format(field.value, 'dd.MM.yyyy') : '')}
                        onChange={e => {
                          let val = e.target.value.replace(/[^0-9]/g, '');
                          if (val.length > 8) val = val.slice(0, 8);
                          if (val.length > 4) val = val.slice(0,2) + '.' + val.slice(2,4) + '.' + val.slice(4);
                          else if (val.length > 2) val = val.slice(0,2) + '.' + val.slice(2);
                          form.setValue('dateInput', val);
                          if (val.length === 10) {
                            const parsed = parse(val, 'dd.MM.yyyy', new Date());
                            if (isValid(parsed)) {
                              field.onChange(parsed);
                            }
                          } else {
                            field.onChange(undefined);
                          }
                        }}
                        className="w-full"
                        maxLength={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Para Birimi</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Para birimi seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRY">TRY</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchaseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alış Tipi</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={(val) => {
                        field.onChange(val);
                        if (val === PurchaseType.STOCK && invoiceMode) {
                          form.setValue('useInvoiceItems', true);
                          if (!form.getValues('items')) form.setValue('items', []);
                        } else {
                          form.setValue('useInvoiceItems', false);
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Alış tipi seçin..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PurchaseType.STOCK}>Faturalı Alış</SelectItem>
                          <SelectItem value={PurchaseType.MANUAL}>Manuel Alış</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Faturalı Alış Modu */}
            {purchaseType === PurchaseType.STOCK && useInvoiceItems ? (
              <div className="space-y-3">
                <Label>Kalemler</Label>
                {(items ?? []).map((it: any, idx: number) => (
                  <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <Input
                        placeholder="Ürün/Hizmet"
                        value={it.productName}
                        onChange={(e) => {
                          const next = [...(items ?? [])];
                          next[idx] = { ...next[idx], productName: e.target.value };
                          form.setValue('items', next);
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        placeholder="Miktar"
                        type="number"
                        value={it.quantity}
                        onChange={(e) => {
                          const next = [...(items ?? [])];
                          next[idx] = { ...next[idx], quantity: Number(e.target.value) };
                          form.setValue('items', next);
                        }}
                      />
                    </div>
                    <div className="col-span-1">
                      <Select value={it.unit ?? 'ad'} onValueChange={(v) => {
                        const next = [...(items ?? [])];
                        next[idx] = { ...next[idx], unit: v };
                        form.setValue('items', next);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Birim" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ad">ad</SelectItem>
                          <SelectItem value="mt">mt</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="top">top</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input
                        placeholder="Birim Fiyat"
                        type="number"
                        value={it.unitPrice}
                        onChange={(e) => {
                          const next = [...(items ?? [])];
                          next[idx] = { ...next[idx], unitPrice: Number(e.target.value) };
                          form.setValue('items', next);
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Select value={String(it.taxRate ?? 20)} onValueChange={(v) => {
                        const next = [...(items ?? [])];
                        next[idx] = { ...next[idx], taxRate: Number(v) };
                        form.setValue('items', next);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="KDV" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">%0</SelectItem>
                          <SelectItem value="10">%10</SelectItem>
                          <SelectItem value="20">%20</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 text-right text-sm">
                      {((Number(it.quantity || 0) * Number(it.unitPrice || 0)) * (1 + Number(it.taxRate || 0) / 100)).toFixed(2)}
                    </div>
                    <div className="col-span-1 text-right">
                      <Button type="button" variant="ghost" onClick={() => {
                        const next = [...(items ?? [])];
                        next.splice(idx, 1);
                        form.setValue('items', next);
                      }}>Sil</Button>
                    </div>
                  </div>
                ))}
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const next = [...(items ?? [])];
                      next.push({ id: crypto.randomUUID(), productName: '', quantity: 0, unit: 'ad', unitPrice: 0, taxRate: 20 });
                      form.setValue('items', next);
                    }}
                  >
                    Kalem Ekle
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-end gap-2 text-sm">
                  <div className="sm:w-72 space-y-1">
                    <div className="flex justify-between"><span>Ara Toplam:</span><span>{computedTotals.subTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>KDV Tutar:</span><span>{computedTotals.taxAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between font-semibold"><span>Genel Toplam:</span><span>{computedTotals.grandTotal.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Basit stok/manüel form (faturalı değilken) */}
            {purchaseType === PurchaseType.STOCK && !useInvoiceItems ? (
              <FormField
                control={form.control}
                name="stockItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stok Ürünü</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Stok ürünü seçin..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStockItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : !useInvoiceItems ? (
              <FormField
                control={form.control}
                name="manualProductName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ürün Adı</FormLabel>
                    <FormControl>
                      <Input placeholder="Ürün adını girin..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            {!useInvoiceItems && (
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tarih</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="gg.aa.yyyy"
                      value={form.watch('dateInput') ?? (field.value ? format(field.value, 'dd.MM.yyyy') : '')}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length > 8) val = val.slice(0, 8);
                        if (val.length > 4) val = val.slice(0,2) + '.' + val.slice(2,4) + '.' + val.slice(4);
                        else if (val.length > 2) val = val.slice(0,2) + '.' + val.slice(2);
                        form.setValue('dateInput', val);
                        if (val.length === 10) {
                          const parsed = parse(val, 'dd.MM.yyyy', new Date());
                          if (isValid(parsed)) {
                            field.onChange(parsed);
                          }
                        } else {
                          field.onChange(undefined);
                        }
                      }}
                      className="w-32"
                      maxLength={10}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />)}
            {!useInvoiceItems && (
            <FormField
              control={form.control}
              name="quantityPurchased"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Miktar</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />)}
            {!useInvoiceItems && (
            <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Birim Fiyat</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />)}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tutar</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 