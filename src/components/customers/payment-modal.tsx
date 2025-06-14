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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ödeme Ekle</DialogTitle>
          <DialogDescription>Yeni bir ödeme işlemi ekleyin veya mevcut bir ödemeyi düzenleyin.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          console.log("Payment form submitted!"); // Debugging log
          onSubmit(e);
        }} className="space-y-4">
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
                <SelectItem value="cek">Çek</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formValues.method === 'cek' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="checkDate" className="text-right">Çek Tarihi</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !formValues.checkDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formValues.checkDate ? format(formValues.checkDate, "PPP") : <span>Tarih seçin</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formValues.checkDate || undefined}
                      onSelect={(date) => setFormValues({ ...formValues, checkDate: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="checkInfo" className="text-right">Çek Bilgileri</Label>
                <Input
                  id="checkInfo"
                  value={formValues.checkInfo || ''}
                  onChange={(e) => setFormValues({ ...formValues, checkInfo: e.target.value || null })}
                  className="col-span-3"
                  placeholder="Çek numarası, banka adı vb."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="checkImage1" className="text-right">Çek Görseli 1 (URL)</Label>
                <Input
                  id="checkImage1"
                  value={formValues.checkImage1 || ''}
                  onChange={(e) => setFormValues({ ...formValues, checkImage1: e.target.value || null })}
                  className="col-span-3"
                  placeholder="Görsel URL'si"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="checkImage2" className="text-right">Çek Görseli 2 (URL)</Label>
                <Input
                  id="checkImage2"
                  value={formValues.checkImage2 || ''}
                  onChange={(e) => setFormValues({ ...formValues, checkImage2: e.target.value || null })}
                  className="col-span-3"
                  placeholder="Görsel URL'si (Opsiyonel)"
                />
              </div>
            </>
          )}
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
            <Button type="submit" onClick={() => console.log("Kaydet button clicked (Payment Modal)!")}>
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 