import dynamic from 'next/dynamic';
// Dinamik import: sadece istemcide yüklensin (SSR kapalı)
const LazyQuotationForm = dynamic(
  () => import("@/components/quotations/quotation-form").then(m => m.QuotationForm),
  { ssr: false, loading: () => <div>Yükleniyor...</div> }
);

// Basit hata yakalayıcı
class Boundary extends React.Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error('Faturalı satış formu yüklenirken hata:', error);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children as any;
  }
}

// Dinamik import başarısız olursa kullanılacak hafif teklif formu
function LightweightInvoiceForm({
  onSubmit,
  customerName,
  initialItems,
  initialDate,
  initialCurrency,
  disableTax,
  availableStockItems = [],
  onRequestAddStock,
}: {
  onSubmit: (data: any) => void;
  customerName: string;
  initialItems?: Array<{ id?: string; productName: string; description?: string; quantity: number; unitPrice: number; taxRate?: number; unit?: string }>;
  initialDate?: Date | string;
  initialCurrency?: 'TRY' | 'USD' | 'EUR';
  disableTax?: boolean;
  availableStockItems?: import("@/lib/types").StockItem[];
  onRequestAddStock?: (name: string, onAdded: (newName: string) => void) => void;
}) {
  const [date, setDate] = React.useState<Date>(new Date());
  const [currency, setCurrency] = React.useState<'TRY' | 'USD' | 'EUR'>('TRY');
  const [items, setItems] = React.useState<Array<{ id: string; productName: string; quantity: string; unitPrice: string; taxRate: string; unit: string }>>([]);
  // Klavye navigasyonu: her kalem için aktif öneri indeksini tut
  const [activeIdxByItem, setActiveIdxByItem] = React.useState<Record<string, number>>({});

  // Aktif öneriyi görünür alana kaydır
  const scrollActiveIntoView = React.useCallback((itemId: string, idx: number) => {
    const el = document.getElementById(`suggestion-${itemId}-${idx}`);
    if (el) {
      try { el.scrollIntoView({ block: 'nearest' }); } catch {}
    }
  }, []);

  React.useEffect(() => {
    if (initialDate) {
      const d = initialDate instanceof Date ? initialDate : new Date(initialDate);
      if (!isNaN(d.getTime())) setDate(d);
    }
    if (initialCurrency) setCurrency(initialCurrency);
    if (initialItems && Array.isArray(initialItems)) {
      setItems(
        initialItems.map((it, idx) => ({
          id: String(it.id || idx + 1),
          productName: it.productName,
          quantity: String(it.quantity ?? ''),
          unitPrice: String(it.unitPrice ?? ''),
          taxRate: String(disableTax ? '0' : (it.taxRate ?? 10)),
          unit: it.unit || 'kg',
        }))
      );
    }
  }, [initialDate, initialCurrency, initialItems, disableTax]);

	const addItem = () => setItems(prev => [...prev, { id: `${Date.now()}`, productName: '', quantity: '', unitPrice: '', taxRate: '10', unit: 'kg' }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, patch: Partial<{ productName: string; quantity: string; unitPrice: string; taxRate: string; unit: string }>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

  const totals = React.useMemo(() => {
    let subTotal = 0;
    let taxAmount = 0;
    for (const it of items) {
      const q = parseFloat(it.quantity || '0') || 0;
      const p = parseFloat(it.unitPrice || '0') || 0;
      const t = disableTax ? 0 : (parseFloat(it.taxRate || '0') || 0);
      const line = q * p;
      subTotal += line;
      taxAmount += line * (t / 100);
    }
    const grandTotal = subTotal + taxAmount;
    return { subTotal, taxAmount, grandTotal };
  }, [items, disableTax]);

  const getSuggestions = React.useCallback((q: string) => {
    const query = (q || '').toLowerCase().trim();
    if (!query) return [] as Array<{ id: string; name: string }>;
    return availableStockItems.filter(s => s.name.toLowerCase().includes(query)).slice(0, 8);
  }, [availableStockItems]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label>Müşteri</Label>
        <Input value={customerName} disabled />
      </div>
      <div className="grid gap-2">
        <Label>Tarih</Label>
        <Input 
          type="date" 
          value={date.toISOString().slice(0,10)} 
          onChange={e => {
            try {
              const newDate = new Date(e.target.value);
              if (!isNaN(newDate.getTime())) {
                setDate(newDate);
              }
            } catch (error) {
              console.error('Invalid date value:', e.target.value);
            }
          }} 
          className="w-48" 
        />
      </div>
      <div className="grid gap-2">
        <Label>Para Birimi</Label>
        <Select value={currency} onValueChange={(v) => setCurrency(v as any)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TRY">TRY</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Kalemler</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>Kalem Ekle</Button>
        </div>
        {/* Sütun Başlıkları */}
        {disableTax ? (
          // Manuel: Ürün/Hizmet | Miktar | Birim Fiyatı | Toplam | Sil
          <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground">
            <div className="col-span-6">Ürün/Hizmet</div>
            <div className="col-span-2">Miktar</div>
            <div className="col-span-2">Birim Fiyatı</div>
            <div className="col-span-1 text-right">Toplam</div>
            <div className="col-span-1 text-right">Sil</div>
          </div>
        ) : (
          // Faturalı: Ürün/Hizmet | Miktar | Birim | Birim Fiyat | KDV | Toplam | Sil
          <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground">
            <div className="col-span-4">Ürün/Hizmet</div>
            <div className="col-span-2">Miktar</div>
            <div className="col-span-1">Birim</div>
            <div className="col-span-2">Birim Fiyat</div>
            <div className="col-span-1">KDV</div>
            <div className="col-span-1 text-right">Toplam</div>
            <div className="col-span-1 text-right">Sil</div>
          </div>
        )}
        {items.length === 0 && <div className="text-sm text-muted-foreground">Henüz kalem eklenmedi.</div>}
        {items.map((it) => {
          const q = parseFloat(it.quantity || '0') || 0;
          const p = parseFloat(it.unitPrice || '0') || 0;
          const t = disableTax ? 0 : (parseFloat(it.taxRate || '0') || 0);
          const lineTotal = disableTax ? (q * p) : (q * p * (1 + t / 100));
          return (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
              <div className={disableTax ? 'col-span-6 relative' : 'col-span-4 relative'}>
                <Input
                  placeholder="Ürün/Hizmet"
                  value={it.productName}
                  onChange={e => {
                    updateItem(it.id, { productName: e.target.value });
                    setActiveIdxByItem(prev => ({ ...prev, [it.id]: 0 }));
                  }}
                  onKeyDown={(e) => {
                    const list = getSuggestions(it.productName);
                    const hasExact = !!list.find(s => s.name === it.productName);
                    if (hasExact || list.length === 0) return;
                    const current = activeIdxByItem[it.id] ?? 0;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const nextIdx = (current + 1) % list.length;
                      setActiveIdxByItem(prev => ({ ...prev, [it.id]: nextIdx }));
                      setTimeout(() => scrollActiveIntoView(it.id, nextIdx), 0);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const nextIdx = (current - 1 + list.length) % list.length;
                      setActiveIdxByItem(prev => ({ ...prev, [it.id]: nextIdx }));
                      setTimeout(() => scrollActiveIntoView(it.id, nextIdx), 0);
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const chosen = list[current];
                      if (chosen) updateItem(it.id, { productName: chosen.name });
                    }
                  }}
                />
                {(() => {
                  const list = getSuggestions(it.productName);
                  const hasQuery = (it.productName || '').trim().length > 0;
                  const hideExact = !!list.find(s => s.name === it.productName);
                  const showList = list.length > 0 && !hideExact;
                  const showAdd = list.length === 0 && hasQuery;
                  if (!showList && !showAdd) return null;
                  return (
                    <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-auto rounded border border-border bg-popover text-popover-foreground shadow z-50">
                      {showList && list.map((s, sIdx) => {
                        const active = ((activeIdxByItem[it.id] ?? 0) === sIdx);
                        return (
                          <button
                            type="button"
                            key={s.id}
                            id={`suggestion-${it.id}-${sIdx}`}
                            className={`w-full text-left px-3 py-2 transition-colors ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => updateItem(it.id, { productName: s.name })}
                            role="option"
                            aria-selected={active}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                      {showAdd && (
                        <div className="px-3 py-2 flex items-center justify-between gap-2">
                          <span className="text-sm opacity-90">“{it.productName}” bulunamadı</span>
                          <button
                            type="button"
                            className="px-2 py-1 text-xs border rounded hover:bg-muted"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => onRequestAddStock && onRequestAddStock(it.productName, (newName) => updateItem(it.id, { productName: newName }))}
                          >
                            Stok kalemlerine ekle
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="col-span-2">
                <Input type="number" placeholder="Miktar" value={it.quantity} onChange={e => updateItem(it.id, { quantity: e.target.value })} />
              </div>
              {!disableTax ? (
                <>
                  <div className="col-span-1">
                    <Select value={it.unit} onValueChange={v => updateItem(it.id, { unit: v })}>
                      <SelectTrigger><SelectValue placeholder="Birim" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="mt">mt</SelectItem>
                        <SelectItem value="adet">ad</SelectItem>
                        <SelectItem value="top">top</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input type="number" placeholder="Birim Fiyat" value={it.unitPrice} onChange={e => updateItem(it.id, { unitPrice: e.target.value })} />
                  </div>
                  <div className="col-span-1">
                    <Select value={it.taxRate} onValueChange={v => updateItem(it.id, { taxRate: v })}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">%10</SelectItem>
                        <SelectItem value="20">%20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <Input type="number" placeholder="Birim Fiyatı" value={it.unitPrice} onChange={e => updateItem(it.id, { unitPrice: e.target.value })} />
                </div>
              )}
              <div className="col-span-1 text-right text-sm">
                {lineTotal.toFixed(2)}
              </div>
              <div className="col-span-1 text-right">
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(it.id)}>Sil</Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-1 text-right">
        <div className="text-sm">Ara Toplam: {totals.subTotal.toFixed(2)}</div>
        {!disableTax && (<div className="text-sm">KDV Tutarı: {totals.taxAmount.toFixed(2)}</div>)}
        <div className="font-semibold">Genel Toplam: {totals.grandTotal.toFixed(2)}</div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onSubmit({
          date,
          currency,
          items,
          subTotal: totals.subTotal,
          taxAmount: totals.taxAmount,
          grandTotal: totals.grandTotal,
        })}>Kaydet</Button>
      </div>
    </div>
  );
}
import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaleFormValues, StockItem, Customer } from "@/lib/types";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, Receipt, ShoppingCart } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Dispatch, SetStateAction } from "react";
import { Textarea } from "@/components/ui/textarea";
import { tr } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { addStockItem } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: SaleFormValues) => Promise<void>;
  formValues: SaleFormValues;
  setFormValues: Dispatch<SetStateAction<SaleFormValues>>;
  availableStockItems: StockItem[];
  customer?: Customer;
  editingSale?: any;
}

enum SaleType {
  STOCK = 'stock',
  MANUAL = 'manual',
}

enum InvoiceType {
  NORMAL = 'normal',
  INVOICE = 'invoice',
}

export function SaleModal({
  isOpen,
  onClose,
  onSubmit,
  formValues,
  setFormValues,
  availableStockItems,
  customer,
  editingSale,
}: SaleModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingAdd, setPendingAdd] = React.useState<{
    open: boolean;
    name: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [openCombobox, setOpenCombobox] = React.useState(false)
  const [saleType, setSaleType] = React.useState<SaleType>(SaleType.STOCK);
  const [invoiceType, setInvoiceType] = React.useState<InvoiceType>(InvoiceType.NORMAL);
  const [showTypeSelection, setShowTypeSelection] = React.useState(!editingSale);
  const [invoiceFile, setInvoiceFile] = React.useState<File | null>(null);

  // Düzenleme modunda mevcut satışın tipine göre doğru formu aç
  React.useEffect(() => {
    if (!editingSale) return;
    const isInvoice = (editingSale as any).invoiceType === 'invoice';
    setInvoiceType(isInvoice ? InvoiceType.INVOICE : InvoiceType.NORMAL);
    setShowTypeSelection(false);
    if (!isInvoice) {
      // Manuel düzenleme: stok mu manuel mi belirle
      if ((editingSale as any).stockItemId) setSaleType(SaleType.STOCK);
      else setSaleType(SaleType.MANUAL);
    }
  }, [editingSale]);

  // Manuel düzenleme için başlangıç kalemleri/tarih/para birimi türet
  const manualInitialItems = React.useMemo(() => {
    // Eğer formValues içinde items varsa onları kullan
    const fvItems = (formValues as any).items;
    if (Array.isArray(fvItems) && fvItems.length > 0) {
      return fvItems.map((it: any) => ({
        id: it.id,
        productName: it.productName || it.description || '',
        description: it.description,
        quantity: typeof it.quantity === 'number' ? it.quantity : Number(it.quantity ?? 1),
        unitPrice: typeof it.unitPrice === 'number' ? it.unitPrice : Number(it.unitPrice ?? 0),
        unit: it.unit || 'adet',
        taxRate: typeof it.taxRate === 'number' ? it.taxRate : undefined,
      }));
    }
    // editingSale varsa ondan tek kalem türet
    if (editingSale && (editingSale as any).invoiceType !== 'invoice') {
      const q = typeof editingSale.quantity === 'number' ? editingSale.quantity : 1;
      // unitPrice yoksa amount'u kullan
      const up = typeof editingSale.unitPrice === 'number' ? editingSale.unitPrice : (typeof editingSale.amount === 'number' ? editingSale.amount : 0);
      return [{
        id: '1',
        productName: editingSale.description || 'Satış',
        description: editingSale.description || 'Satış',
        quantity: q,
        unitPrice: up,
        unit: 'adet',
        taxRate: undefined,
      }];
    }
    return undefined;
  }, [formValues, editingSale]);

  const manualInitialDate = React.useMemo(() => {
    if (formValues?.date) return formValues.date;
    if (editingSale && editingSale.date) return new Date(editingSale.date);
    return undefined;
  }, [formValues?.date, editingSale]);

  const manualInitialCurrency = React.useMemo(() => {
    if (formValues?.currency) return formValues.currency as 'TRY'|'USD'|'EUR';
    if (editingSale && editingSale.currency) return editingSale.currency as 'TRY'|'USD'|'EUR';
    return undefined;
  }, [formValues?.currency, editingSale]);

  // Otomatik tutar hesaplama
  React.useEffect(() => {
    const quantity = parseFloat(String(formValues.quantity ?? '').replace(',', '.'));
    const unitPrice = parseFloat(String(formValues.unitPrice ?? '').replace(',', '.'));
    if (!isNaN(quantity) && !isNaN(unitPrice)) {
      const calculated = (quantity * unitPrice).toFixed(2);
      if (formValues.amount !== calculated) {
        setFormValues(prev => ({ ...prev, amount: calculated }));
      }
    }
  }, [formValues.quantity, formValues.unitPrice]);

  // Tarih inputu için değişiklik:
  // Eğer formValues.dateInput yoksa, date'ten otomatik doldur
  React.useEffect(() => {
    if (formValues.date && !formValues.dateInput) {
      setFormValues(prev => ({ ...prev, dateInput: formValues.date ? format(formValues.date, 'dd.MM.yyyy') : '' }));
    }
  }, [formValues.date]);

  // Stok ürünü seçildiğinde açıklamayı otomatik doldur
  React.useEffect(() => {
    if (saleType === SaleType.STOCK) {
      const stockItemId = formValues.stockItemId;
      const selectedItem = availableStockItems.find(item => item.id === stockItemId);
      if (selectedItem && formValues.description !== selectedItem.name) {
        setFormValues(prev => ({ ...prev, description: selectedItem.name }));
      }
    }
  }, [formValues.stockItemId, saleType]);

  // Manuel satışta ürün adı girildiğinde açıklamayı otomatik doldur
  React.useEffect(() => {
    if (saleType === SaleType.MANUAL) {
      const manualProductName = (formValues as any).manualProductName;
      if (manualProductName && formValues.description !== manualProductName) {
        setFormValues(prev => ({ ...prev, description: manualProductName }));
      }
    }
  }, [(formValues as any).manualProductName, saleType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.date || !(formValues.date instanceof Date) || isNaN(formValues.date.getTime())) {
      alert('Lütfen geçerli bir tarih giriniz!');
      return;
    }
    try {
      // Manuel modda LightweightInvoiceForm'dan gelen items/subtotal/toplam varsa bunları kullan
      const submitValues: any = {
        ...formValues,
        amountNumber: parseFloat(String(formValues.amount).replace(',', '.')),
        unitPriceNumber: formValues.unitPrice !== undefined ? parseFloat(String(formValues.unitPrice).replace(',', '.')) : undefined,
        invoiceType: invoiceType,
        invoiceFile: invoiceFile,
      };
      if (saleType === 'manual' as any && (formValues as any).items) {
        submitValues.items = (formValues as any).items;
        // tax kapalı olduğu için subtotal = grandTotal ve taxAmount = 0 gibi davranacağız; amount zaten grandTotal
        submitValues.subtotal = undefined;
        submitValues.taxAmount = undefined;
      }
      await onSubmit(submitValues);
    } catch (error) {
      console.error("Error submitting sale form:", error);
    }
  };

  const handleTypeSelection = (type: InvoiceType) => {
    setInvoiceType(type);
    // Manuel satış istendiğinde doğrudan manuel (faturalı görünümlü) forma geç
    if (type === InvoiceType.NORMAL) {
      setSaleType(SaleType.MANUAL);
    }
    setShowTypeSelection(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setInvoiceFile(file);
    } else {
      alert('Lütfen sadece PDF dosyası yükleyin.');
    }
  };

  if (showTypeSelection) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Satış Türü Seçin</DialogTitle>
            <DialogDescription>Hangi tür satış yapmak istiyorsunuz?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button 
              onClick={() => handleTypeSelection(InvoiceType.NORMAL)}
              className="h-24 flex flex-col items-center justify-center gap-2 p-4"
            >
              <ShoppingCart className="h-6 w-6" />
              <div className="flex flex-col items-center">
                <span className="font-medium">Manuel Satış</span>
                <span className="text-xs text-white/90">Stok/manuel alanlı basit satış</span>
              </div>
            </Button>
            <Button 
              onClick={() => handleTypeSelection(InvoiceType.INVOICE)}
              className="h-24 flex flex-col items-center justify-center gap-2 p-4"
            >
              <Receipt className="h-6 w-6" />
              <div className="flex flex-col items-center">
                <span className="font-medium">Faturalı Satış</span>
                <span className="text-xs text-white/90">Teklif formu ile detaylı satış</span>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Faturalı satış: Teklif formunu aç ve dönüşte satışa dönüştür
  if (invoiceType === InvoiceType.INVOICE) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
          <DialogContent className="sm:max-w-[980px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSale ? 'Faturalı Satış Düzenle' : 'Faturalı Satış'}</DialogTitle>
              <DialogDescription>
                Kalemleri ekleyin; toplamlar otomatik hesaplanır. Kaydedince satış oluşturulur.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <LightweightInvoiceForm
                customerName={customer?.name || ''}
                initialItems={editingSale?.items}
                initialDate={editingSale ? new Date(editingSale.date) : undefined}
                initialCurrency={editingSale?.currency}
                availableStockItems={availableStockItems}
                onRequestAddStock={(name, onAdded) => {
                  setPendingAdd({
                    open: true,
                    name,
                    onConfirm: async () => {
                      if (!user?.uid) return;
                      const created = await addStockItem(user.uid, { name, currentStock: 0, unit: 'ad' });
                      if (created) onAdded(created.name);
                    }
                  });
                }}
                onSubmit={(data: any) => {
                  try {
                    const desc = Array.isArray(data.items) && data.items.length > 0
                      ? `${data.items[0].productName}${data.items.length > 1 ? ` +${data.items.length - 1} kalem` : ''}`
                      : (formValues.description || 'Faturalı Satış');
                    const grand = Number(data.grandTotal ?? 0);
                    const sub = Number(data.subTotal ?? 0);
                    const tax = Number(data.taxAmount ?? 0);
                    const submitValues: any = {
                      amount: String(grand),
                      amountNumber: grand,
                      date: data.date,
                      currency: data.currency ?? 'TRY',
                      description: desc,
                      items: data.items || [],
                      subTotal: sub,
                      taxAmount: tax,
                      grandTotal: grand,
                      invoiceType: 'invoice',
                    };
                    onSubmit({ ...formValues, ...submitValues });
                    onClose();
                  } catch (e) { console.error(e); }
                }}
              />
            </div>
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

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[860px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingSale ? 'Satışı Düzenle' : (String(invoiceType) === 'invoice' ? 'Faturalı Satış Ekle' : 'Satış Ekle')}
          </DialogTitle>
          <DialogDescription>
            {'Yeni bir satış işlemi ekleyin veya mevcut bir satışı düzenleyin.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="saleType">Satış Tipi</Label>
              <Select value={saleType} onValueChange={v => setSaleType(v as SaleType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Satış tipi seçin..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SaleType.STOCK}>Stoktan Satış</SelectItem>
                  <SelectItem value={SaleType.MANUAL}>Manuel Satış</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {saleType === SaleType.STOCK ? (
              <div className="grid gap-2">
                <Label htmlFor="stockItemId">Stok Kalemi</Label>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className="w-full justify-between"
                    >
                      {formValues.stockItemId
                        ? availableStockItems.find((item) => item.id === formValues.stockItemId)?.name
                        : "Stok kalemi seçin..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Stok kalemi ara..." />
                      <CommandEmpty>Stok kalemi bulunamadı.</CommandEmpty>
                      <CommandGroup>
                        {availableStockItems.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={item.name}
                            onSelect={(currentValue) => {
                              const selectedItem = availableStockItems.find(i => i.name.toLowerCase() === currentValue.toLowerCase());
                              if (selectedItem) {
                                setFormValues(prev => ({ ...prev, stockItemId: selectedItem.id }));
                              }
                              setOpenCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formValues.stockItemId === item.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {item.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            ) : null}
            {saleType === SaleType.MANUAL && (
              <div className="py-2">
                <LightweightInvoiceForm
                  customerName={customer?.name || ''}
                  initialItems={manualInitialItems as any}
                  initialDate={manualInitialDate}
                  initialCurrency={manualInitialCurrency}
                  disableTax
                  availableStockItems={availableStockItems}
                  onRequestAddStock={(name, onAdded) => {
                    setPendingAdd({
                      open: true,
                      name,
                      onConfirm: async () => {
                        if (!user?.uid) return;
                        const created = await addStockItem(user.uid, { name, currentStock: 0, unit: 'ad' });
                        if (created) onAdded(created.name);
                      }
                    });
                  }}
                  onSubmit={(data: any) => {
                    try {
                      const desc = Array.isArray(data.items) && data.items.length > 0
                        ? `${data.items[0].productName}${data.items.length > 1 ? ` +${data.items.length - 1} kalem` : ''}`
                        : (formValues.description || 'Satış');
                      const submitValues: any = {
                        amount: String(data.grandTotal ?? 0),
                        date: data.date,
                        currency: data.currency ?? 'TRY',
                        description: desc,
                        items: data.items || [],
                        invoiceType: 'normal',
                      };
                      onSubmit({ ...formValues, ...submitValues });
                      onClose();
                    } catch (e) { console.error(e); }
                  }}
                />
              </div>
            )}
            {saleType === SaleType.STOCK && (
            <div className="grid gap-2">
              <Label htmlFor="quantity">Miktar</Label>
              <Input
                id="quantity"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formValues.quantity || ''}
                onChange={(e) => setFormValues({ ...formValues, quantity: e.target.value.replace(/[^0-9]/g, '') })}
                required
              />
            </div>
            )}
            {saleType === SaleType.STOCK && (
            <div className="grid gap-2">
              <Label htmlFor="unitPrice">Birim Fiyat</Label>
              <Input
                id="unitPrice"
                type="text"
                inputMode="decimal"
                value={formValues.unitPrice || ''}
                onChange={(e) => setFormValues({ ...formValues, unitPrice: e.target.value.replace(/,/g, '.') })}
                required
              />
              <span className="text-xs text-muted-foreground">Negatif değer girebilirsiniz (devreden bakiye için).</span>
            </div>
            )}
            {/* Faturalı modda artık QuotationForm kullanılıyor, bu yüzden KDV ve dosya alanları burada gösterilmiyor */}
            {saleType === SaleType.STOCK && (
            <div className="grid gap-2">
              <Label htmlFor="amount">
                {String(invoiceType) === 'invoice' ? 'Toplam Tutar (KDV Dahil)' : 'Tutar'}
              </Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                value={formValues.amount}
                onChange={(e) => setFormValues({ ...formValues, amount: e.target.value.replace(/,/g, '.') })}
                required
              />
              <span className="text-xs text-muted-foreground">Negatif değer girebilirsiniz (devreden bakiye için).</span>
            </div>
            )}
            {saleType === SaleType.STOCK && (
            <div className="grid gap-2">
              <Label htmlFor="date">Tarih</Label>
                <Input
                  type="text"
                  placeholder="gg.aa.yyyy"
                value={formValues.dateInput ?? (formValues.date ? format(formValues.date, 'dd.MM.yyyy') : '')}
                  onChange={e => {
                  let val = e.target.value.replace(/[^0-9]/g, ''); // Sadece rakamları al
                  if (val.length > 8) val = val.slice(0, 8);
                  // Otomatik nokta ekle
                  if (val.length > 4) val = val.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1.$2.$3');
                  else if (val.length > 2) val = val.replace(/(\d{2})(\d{0,2})/, '$1.$2');
                  setFormValues(prev => ({ ...prev, dateInput: val }));
                  if (val.length === 10) {
                    const parsed = parse(val, 'dd.MM.yyyy', new Date());
                    if (isValid(parsed)) {
                      setFormValues(prev => ({ ...prev, date: parsed, dateInput: val }));
                    }
                    } else {
                    setFormValues(prev => ({ ...prev, date: undefined }));
                    }
                  }}
                  className="w-32"
                  maxLength={10}
                />
            </div>
            )}
            {saleType === SaleType.STOCK && (
            <div className="grid gap-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={formValues.description || ''}
                onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                placeholder="Opsiyonel"
              />
            </div>
            )}
          </div>
          {saleType !== SaleType.MANUAL && (
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit">Kaydet</Button>
            </div>
          )}
        </form>
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