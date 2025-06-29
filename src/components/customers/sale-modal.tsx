import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaleFormValues, StockItem } from "@/lib/types";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
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
}

enum SaleType {
  STOCK = 'stock',
  MANUAL = 'manual',
}

export function SaleModal({
  isOpen,
  onClose,
  onSubmit,
  formValues,
  setFormValues,
  availableStockItems,
}: SaleModalProps) {
  const [openCombobox, setOpenCombobox] = React.useState(false)
  const [saleType, setSaleType] = React.useState<SaleType>(SaleType.STOCK);

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
      await onSubmit(formValues);
    } catch (error) {
      console.error("Error submitting sale form:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Satış Ekle</DialogTitle>
          <DialogDescription>Yeni bir satış işlemi ekleyin veya mevcut bir satışı düzenleyin.</DialogDescription>
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
            <div className="grid gap-2">
              <Label htmlFor="amount">Tutar</Label>
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