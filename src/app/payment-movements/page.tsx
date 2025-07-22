"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaymentMovement {
  id: string;
  partyId: string;
  partyName: string;
  partyType: 'Müşteri' | 'Tedarikçi';
  type: 'Gelen' | 'Giden';
  amount: number;
  paymentMethod: string;
  date: any; // Firebase Timestamp
  description?: string;
}

interface Party {
  id: string;
  name: string;
}

export default function PaymentMovementsPage() {
  const [paymentMovements, setPaymentMovements] = useState<PaymentMovement[]>([]);
  const [customers, setCustomers] = useState<Party[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movementForm, setMovementForm] = useState({
    partyId: '',
    partyName: '',
    partyType: 'Müşteri' as 'Müşteri' | 'Tedarikçi',
    type: 'Gelen' as 'Gelen' | 'Giden',
    amount: 0,
    paymentMethod: '',
    date: new Date(),
    description: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentMovements();
    fetchParties();
  }, []);

  const fetchPaymentMovements = async () => {
    setLoading(true);
    try {
      const movementsCollection = collection(db, "paymentMovements");
      const movementSnapshot = await getDocs(movementsCollection);
      const movementsList = movementSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentMovement[];
      setPaymentMovements(movementsList.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()));
    } catch (error) {
      console.error("Ödeme hareketleri yüklenirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Ödeme hareketleri yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchParties = async () => {
    try {
      const customersCollection = collection(db, "customers");
      const customerSnapshot = await getDocs(customersCollection);
      const customersList = customerSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })) as Party[];
      setCustomers(customersList);

      const suppliersCollection = collection(db, "suppliers");
      const supplierSnapshot = await getDocs(suppliersCollection);
      const suppliersList = supplierSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })) as Party[];
      setSuppliers(suppliersList);
    } catch (error) {
      console.error("Taraflar (müşteri/tedarikçi) yüklenirken hata oluştu: ", error);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setMovementForm(prev => ({
      ...prev,
      [id]: id === 'amount' ? Number(value) : value
    }));
  };

  const handlePartyTypeSelect = (selectedPartyType: 'Müşteri' | 'Tedarikçi') => {
    setMovementForm(prev => ({
      ...prev,
      partyType: selectedPartyType,
      partyId: '',
      partyName: '',
    }));
  };

  const handlePartySelect = (selectedPartyId: string) => {
    const parties = movementForm.partyType === 'Müşteri' ? customers : suppliers;
    const selectedParty = parties.find(p => p.id === selectedPartyId);
    if (selectedParty) {
      setMovementForm(prev => ({
        ...prev,
        partyId: selectedPartyId,
        partyName: selectedParty.name,
      }));
    } else {
      setMovementForm(prev => ({
        ...prev,
        partyId: '',
        partyName: '',
      }));
    }
  };

  const handleTypeSelect = (selectedType: 'Gelen' | 'Giden') => {
    setMovementForm(prev => ({ ...prev, type: selectedType }));
  };

  const handlePaymentMethodSelect = (selectedMethod: string) => {
    setMovementForm(prev => ({ ...prev, paymentMethod: selectedMethod }));
  };

  const handleSaveMovement = async () => {
    try {
      const dataToSave = { ...movementForm, date: new Date() };

      // Save the payment movement
      await addDoc(collection(db, "paymentMovements"), dataToSave);

      // Update party balance (simplified for now - actual balance updates need to be more robust)
      const partyCollection = dataToSave.partyType === 'Müşteri' ? "customers" : "suppliers";
      const partyRef = doc(db, partyCollection, dataToSave.partyId);
      // In a real application, you would read the current balance, calculate new balance and then update.
      // For now, we'll just log a message or assume balance update is handled elsewhere.
      console.log(`Updating balance for ${dataToSave.partyName} (${dataToSave.partyType}): ${dataToSave.type} ${dataToSave.amount}`);

      toast({
        title: "Başarılı",
        description: "Ödeme hareketi başarıyla kaydedildi.",
      });
      setIsModalOpen(false);
      setMovementForm({
        partyId: '',
        partyName: '',
        partyType: 'Müşteri',
        type: 'Gelen',
        amount: 0,
        paymentMethod: '',
        date: new Date(),
        description: '',
      });
      fetchPaymentMovements();
      fetchParties(); // Refresh party lists for updated balances
    } catch (error) {
      console.error("Ödeme hareketi kaydedilirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Ödeme hareketi kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Ödeme Hareketleri</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setMovementForm({
                partyId: '',
                partyName: '',
                partyType: 'Müşteri',
                type: 'Gelen',
                amount: 0,
                paymentMethod: '',
                date: new Date(),
                description: '',
              });
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Ödeme Hareketi Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Yeni Ödeme Hareketi Ekle</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="partyType" className="text-right">Taraf Tipi</Label>
                <Select value={movementForm.partyType} onValueChange={handlePartyTypeSelect}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Taraf Tipi Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Müşteri">Müşteri</SelectItem>
                    <SelectItem value="Tedarikçi">Tedarikçi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="partyId" className="text-right">{movementForm.partyType}</Label>
                <Select value={movementForm.partyId} onValueChange={handlePartySelect}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={`${movementForm.partyType} Seçin`} />
                  </SelectTrigger>
                  <SelectContent>
                    {(movementForm.partyType === 'Müşteri' ? customers : suppliers).map((party) => (
                      <SelectItem key={party.id} value={party.id}>
                        {party.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Hareket Tipi</Label>
                <Select value={movementForm.type} onValueChange={handleTypeSelect}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Tip Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gelen">Gelen</SelectItem>
                    <SelectItem value="Giden">Giden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Tutar</Label>
                <Input id="amount" type="number" value={movementForm.amount} onChange={handleFormChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentMethod" className="text-right">Ödeme Yöntemi</Label>
                <Select value={movementForm.paymentMethod} onValueChange={handlePaymentMethodSelect}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Ödeme Yöntemi Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nakit">Nakit</SelectItem>
                    <SelectItem value="Banka Havalesi">Banka Havalesi</SelectItem>
                    <SelectItem value="Kredi Kartı">Kredi Kartı</SelectItem>
                    <SelectItem value="Çek">Çek</SelectItem>
                    <SelectItem value="Diğer">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Açıklama</Label>
                <Input id="description" value={movementForm.description} onChange={handleFormChange} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleSaveMovement}>Kaydet</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ödeme Hareketleri Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Taraf Tipi</TableHead>
                <TableHead>Taraf Adı</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Yöntem</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Açıklama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Ödeme hareketi bulunamadı.</TableCell>
                </TableRow>
              ) : (
                paymentMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{format(movement.date.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}</TableCell>
                    <TableCell>{movement.partyType}</TableCell>
                    <TableCell>{movement.partyName}</TableCell>
                    <TableCell>{movement.type === 'Gelen' ? <ArrowUpCircle className="h-4 w-4 text-green-500 inline-block mr-1" /> : <ArrowDownCircle className="h-4 w-4 text-red-500 inline-block mr-1" />} {movement.type}</TableCell>
                    <TableCell>{movement.paymentMethod}</TableCell>
                    <TableCell className="text-right">{movement.amount.toLocaleString('tr-TR')} ₺</TableCell>
                    <TableCell>{movement.description}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 