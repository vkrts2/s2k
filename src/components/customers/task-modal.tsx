import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskFormValues } from '@/lib/types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formValues: TaskFormValues) => Promise<void>;
  formValues: TaskFormValues;
  setFormValues: (values: TaskFormValues) => void;
  isEditing?: boolean;
}

export function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  formValues,
  setFormValues,
  isEditing
}: TaskModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formValues);
    } catch (error) {
      console.error("Error submitting task form:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Görev {isEditing ? "Düzenle" : "Ekle"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="description">Açıklama</Label>
            <Input
              id="description"
              value={formValues.description}
              onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Durum</Label>
            <Select
              value={formValues.status}
              onValueChange={(value: 'pending' | 'completed' | 'in-progress') =>
                setFormValues({ ...formValues, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Durum seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Beklemede</SelectItem>
                <SelectItem value="in-progress">Devam Ediyor</SelectItem>
                <SelectItem value="completed">Tamamlandı</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dueDate">Son Tarih (Opsiyonel)</Label>
            <Input
              type="text"
              placeholder="gg.aa.yyyy"
              value={formValues.dueDate ? format(formValues.dueDate, "PPP", { locale: tr }) : ""}
              onChange={(e) => {
                try {
                  const dateValue = e.target.value;
                  if (dateValue) {
                    const newDate = new Date(dateValue);
                    if (!isNaN(newDate.getTime())) {
                      setFormValues({ ...formValues, dueDate: newDate });
                    }
                  } else {
                    setFormValues({ ...formValues, dueDate: undefined });
                  }
                } catch (error) {
                  console.error('Invalid date value:', e.target.value);
                }
              }}
                />
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" className="ml-2">
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 