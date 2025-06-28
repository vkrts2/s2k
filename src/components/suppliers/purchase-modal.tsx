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
  quantityPurchased: z.string().min(1, 'Miktar zorunludur'),
  unitPrice: z.string().min(1, 'Birim fiyat zorunludur'),
  amount: z.string().min(1, 'Tutar zorunludur'),
  currency: z.string().min(1, 'Para birimi zorunludur'),
  description: z.string().optional(),
}).refine((data) => {
  if (data.purchaseType === PurchaseType.STOCK) {
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
}

export function PurchaseModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  availableStockItems,
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
    },
  });

  const purchaseType = useWatch({ control: form.control, name: 'purchaseType' });

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
      form.reset(initialData);
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

  const handleSubmit = async (data: PurchaseFormValues) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alış Ekle</DialogTitle>
          <DialogDescription>Yeni bir alış işlemi ekleyin veya mevcut bir alışı düzenleyin.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="purchaseType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alış Tipi</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Alış tipi seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PurchaseType.STOCK}>Stoktan Alış</SelectItem>
                        <SelectItem value={PurchaseType.MANUAL}>Manuel Alış</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {purchaseType === PurchaseType.STOCK ? (
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
            ) : (
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
            )}
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
            />
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
            />
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
            />
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