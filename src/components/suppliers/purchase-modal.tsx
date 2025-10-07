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
import { CalendarIcon, Check, ChevronsUpDown, ShoppingCart, FileText } from "lucide-react";
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
  // STOCK = faturalı akışta stok seçimi zorunlu değil; kalem editörü kullanılıyor
  if (data.purchaseType === PurchaseType.STOCK) {
    return true;
  }
  // MANUAL akışta ürün adı gerekli
  return !!data.manualProductName;
}, {
  message: 'Ürün bilgisi zorunludur',
  path: ['manualProductName'],
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
  type InvoiceItem = { id: string; productName: string; quantity?: number; unit?: string; unitPrice?: number; taxRate?: number };
  const [items, setItems] = React.useState<InvoiceItem[]>(invoiceMode ? [] : []);
  // Modal içinde yeni eklenen stok kalemlerini anında önerilerde göstermek için tut
  const [localAddedStockItems, setLocalAddedStockItems] = React.useState<StockItem[]>([]);
  const [showTypeSelection, setShowTypeSelection] = React.useState<boolean>(!initialData);
  // initialData ile form.reset tamamlanana kadar formu göstermemek için koruma
  const [prefillReady, setPrefillReady] = React.useState<boolean>(!initialData);
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
  // Kalem ekleme/silme
  const addItem = React.useCallback(() => {
    setItems(prev => ([
      ...(prev ?? []),
      { id: String(Date.now()), productName: '', quantity: undefined, unit: 'kg', unitPrice: undefined, taxRate: 10 }
    ]));
  }, []);
  const removeItem = React.useCallback((id: string) => {
    setItems(prev => (prev ?? []).filter(it => it.id !== id));
  }, []);
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
      date: new Date(),
      dateInput: format(new Date(), 'dd.MM.yyyy'),
      quantityPurchased: '',
      unitPrice: '',
      amount: '',
      currency: 'TRY' as Currency,
      description: '',
    },
  });

  // Modal açıldığında: düzenleme ise tür seçimini gösterme
  React.useEffect(() => {
    if (isOpen) setShowTypeSelection(!initialData);
    if (!isOpen) setPrefillReady(!initialData);
  }, [isOpen, initialData]);

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
      // dateInput'i türet
      const d = initialData.date instanceof Date ? initialData.date : (initialData.date ? new Date(initialData.date as any) : new Date());
      const nextDefaults: any = { ...initialData };
      nextDefaults.date = d;
      nextDefaults.dateInput = format(d, 'dd.MM.yyyy');
      form.reset(nextDefaults);
      setPrefillReady(true);

      // Düzenlemede tür seçimi kapalı
      setShowTypeSelection(false);

      // Düzenlemede faturalı görünüm isteniyor ise kalemleri yükle
      const useInv = !!(invoiceMode);
      setUseInvoiceItems(useInv);
      if (useInv) {
        const incomingItems = (initialData as any)?.invoiceItems as InvoiceItem[] | undefined;
        if (Array.isArray(incomingItems) && incomingItems.length > 0) {
          // Mevcut kayıttan tüm kalemleri getir
          setItems(incomingItems.map((it, idx) => ({
            id: String(Date.now()) + '_' + idx,
            productName: it.productName,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitPrice,
            taxRate: it.taxRate,
          })));
        } else {
          const qRaw = typeof initialData.quantityPurchased === 'string'
            ? parseFloat(initialData.quantityPurchased as string)
            : (initialData.quantityPurchased as any as number);
          const uRaw = typeof initialData.unitPrice === 'string'
            ? parseFloat(initialData.unitPrice as string)
            : (initialData.unitPrice as any as number);
          const q = Number.isFinite(qRaw) ? (qRaw as number) : undefined;
          const u = Number.isFinite(uRaw) ? (uRaw as number) : undefined;

          let productName = '';
          if (initialData.purchaseType === PurchaseType.MANUAL) {
            productName = (initialData.manualProductName as any) || '';
          } else {
            // STOCK: önce manualProductName (serbest isim) varsa onu kullan, yoksa stok adı
            const manualName = (initialData.manualProductName as any) || '';
            const named = availableStockItems.find(s => s.id === (initialData.stockItemId as any))?.name;
            productName = manualName || named || '';
          }
          if (!productName && (initialData as any)?.description) {
            productName = String((initialData as any).description);
          }

          const defaultUnit = initialData.purchaseType === PurchaseType.MANUAL ? 'adet' : 'kg';
          const defaultTax = initialData.purchaseType === PurchaseType.MANUAL ? undefined : 10;
          setItems([{ id: String(Date.now()), productName, quantity: q, unit: defaultUnit, unitPrice: u, taxRate: defaultTax as any }]);
        }
      } else {
        setItems([]);
      }

      setCreatedNames([]);
    }
  }, [initialData, invoiceMode, availableStockItems]);

  // Faturalı mod aktifken ve kalem listesi boşken otomatik bir boş kalem ekle
  React.useEffect(() => {
    if (isOpen && useInvoiceItems && (!items || items.length === 0)) {
      setItems([{ id: String(Date.now()), productName: '', quantity: undefined, unit: 'kg', unitPrice: undefined, taxRate: 10 }]);
    }
  }, [isOpen, useInvoiceItems, items?.length]);

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
    const tax = purchaseType === PurchaseType.MANUAL
      ? 0
      : items.reduce((acc: number, it: InvoiceItem) => acc + ((Number(it.quantity || 0) * Number(it.unitPrice || 0)) * (Number(it.taxRate || 0) / 100)), 0);
    const grand = sub + tax;
    return { subTotal: sub, taxAmount: tax, grandTotal: grand };
  }, [useInvoiceItems, items, purchaseType]);

  React.useEffect(() => {
    if (useInvoiceItems) {
      // amount alanını grand total > 0 ise senkronize et
      const grand = Number(computedTotals.grandTotal || 0);
      if (grand > 0) {
        const val = grand.toFixed(2);
        if (form.getValues('amount') !== val) {
          form.setValue('amount', val);
        }
      }
    }
  }, [computedTotals, useInvoiceItems]);

  // Manuel modda kalem editörü kullanırken, şema doğrulaması için ilk kalem adını manualProductName'e yansıt
  React.useEffect(() => {
    if (useInvoiceItems && purchaseType === PurchaseType.MANUAL) {
      const firstName = items?.[0]?.productName || '';
      if ((form.getValues('manualProductName') || '') !== firstName) {
        form.setValue('manualProductName', firstName);
      }
    }
  }, [items, useInvoiceItems, purchaseType]);

  const handleSubmit = async (data: PurchaseFormValues) => {
    try {
      if (useInvoiceItems) {
        const desc = Array.isArray(items) && items.length > 0
          ? `${items[0].productName || 'Ürün'}${items.length > 1 ? ` +${items.length - 1} kalem` : ''}`
          : (data.description || 'Faturalı Satış');
        const grand = Number((computedTotals?.grandTotal ?? 0).toFixed(2));
        // Persist first line's quantity and unit price for edit prefill
        const first = items?.[0];
        const q = (first?.quantity !== undefined && first?.quantity !== null) ? String(first?.quantity) : (data.quantityPurchased || '');
        const u = (first?.unitPrice !== undefined && first?.unitPrice !== null) ? String(first?.unitPrice) : (data.unitPrice || '');

        // Normalize stock vs manual by matching first item's name to stock list
        let normalizedStockItemId: string | undefined = undefined;
        let normalizedManualName: string | undefined = undefined;
        const firstName = (first?.productName || '').trim();
        if (firstName) {
          const match = availableStockItems.find(s => s.name.trim().toLowerCase() === firstName.toLowerCase());
          if (match) {
            normalizedStockItemId = match.id;
            normalizedManualName = undefined;
          } else {
            normalizedStockItemId = undefined;
            normalizedManualName = firstName;
          }
        } else {
          // fall back to existing values
          normalizedStockItemId = (data as any).stockItemId as any;
          normalizedManualName = data.manualProductName || undefined;
        }

        const submitValues: any = {
          amount: grand > 0 ? String(grand) : (data.amount || ''),
          description: data.description && data.description.trim() !== '' ? data.description : desc,
          quantityPurchased: q,
          unitPrice: u,
          // Send normalized identifiers so parent persists correctly
          stockItemId: normalizedStockItemId,
          manualProductName: normalizedManualName || '',
          purchaseType: normalizedStockItemId ? PurchaseType.STOCK : PurchaseType.MANUAL,
          // Persist full items snapshot so future edits restore all lines
          invoiceItems: (items || []).map(it => ({
            productName: it.productName,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitPrice,
            taxRate: it.taxRate,
          })),
        };
        await onSubmit({ ...data, ...submitValues });
      } else {
        await onSubmit(data);
      }
      onClose();
      form.reset();
    } catch (e) {
      console.error('Purchase form submit error:', e);
    }
  };

  // Basit öneri filtresi
  const getSuggestions = React.useCallback(
    (q: string) => {
      const query = (q || '').toLowerCase().trim();
      if (!query) return [] as StockItem[];
      // Prop ile gelen + bu modal içinde eklenen stokları birleştir
      const merged = [...availableStockItems, ...localAddedStockItems];
      return merged
        .filter((s) => s.name.toLowerCase().includes(query))
        .slice(0, 8);
    },
    [availableStockItems, localAddedStockItems]
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {'Satın Alım Ekle'}
          </DialogTitle>
          <DialogDescription>
            {'Yeni bir satın alım işlemi ekleyin veya mevcut bir satın alımı düzenleyin.'}
          </DialogDescription>
        </DialogHeader>
        {/* Tür Seçimi Ekranı */}
        {/* Edit modunda prefill henüz hazır değilse basit bir yükleniyor alanı göster */}
        {(initialData && !prefillReady) ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Yükleniyor...</div>
        ) : showTypeSelection ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-xl font-semibold">Satış Türü Seçin</div>
              <div className="text-sm text-muted-foreground">Hangi tür satış yapmak istiyorsunuz?</div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Button
                type="button"
                className="w-full rounded-xl bg-sky-500 hover:bg-sky-600 text-white h-auto py-5 px-5 justify-start shadow-sm"
                variant="default"
                onClick={() => {
                  form.setValue('purchaseType', PurchaseType.MANUAL);
                  setUseInvoiceItems(true);
                  if (items.length === 0) setItems([{ id: String(Date.now()), productName: '', quantity: undefined, unit: 'kg', unitPrice: undefined, taxRate: 10 }]);
                  setShowTypeSelection(false);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col -space-y-0.5 text-left">
                    <span className="font-semibold text-base">Manuel Satış</span>
                    <span className="text-xs opacity-90">Stok/manuel alanlı basit satış</span>
                  </div>
                </div>
              </Button>
              <Button
                type="button"
                className="w-full rounded-xl bg-sky-500 hover:bg-sky-600 text-white h-auto py-5 px-5 justify-start shadow-sm"
                variant="default"
                onClick={() => {
                  form.setValue('purchaseType', PurchaseType.STOCK);
                  setUseInvoiceItems(true);
                  if (items.length === 0) setItems([{ id: String(Date.now()), productName: '', quantity: undefined, unit: 'kg', unitPrice: undefined, taxRate: 10 }]);
                  setShowTypeSelection(false);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col -space-y-0.5 text-left">
                    <span className="font-semibold text-base">Faturalı Satış</span>
                    <span className="text-xs opacity-90">Teklif formu ile detaylı satış</span>
                  </div>
                </div>
              </Button>
            </div>
            <div className="flex justify-end pt-1">
              <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            </div>
          </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2">
            {/* Üst bilgi */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="purchaseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satış Tipi</FormLabel>
                    <FormControl>
                      {purchaseType === PurchaseType.MANUAL ? (
                        <Select value={PurchaseType.MANUAL}>
                          <SelectTrigger className="h-9 pointer-events-none cursor-not-allowed">
                            <SelectValue placeholder="Satış tipi" defaultValue={PurchaseType.MANUAL}>
                              Manuel Satış
                            </SelectValue>
                          </SelectTrigger>
                        </Select>
                      ) : (
                        <Select value={field.value} onValueChange={(val) => {
                          field.onChange(val as PurchaseType);
                          if (val === PurchaseType.STOCK && invoiceMode) {
                            setUseInvoiceItems(true);
                            if (!items || items.length === 0) setItems([{ id: String(Date.now()), productName: '', quantity: undefined, unit: 'kg', unitPrice: undefined, taxRate: 10 }]);
                          } else if (val === PurchaseType.MANUAL) {
                            // Manuel alışta da kalem editörü açılsın
                            setUseInvoiceItems(true);
                            if (!items || items.length === 0) setItems([{ id: String(Date.now()), productName: '', quantity: undefined, unit: 'kg', unitPrice: undefined, taxRate: 10 }]);
                          } else {
                            setUseInvoiceItems(false);
                          }
                        }}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Satış tipi seçin..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={PurchaseType.STOCK}>Faturalı Satış</SelectItem>
                            <SelectItem value={PurchaseType.MANUAL}>Manuel Satış</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {supplierName && (
                <div>
                  <Label className="text-sm text-muted-foreground">Müşteri</Label>
                  <Input value={supplierName} readOnly className="opacity-80 h-9" />
                </div>
              )}

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tarih</FormLabel>
                    <FormControl>
                      <div className="relative">
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
                          className="w-full pr-9 h-9"
                          maxLength={10}
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" />
                      </div>
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
                        <SelectTrigger className="h-9">
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
            </div>

            {/* Kalem Editörü (Faturalı veya Manuel) */}
            {useInvoiceItems && (purchaseType === PurchaseType.STOCK || purchaseType === PurchaseType.MANUAL) ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pt-1">
                  <Label className="text-base font-medium">Kalemler</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-md px-4 shadow-sm"
                    onClick={addItem}
                  >
                    Kalem Ekle
                  </Button>
                </div>
                {/* Sütun Başlıkları */}
                {purchaseType === PurchaseType.MANUAL ? (
                  // Manuel: Ürün/Hizmet | Miktar | Birim Fiyatı | Toplam | Sil
                  <div className="grid grid-cols-12 gap-2 text-xs text-foreground font-medium">
                    <div className="col-span-6">Ürün/Hizmet</div>
                    <div className="col-span-2">Miktar</div>
                    <div className="col-span-2">Birim Fiyatı</div>
                    <div className="col-span-1 text-right">Toplam</div>
                    <div className="col-span-1 text-right">Sil</div>
                  </div>
                ) : (
                  // Faturalı: Ürün/Hizmet | Miktar | Birim | Birim Fiyatı | KDV | Toplam | Sil
                  <div className="grid grid-cols-12 gap-2 text-xs text-foreground font-medium">
                    <div className="col-span-4">Ürün/Hizmet</div>
                    <div className="col-span-2">Miktar</div>
                    <div className="col-span-1">Birim</div>
                    <div className="col-span-2">Birim Fiyatı</div>
                    <div className="col-span-1">KDV</div>
                    <div className="col-span-1 text-right">Toplam</div>
                    <div className="col-span-1 text-right">Sil</div>
                  </div>
                )}
                {items.length === 0 && (
                  <div className="text-sm text-muted-foreground">Henüz kalem eklenmedi.</div>
                )}
                {(items ?? []).map((it: InvoiceItem, idx: number) => {
                  const q = Number(it.quantity || 0);
                  const p = Number(it.unitPrice || 0);
                  const tr = purchaseType === PurchaseType.MANUAL ? 0 : Number(it.taxRate || 0);
                  const lineTotal = purchaseType === PurchaseType.MANUAL ? (q * p) : (q * p * (1 + tr / 100));
                  return (
                  <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className={purchaseType === PurchaseType.MANUAL ? 'col-span-6' : 'col-span-4'}>
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
                          className="h-9"
                        />
                        {(() => {
                          const list = getSuggestions(it.productName);
                          const hide = !!list.find((s) => s.name === it.productName) || createdNames.includes(it.productName);
                          return (
                            <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-auto rounded border border-border bg-popover text-popover-foreground shadow z-50">
                              {list.length > 0 && !hide && list.map((s, sIdx) => {
                                const active = (activeIdxByItem[it.id] ?? 0) === sIdx;
                                return (
                                  <button
                                    type="button"
                                    key={`suggestion-${it.id}-${sIdx}`}
                                    id={`suggestion-${it.id}-${sIdx}`}
                                    className={cn("w-full text-left px-3 py-2 transition-colors", active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground")}
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
                                            setLocalAddedStockItems((prev) => prev.find(x => x.id === created.id) ? prev : [...prev, created]);
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
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="any"
                        placeholder="Miktar"
                        value={it.quantity === undefined ? '' : String(it.quantity)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const next = [...(items ?? [])];
                          next[idx] = { ...next[idx], quantity: val === '' ? undefined : Number(val) } as any;
                          setItems(next);
                        }}
                        className="h-9"
                      />
                    </div>
                    {purchaseType === PurchaseType.MANUAL ? null : (
                      <div className="col-span-1">
                        <Select value={String(it.unit || 'kg')} onValueChange={(v) => {
                          const next = [...(items ?? [])];
                          next[idx] = { ...next[idx], unit: v } as any;
                          setItems(next);
                        }}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Birim" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="mt">mt</SelectItem>
                            <SelectItem value="adet">ad</SelectItem>
                            <SelectItem value="top">top</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className={purchaseType === PurchaseType.MANUAL ? 'col-span-2' : 'col-span-2'}>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Birim Fiyatı"
                        value={it.unitPrice === undefined ? '' : String(it.unitPrice)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const next = [...(items ?? [])];
                          next[idx] = { ...next[idx], unitPrice: val === '' ? undefined : Number(val) } as any;
                          setItems(next);
                        }}
                        className="h-9"
                      />
                    </div>
                    {purchaseType === PurchaseType.MANUAL ? null : (
                      <div className="col-span-1">
                        <Select value={String(it.taxRate ?? 10)} onValueChange={(v) => {
                          const next = [...(items ?? [])];
                          next[idx] = { ...next[idx], taxRate: Number(v) } as any;
                          setItems(next);
                        }}>
                          <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">%10</SelectItem>
                            <SelectItem value="20">%20</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="col-span-1 text-right font-medium pr-1 tabular-nums">{lineTotal.toFixed(2)}</div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" onClick={() => removeItem(it.id)}>Sil</Button>
                    </div>
                  </div>
                  );
                })}
                {/* Totals panel and submit button aligned to the right */}
                <div className="flex justify-end mt-3">
                  <div className="w-full sm:w-auto flex flex-col items-end gap-1">
                    <div className="text-sm text-muted-foreground">
                      Ara Toplam: <span className="tabular-nums">{computedTotals.subTotal.toFixed(2)}</span>
                    </div>
                    {purchaseType !== PurchaseType.MANUAL && (
                      <div className="text-sm text-muted-foreground">
                        KDV: <span className="tabular-nums">{computedTotals.taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="text-lg font-semibold">
                      Genel Toplam: <span className="tabular-nums">{computedTotals.grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="submit"
                        disabled={
                          form.formState.isSubmitting ||
                          (useInvoiceItems && (computedTotals.grandTotal <= 0 || items.length === 0))
                        }
                        title={useInvoiceItems && (computedTotals.grandTotal <= 0 || items.length === 0) ? 'Kalem ekleyin ve tutar > 0 olmalı' : undefined}
                      >
                        {form.formState.isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                      </Button>
                    </div>
                  </div>
                </div>
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
                            <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-auto rounded border border-border bg-popover text-popover-foreground shadow z-50">
                              {list.length > 0 && !hide && list.map((s, sIdx) => {
                                const active = (activeManualIdx < 0 ? 0 : activeManualIdx) === sIdx;
                                return (
                                  <button
                                    type="button"
                                    key={s.id}
                                    id={`suggestion-manual-${sIdx}`}
                                    className={cn("w-full text-left px-3 py-2 transition-colors", active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground")}
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
                    <Input type="number" step="any" {...field} />
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
                    <Input type="number" step="any" {...field} />
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
                    <Input type="number" step="any" {...field} />
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
            {!useInvoiceItems && (
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  İptal
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            )}
          </form>
        </Form>
        )}
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