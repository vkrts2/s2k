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
}: { onSubmit: (data: any) => void; customerName: string }) {
  const [date, setDate] = React.useState<Date>(new Date());
  const [currency, setCurrency] = React.useState<'TRY' | 'USD' | 'EUR'>('TRY');
  const [items, setItems] = React.useState<Array<{ id: string; productName: string; quantity: string; unitPrice: string; taxRate: string; unit: string }>>([]);

	const addItem = () => setItems(prev => [...prev, { id: `${Date.now()}`, productName: '', quantity: '', unitPrice: '', taxRate: '20', unit: 'adet' }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, patch: Partial<{ productName: string; quantity: string; unitPrice: string; taxRate: string; unit: string }>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

  const totals = React.useMemo(() => {
    let subTotal = 0;
    let taxAmount = 0;
    for (const it of items) {
      const q = parseFloat(it.quantity || '0') || 0;
      const p = parseFloat(it.unitPrice || '0') || 0;
      const t = parseFloat(it.taxRate || '0') || 0;
      const line = q * p;
      subTotal += line;
      taxAmount += line * (t / 100);
    }
    const grandTotal = subTotal + taxAmount;
    return { subTotal, taxAmount, grandTotal };
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label>Müşteri</Label>
        <Input value={customerName} disabled />
      </div>
      <div className="grid gap-2">
        <Label>Tarih</Label>
        <Input type="date" value={date.toISOString().slice(0,10)} onChange={e => setDate(new Date(e.target.value))} className="w-48" />
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
        {items.length === 0 && <div className="text-sm text-muted-foreground">Henüz kalem eklenmedi.</div>}
		{items.map(it => (
			<div key={it.id} className="grid grid-cols-6 gap-2">
				<Input placeholder="Ürün/Hizmet" value={it.productName} onChange={e => updateItem(it.id, { productName: e.target.value })} />
				<Input type="number" placeholder="Miktar" value={it.quantity} onChange={e => updateItem(it.id, { quantity: e.target.value })} />
				<Select value={it.unit} onValueChange={v => updateItem(it.id, { unit: v })}>
					<SelectTrigger><SelectValue placeholder="Birim" /></SelectTrigger>
					<SelectContent>
						<SelectItem value="kg">kg</SelectItem>
						<SelectItem value="mt">mt</SelectItem>
						<SelectItem value="adet">ad</SelectItem>
						<SelectItem value="top">top</SelectItem>
					</SelectContent>
				</Select>
				<Input type="number" placeholder="Birim Fiyat" value={it.unitPrice} onChange={e => updateItem(it.id, { unitPrice: e.target.value })} />
				<Select value={it.taxRate} onValueChange={v => updateItem(it.id, { taxRate: v })}>
					<SelectTrigger><SelectValue /></SelectTrigger>
					<SelectContent>
						<SelectItem value="10">%10</SelectItem>
						<SelectItem value="20">%20</SelectItem>
					</SelectContent>
				</Select>
				<Button type="button" variant="ghost" onClick={() => removeItem(it.id)}>Sil</Button>
			</div>
		))}
      </div>
      <div className="space-y-1 text-right">
        <div className="text-sm">Ara Toplam: {totals.subTotal.toFixed(2)}</div>
        <div className="text-sm">KDV Tutarı: {totals.taxAmount.toFixed(2)}</div>
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

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: SaleFormValues) => Promise<void>;
  formValues: SaleFormValues;
  setFormValues: Dispatch<SetStateAction<SaleFormValues>>;
  availableStockItems: StockItem[];
  customer?: Customer;
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
}: SaleModalProps) {
  const [openCombobox, setOpenCombobox] = React.useState(false)
  const [saleType, setSaleType] = React.useState<SaleType>(SaleType.STOCK);
  const [invoiceType, setInvoiceType] = React.useState<InvoiceType>(InvoiceType.NORMAL);
  const [showTypeSelection, setShowTypeSelection] = React.useState(true);
  const [invoiceFile, setInvoiceFile] = React.useState<File | null>(null);

  // Otomatik tutar hesaplama
  React.useEffect(() => {
    const quantity = parseFloat(formValues.quantity as any);
    const unitPrice = parseFloat(formValues.unitPrice as any);
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
      // amount ve unitPrice'ı hem string hem number olarak gönder
      const submitValues = {
        ...formValues,
        amountNumber: parseFloat(String(formValues.amount).replace(',', '.')),
        unitPriceNumber: formValues.unitPrice !== undefined ? parseFloat(String(formValues.unitPrice).replace(',', '.')) : undefined,
        invoiceType: invoiceType,
        invoiceFile: invoiceFile,
      };
      await onSubmit(submitValues);
    } catch (error) {
      console.error("Error submitting sale form:", error);
    }
  };

  const handleTypeSelection = (type: InvoiceType) => {
    setInvoiceType(type);
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
      <Dialog open={isOpen} onOpenChange={onClose}>
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
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[860px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Faturalı Satış</DialogTitle>
            <DialogDescription>
              Kalemleri ekleyin; toplamlar otomatik hesaplanır. Kaydedince satış oluşturulur.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <LightweightInvoiceForm
              customerName={customer?.name || ''}
              onSubmit={(data: any) => {
                try {
                  const desc = Array.isArray(data.items) && data.items.length > 0
                    ? `${data.items[0].productName}${data.items.length > 1 ? ` +${data.items.length - 1} kalem` : ''}`
                    : (formValues.description || 'Faturalı Satış');
                  const submitValues: any = {
                    amount: String(data.grandTotal ?? 0),
                    date: data.date,
                    currency: data.currency ?? 'TRY',
                    description: desc,
                    subtotal: data.subTotal ?? 0,
                    taxAmount: data.taxAmount ?? 0,
                    items: data.items || [],
                    invoiceType: 'invoice',
                  };
                  onSubmit(submitValues);
                } catch (e) { console.error(e); }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoiceType === InvoiceType.INVOICE ? 'Faturalı Satış Ekle' : 'Satış Ekle'}
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
                              const newId = selectedItem ? selectedItem.id : undefined;
                              setFormValues(prev => ({ 
                                ...prev, 
                                stockItemId: newId === prev.stockItemId ? undefined : newId,
                                description: selectedItem ? selectedItem.name : prev.description
                              }))
                              setOpenCombobox(false)
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
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="manualProductName">Ürün Adı</Label>
                <Input
                  id="manualProductName"
                  value={(formValues as any).manualProductName || ''}
                  onChange={e => setFormValues(prev => ({ ...prev, manualProductName: e.target.value }))}
                  placeholder="Ürün adını girin..."
                  required
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="quantity">Miktar</Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                value={formValues.quantity || ''}
                onChange={(e) => setFormValues({ ...formValues, quantity: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unitPrice">Birim Fiyat</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                value={formValues.unitPrice || ''}
                onChange={(e) => setFormValues({ ...formValues, unitPrice: e.target.value })}
                required
              />
              <span className="text-xs text-muted-foreground">Negatif değer girebilirsiniz (devreden bakiye için).</span>
            </div>
            {/* Faturalı modda artık QuotationForm kullanılıyor, bu yüzden KDV ve dosya alanları burada gösterilmiyor */}
            <div className="grid gap-2">
              <Label htmlFor="amount">
                {invoiceType === InvoiceType.INVOICE ? 'Toplam Tutar (KDV Dahil)' : 'Tutar'}
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formValues.amount}
                onChange={(e) => setFormValues({ ...formValues, amount: e.target.value })}
                required
              />
              <span className="text-xs text-muted-foreground">Negatif değer girebilirsiniz (devreden bakiye için).</span>
            </div>
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
            <div className="grid gap-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={formValues.description || ''}
                onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                placeholder="Opsiyonel"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit">Kaydet</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 