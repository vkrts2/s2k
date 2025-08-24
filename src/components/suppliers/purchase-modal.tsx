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
import type { Currency, StockItem, PurchaseFormValues } from '@/lib/types';
import { PurchaseType } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { addStockItem } from '@/lib/storage';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

const purchaseFormSchema = z.object({
  purchaseType: z.nativeEnum(PurchaseType),
  stockItemId: z.string().nullable().optional(),
  manualProductName: z.string().optional(),
  date: z.date().optional(),
  dateInput: z.string().optional(),
  quantityPurchased: z.string().optional(),
  unitPrice: z.string().optional(),
  amount: z.string().min(1, 'Tutar zorunludur'),
  currency: z.enum(['TRY','USD','EUR']),
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
  const { user } = useAuth();
  // Faturalı alış modu ve kalemler artık form dışında, yerel state olarak tutuluyor
  const [useInvoiceItems, setUseInvoiceItems] = React.useState<boolean>(invoiceMode ?? false);
  type InvoiceItem = { id: string; productName: string; quantity: number; unit?: string; unitPrice: number; taxRate: number };
  const [items, setItems] = React.useState<InvoiceItem[]>(invoiceMode ? [] : []);
  const [pendingAdd, setPendingAdd] = React.useState<{
    open: boolean;
    name: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  // Modal içinde yeni oluşturulan stok adlarını izleyerek öneri kutusunu gizlemek için kullanılır
  const [createdNames, setCreatedNames] = React.useState<string[]>([]);
  // Klavye navigasyonu için aktif indeksler
  const [activeIdxByItem, setActiveIdxByItem] = React.useState<Record<string, number>>({});
  const [activeManualIdx, setActiveManualIdx] = React.useState<number>(-1);
  // Aktif öneriyi görünür alana kaydır
  const scrollActiveIntoView = React.useCallback((groupId: string, idx: number) => {
    const el = document.getElementById(`suggestion-${groupId}-${idx}`);
    if (el) {
      try { el.scrollIntoView({ block: 'nearest' }); } catch {}
    }
  }, []);
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
    const q = parseFloat(quantity ?? '');
    const u = parseFloat(unitPrice ?? '');
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
        ...initialData,
      });
      setUseInvoiceItems(invoiceMode ?? false);
      setItems(invoiceMode ? [] : []);
      setCreatedNames([]);
    }
  }, [initialData]);

  // Stok ürünü seçildiğinde açıklamayı otomatik doldurma (faturalı modda kapalı)
  React.useEffect(() => {
    if (!useInvoiceItems && purchaseType === PurchaseType.STOCK) {
      const stockItemId = form.getValues('stockItemId');
      const selectedItem = availableStockItems.find(item => item.id === stockItemId);
      if (selectedItem && form.getValues('description') !== selectedItem.name) {
        form.setValue('description', selectedItem.name);
      }
    }
  }, [form.watch('stockItemId'), purchaseType, useInvoiceItems]);

  // Manuel alışta açıklamayı otomatik doldurma (faturalı modda kapalı)
  React.useEffect(() => {
    if (!useInvoiceItems && purchaseType === PurchaseType.MANUAL) {
      const manualProductName = form.getValues('manualProductName');
      if (manualProductName && form.getValues('description') !== manualProductName) {
        form.setValue('description', manualProductName);
      }
    }
  }, [form.watch('manualProductName'), purchaseType, useInvoiceItems]);

  // Faturalı kalemler toplamları
  const computedTotals = React.useMemo(() => {
    if (!useInvoiceItems || !items || items.length === 0) return { subTotal: 0, taxAmount: 0, grandTotal: 0 };
    const sub = items.reduce((acc: number, it: InvoiceItem) => acc + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0);
    const tax = items.reduce((acc: number, it: InvoiceItem) => acc + ((Number(it.quantity || 0) * Number(it.unitPrice || 0)) * (Number(it.taxRate || 0) / 100)), 0);
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
    // Faturalı modda açıklamayı otomatik doldurma: kullanıcıya bırak
    await onSubmit(data);
    form.reset();
  };

  // Basit öneri filtresi
  const getSuggestions = React.useCallback(
    (q: string) => {
      const query = (q || '').toLowerCase().trim();
      if (!query) return [] as StockItem[];
      return availableStockItems
        .filter((s) => s.name.toLowerCase().includes(query))
        .slice(0, 8);
    },
    [availableStockItems]
  );

  const addCurrentAsStock = async (name: string) => {
    try {
      if (!user?.uid) return;
      const created = await addStockItem(user.uid, { name, currentStock: 0, unit: 'ad' });
      return created;
    } catch (e) {
      console.error('Stok kalemine eklenemedi:', e);
      return null;
    }
  };

  return (
    <>
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
                        field.onChange(val as PurchaseType);
                        if (val === PurchaseType.STOCK && invoiceMode) {
                          setUseInvoiceItems(true);
                          if (!items || items.length === 0) setItems([]);
                        } else {
                          setUseInvoiceItems(false);
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
                {(items ?? []).map((it: InvoiceItem, idx: number) => (
                  <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <div className="relative">
                        <Input
                          placeholder="Ürün/Hizmet"
                          value={it.productName}
                          onChange={(e) => {
                            const next = [...(items ?? [])];
                            next[idx] = { ...next[idx], productName: e.target.value };
                            setItems(next);
                            setActiveIdxByItem((prev) => ({ ...prev, [it.id]: 0 }));
                          }}
                          onKeyDown={(e) => {
                            const list = getSuggestions(it.productName);
                            const hide = !!list.find((s) => s.name === it.productName) || createdNames.includes(it.productName);
                            if (hide || list.length === 0) return;
                            const current = activeIdxByItem[it.id] ?? 0;
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              const nextIdx = (current + 1) % list.length;
                              setActiveIdxByItem((prev) => ({ ...prev, [it.id]: nextIdx }));
                              setTimeout(() => scrollActiveIntoView(it.id, nextIdx), 0);
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              const nextIdx = (current - 1 + list.length) % list.length;
                              setActiveIdxByItem((prev) => ({ ...prev, [it.id]: nextIdx }));
                              setTimeout(() => scrollActiveIntoView(it.id, nextIdx), 0);
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              const chosen = list[current];
                              if (chosen) {
                                const next = [...(items ?? [])];
                                next[idx] = { ...next[idx], productName: chosen.name };
                                setItems(next);
                              }
                            }
                          }}
                        />
                        {(() => {
                          const list = getSuggestions(it.productName);
                          const hide = !!list.find((s) => s.name === it.productName) || createdNames.includes(it.productName);
                          return (
                            <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-auto rounded border border-neutral/30 bg-white text-foreground shadow z-50">
                              {list.length > 0 && !hide && list.map((s, sIdx) => {
                                const active = (activeIdxByItem[it.id] ?? 0) === sIdx;
                                return (
                                  <button
                                    type="button"
                                    key={`suggestion-${it.id}-${sIdx}`}
                                    id={`suggestion-${it.id}-${sIdx}`}
                                    className={cn("w-full text-left px-3 py-2 transition-colors", active ? "bg-primary text-white" : "hover:bg-muted text-foreground")}
                                    onClick={() => {
                                      const next = [...(items ?? [])];
                                      next[idx] = { ...next[idx], productName: s.name };
                                      setItems(next);
                                    }}
                                    role="option"
                                    aria-selected={active}
                                  >
                                    {s.name}
                                  </button>
                                );
                              })}
                              {list.length === 0 && (it.productName || '').trim().length > 0 && !createdNames.includes(it.productName) && (
                                <div className="px-3 py-2 flex items-center justify-between gap-2">
                                  <span className="text-sm opacity-90">“{it.productName}” bulunamadı</span>
                                  <button
                                    type="button"
                                    className="px-2 py-1 text-xs border rounded hover:bg-muted"
                                    onClick={async () => {
                                      setPendingAdd({
                                        open: true,
                                        name: it.productName,
                                        onConfirm: async () => {
                                          const created = await addCurrentAsStock(it.productName);
                                          if (created) {
                                            const next = [...(items ?? [])];
                                            next[idx] = { ...next[idx], productName: created.name };
                                            setItems(next);
                                            setCreatedNames((prev) => prev.includes(created.name) ? prev : [...prev, created.name]);
                                          }
                                        }
                                      });
                                    }}
                                  >
                                    Stok kalemlerine ekle
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !useInvoiceItems ? (
              <FormField
                control={form.control}
                name="manualProductName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ürün Adı</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Ürün adını girin..."
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setActiveManualIdx(0);
                          }}
                          onKeyDown={(e) => {
                            const list = getSuggestions(field.value ?? '');
                            const nameVal = field.value ?? '';
                            const hide = !!list.find((s) => s.name === nameVal) || (nameVal && createdNames.includes(nameVal));
                            if (hide || list.length === 0) return;
                            const current = activeManualIdx < 0 ? 0 : activeManualIdx;
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              const nextIdx = (current + 1) % list.length;
                              setActiveManualIdx(nextIdx);
                              setTimeout(() => scrollActiveIntoView('manual', nextIdx), 0);
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              const nextIdx = (current - 1 + list.length) % list.length;
                              setActiveManualIdx(nextIdx);
                              setTimeout(() => scrollActiveIntoView('manual', nextIdx), 0);
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              const chosen = list[current];
                              if (chosen) field.onChange(chosen.name);
                            }
                          }}
                        />
                        {(() => {
                          const list = getSuggestions(field.value ?? '');
                          const nameVal = field.value ?? '';
                          const hide = !!list.find((s) => s.name === nameVal) || (nameVal && createdNames.includes(nameVal));
                          return (
                            <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-auto rounded border border-neutral/30 bg-white text-foreground shadow z-50">
                              {list.length > 0 && !hide && list.map((s, sIdx) => {
                                const active = (activeManualIdx < 0 ? 0 : activeManualIdx) === sIdx;
                                return (
                                  <button
                                    type="button"
                                    key={s.id}
                                    id={`suggestion-manual-${sIdx}`}
                                    className={cn("w-full text-left px-3 py-2 transition-colors", active ? "bg-primary text-white" : "hover:bg-muted")}
                                    onClick={() => field.onChange(s.name)}
                                    role="option"
                                    aria-selected={active}
                                  >
                                    {s.name}
                                  </button>
                                );
                              })}
                              {list.length === 0 && (field.value ?? '').trim().length > 0 && !(field.value && createdNames.includes(field.value)) && (
                                <div className="px-3 py-2 flex items-center justify-between gap-2">
                                  <span className="text-sm opacity-90">“{field.value}” bulunamadı</span>
                                  <button
                                    type="button"
                                    className="px-2 py-1 text-xs border rounded hover:bg-muted"
                                    onClick={async () => {
                                      const name = field.value || '';
                                      setPendingAdd({
                                        open: true,
                                        name,
                                        onConfirm: async () => {
                                          const created = await addCurrentAsStock(name);
                                          if (created) {
                                            field.onChange(created.name);
                                            setCreatedNames((prev) => prev.includes(created.name) ? prev : [...prev, created.name]);
                                          }
                                        }
                                      });
                                    }}
                                  >
                                    Stok kalemlerine ekle
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
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
    {pendingAdd && (
      <AlertDialog open={pendingAdd?.open ?? false} onOpenChange={(open) => setPendingAdd(prev => prev ? { ...prev, open } : prev)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stok Kalemine Ekle</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingAdd?.name ?? ''}” stok kalemine eklemek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAdd(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await pendingAdd?.onConfirm?.();
                } finally {
                  setPendingAdd(null);
                }
              }}
            >
              Stok Kalemine Ekle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
    </>
  );
}