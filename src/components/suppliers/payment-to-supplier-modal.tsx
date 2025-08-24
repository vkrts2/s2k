import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parse, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import type { Currency, PaymentToSupplierFormValues } from '@/lib/types';

const paymentFormSchema = z.object({
  amount: z.string().min(1, 'Tutar zorunludur'),
  date: z.date().optional(),
  dateInput: z.string().optional(),
  currency: z.enum(['TRY','USD','EUR']),
  method: z.string().min(1, 'Ödeme yöntemi zorunludur'),
  referenceNumber: z.string().nullable().optional(),
  description: z.string().optional(),
  checkDate: z.date().nullable().optional(),
  checkSerialNumber: z.string().nullable().optional(),
});

interface PaymentToSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: PaymentToSupplierFormValues) => Promise<void>;
  initialData?: Partial<PaymentToSupplierFormValues>;
}

export function PaymentToSupplierModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: PaymentToSupplierModalProps) {
  const form = useForm<PaymentToSupplierFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: initialData || {
      amount: '',
      date: undefined,
      dateInput: '',
      currency: 'TRY' as Currency,
      method: 'nakit',
      referenceNumber: null,
      description: '',
      checkDate: null,
      checkSerialNumber: null,
    },
  });

  const handleSubmit = async (data: PaymentToSupplierFormValues) => {
    await onSubmit(data);
    form.reset();
  };

  React.useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ödeme Ekle</DialogTitle>
          <DialogDescription>Yeni bir ödeme işlemi ekleyin veya mevcut bir ödemeyi düzenleyin.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tutar</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tarih</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="gg.aa.yyyy"
                      value={form.watch('dateInput') ?? (field.value ? format(field.value, 'dd.MM.yyyy') : '')}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length > 8) val = val.slice(0, 8);
                        if (val.length > 4) val = val.slice(0,2) + '.' + val.slice(2,4) + '.' + val.slice(4);
                        else if (val.length > 2) val = val.slice(0,2) + '.' + val.slice(2);
                        form.setValue('dateInput', val);
                        if (val.length === 10) {
                          const parsed = parse(val, 'dd.MM.yyyy', new Date());
                          if (isValid(parsed)) {
                            field.onChange(parsed);
                          }
                        } else {
                          field.onChange(undefined);
                        }
                      }}
                      className="w-32"
                      maxLength={10}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Para Birimi</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Para birimi seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRY">TRY</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ödeme Yöntemi</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Ödeme yöntemi seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nakit">Nakit</SelectItem>
                        <SelectItem value="krediKarti">Kredi Kartı</SelectItem>
                        <SelectItem value="havale">Havale/EFT</SelectItem>
                        <SelectItem value="cek">Çek</SelectItem>
                        <SelectItem value="diger">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referans No</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 