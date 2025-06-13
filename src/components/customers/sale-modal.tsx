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

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: SaleFormValues) => Promise<void>;
  formValues: SaleFormValues;
  setFormValues: Dispatch<SetStateAction<SaleFormValues>>;
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
  stockItemDisplayNames
}: SaleModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Satış Ekle</DialogTitle>
          <DialogDescription>Yeni bir satış işlemi ekleyin veya mevcut bir satışı düzenleyin.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          console.log("Sale form submitted!");
          onSubmit(formValues);
        }} className="space-y-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stockItemId" className="text-right">Stok Ürünü</Label>
            <Select
              value={formValues.stockItemId}
              onValueChange={(value) => setFormValues({ ...formValues, stockItemId: value === 'none' ? undefined : value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Stok ürünü seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Yok</SelectItem>
                {availableStockItems.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">Miktar</Label>
            <Input
              id="quantity"
              type="number"
              value={formValues.quantity || ''}
              onChange={(e) => {
                const quantity = e.target.value;
                const amount = quantity && formValues.unitPrice
                  ? (parseFloat(quantity) * parseFloat(formValues.unitPrice)).toString()
                  : formValues.amount;
                setFormValues({ ...formValues, quantity, amount });
              }}
              className="col-span-3"
              step="0.01"
              min="0"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unitPrice" className="text-right">Birim Fiyat</Label>
            <Input
              id="unitPrice"
              type="number"
              value={formValues.unitPrice || ''}
              onChange={(e) => {
                const unitPrice = e.target.value;
                const amount = unitPrice && formValues.quantity
                  ? (parseFloat(unitPrice) * parseFloat(formValues.quantity)).toString()
                  : formValues.amount;
                setFormValues({ ...formValues, unitPrice, amount });
              }}
              className="col-span-3"
              step="0.01"
              min="0"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">Toplam Tutar</Label>
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
            <Label htmlFor="description" className="text-right">Açıklama</Label>
            <Textarea
              id="description"
              value={formValues.description}
              onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
              className="col-span-3"
              placeholder="Satış açıklaması (isteğe bağlı)"
            />
          </div>
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