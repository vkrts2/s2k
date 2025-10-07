import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactHistoryItem } from "@/lib/types";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import type { ContactHistoryFormValues } from "@/lib/types";

interface ContactHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ContactHistoryFormValues) => Promise<void>;
  formValues: ContactHistoryFormValues;
  setFormValues: (values: ContactHistoryFormValues) => void;
  isEditing?: boolean;
}

const EMPTY_CONTACT_HISTORY_FORM_VALUES: ContactHistoryFormValues = {
  date: new Date(),
  type: 'phone',
  summary: '',
  notes: '',
};

export function ContactHistoryModal({
  isOpen,
  onClose,
  onSubmit,
  formValues,
  setFormValues,
  isEditing
}: ContactHistoryModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formValues);
    } catch (error) {
      console.error("Error submitting contact history form:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>İletişim Geçmişi {isEditing ? "Düzenle" : "Ekle"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date">Tarih</Label>
            <Input
              type="text"
              placeholder="gg.aa.yyyy"
              value={formValues.date ? format(formValues.date, "PPP") : ''}
              onChange={(e) => {
                try {
                  const dateValue = e.target.value;
                  if (dateValue) {
                    const newDate = new Date(dateValue);
                    if (!isNaN(newDate.getTime())) {
                      setFormValues({ ...formValues, date: newDate });
                    }
                  }
                } catch (error) {
                  console.error('Invalid date value:', e.target.value);
                }
              }}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">İletişim Tipi</Label>
            <Select
              value={formValues.type}
              onValueChange={(value: 'phone' | 'email' | 'meeting' | 'other') => setFormValues({ ...formValues, type: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="İletişim tipi seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Telefon</SelectItem>
                <SelectItem value="email">E-posta</SelectItem>
                <SelectItem value="meeting">Toplantı</SelectItem>
                <SelectItem value="other">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="summary" className="text-right">Özet</Label>
            <Input
              id="summary"
              value={formValues.summary}
              onChange={(e) => setFormValues({ ...formValues, summary: e.target.value })}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">Notlar</Label>
            <Textarea
              id="notes"
              value={formValues.notes || ''}
              onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
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