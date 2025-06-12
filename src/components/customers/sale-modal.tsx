import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  formValues: SaleFormValues;
  setFormValues: Dispatch<SetStateAction<SaleFormValues>>;
  availableStockItems: StockItem[];
  stockItemDisplayNames: Record<string, string>;
}

const EMPTY_SALE_FORM_VALUES: SaleFormValues = {
  amount: '',
  date: new Date(),
  currency: 'TRY',
  stockItemId: 'none',
  quantity: '',
  unitPrice: ''
};

export function SaleModal({
  isOpen,
  onClose,
  onSubmit,
  formValues,
  setFormValues,
  availableStockItems,
  stockItemDisplayNames
}: SaleModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Satış Ekle</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">Tutar</Label>
            <Input
              id="amount"
              type="number"
              value={formValues.amount}
              onChange={(e) => setFormValues({ ...formValues, amount: e.target.value })}
              className="col-span-3"
              step="0.01"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">Tarih</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !formValues.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formValues.date ? format(formValues.date, "PPP") : <span>Tarih seçin</span>}
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currency" className="text-right">Para Birimi</Label>
            <Select
              value={formValues.currency}
              onValueChange={(value: Currency) => setFormValues({ ...formValues, currency: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Para birimi seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">TRY</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stockItemId" className="text-right">Stok Ürünü</Label>
            <Select
              value={formValues.stockItemId}
              onValueChange={(value) => setFormValues({ ...formValues, stockItemId: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Stok ürünü seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Manuel Giriş</SelectItem>
                {availableStockItems.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {formValues.stockItemId && formValues.stockItemId !== 'none' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">Miktar</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formValues.quantity}
                  onChange={(e) => setFormValues({ ...formValues, quantity: e.target.value })}
                  className="col-span-3"
                  step="0.01"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unitPrice" className="text-right">Birim Fiyat</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  value={formValues.unitPrice}
                  onChange={(e) => setFormValues({ ...formValues, unitPrice: e.target.value })}
                  className="col-span-3"
                  step="0.01"
                  required
                />
              </div>
            </>
          )}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit">
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 