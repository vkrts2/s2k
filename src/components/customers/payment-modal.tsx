import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentFormValues, Currency } from "@/lib/types";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Dispatch, SetStateAction } from "react";
import { tr } from 'date-fns/locale';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  formValues: PaymentFormValues;
  setFormValues: Dispatch<SetStateAction<PaymentFormValues>>;
}

const EMPTY_PAYMENT_FORM_VALUES: PaymentFormValues = {
  amount: '',
  date: new Date(),
  currency: 'TRY',
  method: 'nakit',
  referenceNumber: null
};

export function PaymentModal({
  isOpen,
  onClose,
  onSubmit,
  formValues,
  setFormValues
}: PaymentModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(e);
    } catch (error) {
      console.error("Error submitting payment form:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ödeme Ekle</DialogTitle>
          <DialogDescription>Yeni bir ödeme işlemi ekleyin veya mevcut bir ödemeyi düzenleyin.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                  {formValues.date ? format(formValues.date, "dd.MM.yyyy", { locale: tr }) : <span>Tarih seçin</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formValues.date}
                  onSelect={(date) => date && setFormValues({ ...formValues, date })}
                  initialFocus
                  locale={tr}
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
            <Label htmlFor="method" className="text-right">Ödeme Yöntemi</Label>
            <Select
              value={formValues.method}
              onValueChange={(value: 'nakit' | 'krediKarti' | 'havale' | 'diger') => setFormValues({ ...formValues, method: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Ödeme yöntemi seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nakit">Nakit</SelectItem>
                <SelectItem value="krediKarti">Kredi Kartı</SelectItem>
                <SelectItem value="havale">Havale/EFT</SelectItem>
                <SelectItem value="diger">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="referenceNumber" className="text-right">Referans No</Label>
            <Input
              id="referenceNumber"
              value={formValues.referenceNumber || ''}
              onChange={(e) => setFormValues({ ...formValues, referenceNumber: e.target.value || null })}
              className="col-span-3"
              placeholder="Opsiyonel"
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