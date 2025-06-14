import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContactHistoryFormValues, ContactHistoryItem } from '@/lib/types';

interface ContactHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formValues: ContactHistoryFormValues) => Promise<void>;
  formValues: ContactHistoryFormValues;
  setFormValues: (values: ContactHistoryFormValues) => void;
  editingContactHistoryItem: ContactHistoryItem | null;
}

export function ContactHistoryModal({
  isOpen,
  onClose,
  onSubmit,
  formValues,
  setFormValues,
  editingContactHistoryItem,
}: ContactHistoryModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formValues);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>İletişim Geçmişi Ekle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
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
              <Label htmlFor="type">İletişim Türü</Label>
              <Select
                value={formValues.type}
                onValueChange={(value: 'phone' | 'email' | 'meeting' | 'other') => setFormValues({ ...formValues, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="İletişim türü seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Telefon</SelectItem>
                  <SelectItem value="email">E-posta</SelectItem>
                  <SelectItem value="meeting">Toplantı</SelectItem>
                  <SelectItem value="other">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="summary">Özet</Label>
              <Input
                id="summary"
                value={formValues.summary}
                onChange={(e) => setFormValues({ ...formValues, summary: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                value={formValues.notes}
                onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
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