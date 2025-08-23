import React, { ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentFormValues, Currency } from "@/lib/types";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Dispatch, SetStateAction } from "react";
import { tr } from 'date-fns/locale';
// import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"; // not used here

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: PaymentFormValues) => Promise<void>;
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
  setFormValues,
}: PaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Çoklu tıklamayı engelle
    if (isSubmitting) {
      return;
    }
    
    if (!formValues.dateInput || formValues.dateInput.length !== 10) {
      alert('Lütfen tarihi gg.aa.yyyy formatında ve eksiksiz giriniz!');
      return;
    }
    if (!formValues.date || !(formValues.date instanceof Date) || isNaN(formValues.date.getTime())) {
      alert('Lütfen geçerli bir tarih giriniz!');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(formValues);
    } catch (error) {
      console.error("Error submitting payment form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    if (formValues.date && !formValues.dateInput) {
      setFormValues((prev: PaymentFormValues) => ({ ...prev, dateInput: format(formValues.date!, 'dd.MM.yyyy') }));
    }
  }, [formValues.date, setFormValues]);

  const isCheckMethod = formValues.method === 'cek';

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent className={cn(
        "sm:max-w-[425px]",
        isCheckMethod && "sm:max-w-[700px] max-h-[500px]"
      )}>
        <DialogHeader>
          <DialogTitle>Ödeme Ekle</DialogTitle>
          <DialogDescription>Yeni bir ödeme işlemi ekleyin veya mevcut bir ödemeyi düzenleyin.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isCheckMethod ? (
            // Çek için kare tasarım
            <div className="grid grid-cols-2 gap-6">
              {/* Sol kolon */}
              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Tutar</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formValues.amount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormValues({ ...formValues, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Tarih</Label>
                  <Input
                    type="text"
                    placeholder="gg.aa.yyyy"
                    value={formValues.dateInput ?? (formValues.date ? format(formValues.date, 'dd.MM.yyyy') : '')}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      let val = e.target.value.replace(/[^0-9]/g, ''); // Sadece rakamları al
                      if (val.length > 8) val = val.slice(0, 8);
                      // Noktalama: 2. ve 4. karakterden sonra otomatik ekle
                      if (val.length > 4) val = val.slice(0,2) + '.' + val.slice(2,4) + '.' + val.slice(4);
                      else if (val.length > 2) val = val.slice(0,2) + '.' + val.slice(2);
                      setFormValues((prev: PaymentFormValues) => ({ ...prev, dateInput: val }));
                      if (val.length === 10) {
                        const parsed = parse(val, 'dd.MM.yyyy', new Date());
                        if (isValid(parsed)) {
                          setFormValues((prev: PaymentFormValues) => ({ ...prev, date: parsed, dateInput: val }));
                        }
                      } else {
                        setFormValues((prev: PaymentFormValues) => ({ ...prev, date: undefined }));
                      }
                    }}
                    className="w-32"
                    maxLength={10}
                  />
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
                  <Label htmlFor="method">Ödeme Yöntemi</Label>
                  <Select
                    value={formValues.method}
                    onValueChange={(value: PaymentFormValues['method']) => setFormValues({ ...formValues, method: value })}
                  >
                    <SelectTrigger>
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
                <div className="grid gap-2">
                  <Label htmlFor="checkDate">Çek Tarihi</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formValues.checkDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formValues.checkDate ? format(formValues.checkDate, "PPP", { locale: tr }) : "Çek Tarihi seçin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formValues.checkDate || undefined}
                        onSelect={(date?: Date) => setFormValues({ ...formValues, checkDate: date || null })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Sağ kolon */}
              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="checkSerialNumber">Çek Seri Numarası</Label>
                  <Input
                    id="checkSerialNumber"
                    value={formValues.checkSerialNumber || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormValues({ ...formValues, checkSerialNumber: e.target.value || null })}
                    placeholder="Çek seri numarasını girin"
                    required={formValues.method === 'cek'}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="checkImage">Çek Görseli (JPG/PNG/PDF)</Label>
                  <Input
                    id="checkImage"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0] || null;
                      if (!file) return;
                      try {
                        // Sadece local preview için base64 kaydet, server yüklemeyi form submit'te yap
                        const reader = new FileReader();
                        reader.onload = () => {
                          const dataUrl = reader.result as string;
                          setFormValues({ ...formValues, checkImageFile: file, checkImageData: dataUrl, checkImageMimeType: file.type });
                        };
                        reader.readAsDataURL(file);
                      } catch (err) {
                        console.error('Read file error', err);
                        alert('Çek görseli okunamadı.');
                      }
                    }}
                    required={false}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="referenceNumber">Referans No</Label>
                  <Input
                    id="referenceNumber"
                    value={formValues.referenceNumber || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormValues({ ...formValues, referenceNumber: e.target.value || null })}
                    placeholder="Opsiyonel"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Açıklama</Label>
                  <Input
                    id="description"
                    value={formValues.description || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormValues({ ...formValues, description: e.target.value })}
                    placeholder="Opsiyonel"
                  />
                </div>
              </div>
            </div>
          ) : (
            // Diğer ödeme yöntemleri için mevcut tasarım
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
                <Input
                  type="text"
                  placeholder="gg.aa.yyyy"
                  value={formValues.dateInput ?? (formValues.date ? format(formValues.date, 'dd.MM.yyyy') : '')}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    let val = e.target.value.replace(/[^0-9]/g, ''); // Sadece rakamları al
                    if (val.length > 8) val = val.slice(0, 8);
                    // Noktalama: 2. ve 4. karakterden sonra otomatik ekle
                    if (val.length > 4) val = val.slice(0,2) + '.' + val.slice(2,4) + '.' + val.slice(4);
                    else if (val.length > 2) val = val.slice(0,2) + '.' + val.slice(2);
                    setFormValues((prev: PaymentFormValues) => ({ ...prev, dateInput: val }));
                    if (val.length === 10) {
                      const parsed = parse(val, 'dd.MM.yyyy', new Date());
                      if (isValid(parsed)) {
                        setFormValues((prev: PaymentFormValues) => ({ ...prev, date: parsed, dateInput: val }));
                      }
                    } else {
                      setFormValues((prev: PaymentFormValues) => ({ ...prev, date: undefined }));
                    }
                  }}
                  className="w-32"
                  maxLength={10}
                />
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
                <Label htmlFor="method">Ödeme Yöntemi</Label>
                <Select
                  value={formValues.method}
                  onValueChange={(value: PaymentFormValues['method']) => setFormValues({ ...formValues, method: value })}
                >
                  <SelectTrigger>
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
              <div className="grid gap-2">
                <Label htmlFor="referenceNumber">Referans No</Label>
                <Input
                  id="referenceNumber"
                  value={formValues.referenceNumber || ''}
                  onChange={(e) => setFormValues({ ...formValues, referenceNumber: e.target.value || null })}
                  placeholder="Opsiyonel"
                />
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
          )}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 