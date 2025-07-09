import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Supplier } from '@/lib/types';

interface EditSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier;
  onSave: (supplier: Supplier) => Promise<void>;
}

export function EditSupplierModal({
  isOpen,
  onClose,
  supplier,
  onSave,
}: EditSupplierModalProps) {
  const [formValues, setFormValues] = React.useState({
    name: supplier.name,
    email: supplier.email || '',
    phone: supplier.phone || '',
    address: supplier.address || '',
    taxNumber: supplier.taxNumber || '',
    taxOffice: supplier.taxOffice || '',
    notes: supplier.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...supplier,
      ...formValues,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tedarikçi Düzenle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tedarikçi Adı</Label>
              <Input
                id="name"
                value={formValues.name}
                onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={formValues.email}
                onChange={(e) => setFormValues({ ...formValues, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                value={formValues.phone}
                onChange={(e) => setFormValues({ ...formValues, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                value={formValues.address}
                onChange={(e) => setFormValues({ ...formValues, address: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="taxNumber">Vergi Numarası</Label>
              <Input
                id="taxNumber"
                value={formValues.taxNumber}
                onChange={(e) => setFormValues({ ...formValues, taxNumber: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="taxOffice">Vergi Dairesi</Label>
              <Input
                id="taxOffice"
                value={formValues.taxOffice}
                onChange={(e) => setFormValues({ ...formValues, taxOffice: e.target.value })}
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