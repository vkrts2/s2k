import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PurchaseFormValues, Currency, StockItem } from "@/lib/types";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Dispatch, SetStateAction } from "react";
import { tr } from 'date-fns/locale';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  formValues: PurchaseFormValues;
  setFormValues: Dispatch<SetStateAction<PurchaseFormValues>>;
  availableStockItems: StockItem[];
  stockItemDisplayNames: Record<string, string>;
}

export function PurchaseModal({
  isOpen,
  onClose,
  onSubmit,
  formValues,
  setFormValues,
  availableStockItems,
  stockItemDisplayNames
}: PurchaseModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Alış Ekle</DialogTitle>
          <DialogDescription>Yeni bir alış işlemi ekleyin veya mevcut bir alışı düzenleyin.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          console.log("Purchase form submitted!");
          onSubmit(e);
        }} className="space-y-4">
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
              <Label htmlFor="description">Açıklama</Label>
              <Input
                id="description"
                value={formValues.description}
                onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                placeholder="Açıklama (isteğe bağlı)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stockItem">Stok Ürünü</Label>
              <Select
                value={formValues.stockItemId}
                onValueChange={(value) => setFormValues({ ...formValues, stockItemId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Stok ürünü seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Stok ürünü yok</SelectItem>
                  {availableStockItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {stockItemDisplayNames[item.id] || item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formValues.stockItemId && formValues.stockItemId !== 'none' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Miktar</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="1"
                    value={formValues.quantityPurchased}
                    onChange={(e) => setFormValues({ ...formValues, quantityPurchased: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unitPrice">Birim Fiyat</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    value={formValues.unitPrice}
                    onChange={(e) => setFormValues({ ...formValues, unitPrice: e.target.value })}
                    required
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" onClick={() => console.log("Kaydet button clicked (Purchase Modal)!")}>Kaydet</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 