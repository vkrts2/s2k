import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SaleFormValues, Currency, StockItem } from "@/lib/types";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Dispatch, SetStateAction } from "react";
import { Textarea } from "@/components/ui/textarea";
import { tr } from 'date-fns/locale';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  formValues: SaleFormValues;
  setFormValues: (values: SaleFormValues) => void;
  availableStockItems: StockItem[];
  stockItemDisplayNames: Record<string, string>;
}

const EMPTY_SALE_FORM_VALUES: SaleFormValues = {
  amount: '',
  date: new Date(),
  currency: 'TRY',
  stockItemId: undefined,
  description: '',
  quantity: undefined,
  unitPrice: undefined,
};

export function SaleModal({
  isOpen,
  onClose,
  onSubmit,
  formValues,
  setFormValues,
  availableStockItems,
  stockItemDisplayNames,
}: SaleModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(e);
    } catch (error) {
      console.error("Error submitting sale form:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Satış Ekle</DialogTitle>
          <DialogDescription>Yeni bir satış işlemi ekleyin veya mevcut bir satışı düzenleyin.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
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
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Tarih</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formValues.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formValues.date ? format(formValues.date, "PPP", { locale: tr }) : "Tarih seçin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formValues.date}
                    onSelect={(date) => date && setFormValues({ ...formValues, date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Para Birimi</Label>
              <Select
                value={formValues.currency}
                onValueChange={(value: Currency) => setFormValues({ ...formValues, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Para birimi seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stockItemId">Stok Kalemi</Label>
              <Select
                value={formValues.stockItemId || ''}
                onValueChange={(value) => setFormValues({ ...formValues, stockItemId: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Stok kalemi seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Manuel Giriş</SelectItem>
                  {availableStockItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Açıklama</Label>
              <Input
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