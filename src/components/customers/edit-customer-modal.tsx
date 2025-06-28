import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Customer } from "@/lib/types";
import React from "react";

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => Promise<void>;
  customer: Customer;
}

export function EditCustomerModal({
  isOpen,
  onClose,
  onSave,
  customer,
}: EditCustomerModalProps) {
  const [editedCustomer, setEditedCustomer] = React.useState<Customer>(customer);

  React.useEffect(() => {
    setEditedCustomer(customer);
  }, [customer]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Müşteri Düzenle</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(editedCustomer); }} className="space-y-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Ad Soyad</Label>
            <Input
              id="name"
              value={editedCustomer.name}
              onChange={(e) => setEditedCustomer({ ...editedCustomer, name: e.target.value })}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">E-posta</Label>
            <Input
              id="email"
              type="email"
              value={editedCustomer.email || ''}
              onChange={(e) => setEditedCustomer({ ...editedCustomer, email: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">Telefon</Label>
            <Input
              id="phone"
              type="tel"
              value={editedCustomer.phone || ''}
              onChange={(e) => setEditedCustomer({ ...editedCustomer, phone: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">Adres</Label>
            <Input
              id="address"
              value={editedCustomer.address || ''}
              onChange={(e) => setEditedCustomer({ ...editedCustomer, address: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="taxId" className="text-right">Vergi No</Label>
            <Input
              id="taxId"
              value={editedCustomer.taxId || ''}
              onChange={(e) => setEditedCustomer({ ...editedCustomer, taxId: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">Notlar</Label>
            <Input
              id="notes"
              value={editedCustomer.notes || ''}
              onChange={(e) => setEditedCustomer({ ...editedCustomer, notes: e.target.value })}
              className="col-span-3"
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