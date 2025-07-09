"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Purchase {
  id: string;
  supplierName: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  date: any; // Firebase Timestamp
  description?: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  unitPrice: number;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPurchase, setCurrentPurchase] = useState<Purchase | null>(null);
  const [purchaseForm, setPurchaseForm] = useState({
    supplierName: '',
    productName: '',
    quantity: 0,
    unitPrice: 0,
    totalAmount: 0,
    date: new Date(),
    description: '',
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const purchasesCollection = collection(db, "purchases");
      const purchaseSnapshot = await getDocs(purchasesCollection);
      const purchasesList = purchaseSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Purchase[];
      setPurchases(purchasesList);
    } catch (error) {
      console.error("Alışlar yüklenirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Alışlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const suppliersCollection = collection(db, "suppliers");
      const supplierSnapshot = await getDocs(suppliersCollection);
      const suppliersList = supplierSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      })) as Supplier[];
      setSuppliers(suppliersList);
    } catch (error) {
      console.error("Tedarikçiler yüklenirken hata oluştu: ", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const productsCollection = collection(db, "products");
      const productSnapshot = await getDocs(productsCollection);
      const productsList = productSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        unitPrice: doc.data().unitPrice,
      })) as Product[];
      setProducts(productsList);
    } catch (error) {
      console.error("Ürünler yüklenirken hata oluştu: ", error);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setPurchaseForm(prev => {
      const newForm = {
        ...prev,
        [id]: id === 'quantity' || id === 'unitPrice' ? Number(value) : value
      };

      if (id === 'quantity' || id === 'unitPrice') {
        newForm.totalAmount = newForm.quantity * newForm.unitPrice;
      }
      return newForm;
    });
  };

  const handleProductSelect = (selectedProductName: string) => {
    const selectedProduct = products.find(p => p.name === selectedProductName);
    if (selectedProduct) {
      setPurchaseForm(prev => ({
        ...prev,
        productName: selectedProductName,
        unitPrice: selectedProduct.unitPrice,
        totalAmount: prev.quantity * selectedProduct.unitPrice,
      }));
    } else {
      setPurchaseForm(prev => ({
        ...prev,
        productName: selectedProductName,
        unitPrice: 0,
        totalAmount: 0,
      }));
    }
  };

  const handleSupplierSelect = (selectedSupplierName: string) => {
    setPurchaseForm(prev => ({ ...prev, supplierName: selectedSupplierName }));
  };

  const handleSavePurchase = async () => {
    try {
      const dataToSave = { ...purchaseForm, date: new Date() }; // Ensure date is a Date object for Firestore Timestamp

      if (currentPurchase) {
        // Update purchase
        const purchaseRef = doc(db, "purchases", currentPurchase.id);
        await updateDoc(purchaseRef, dataToSave);
        toast({
          title: "Başarılı",
          description: "Alış başarıyla güncellendi.",
        });
      } else {
        // Add new purchase
        await addDoc(collection(db, "purchases"), dataToSave);
        toast({
          title: "Başarılı",
          description: "Alış başarıyla eklendi.",
        });
      }
      setIsModalOpen(false);
      setPurchaseForm({
        supplierName: '',
        productName: '',
        quantity: 0,
        unitPrice: 0,
        totalAmount: 0,
        date: new Date(),
        description: '',
      });
      fetchPurchases();
    } catch (error) {
      console.error("Alış kaydedilirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Alış kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (purchase: Purchase) => {
    setCurrentPurchase(purchase);
    setPurchaseForm({
      supplierName: purchase.supplierName,
      productName: purchase.productName,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      totalAmount: purchase.totalAmount,
      date: purchase.date.toDate(), // Convert Firestore Timestamp to Date object
      description: purchase.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDeletePurchase = async (id: string) => {
    try {
      await deleteDoc(doc(db, "purchases", id));
      toast({
        title: "Başarılı",
        description: "Alış başarıyla silindi.",
      });
      fetchPurchases();
    } catch (error) {
      console.error("Alış silinirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Alış silinirken bir hata oluştu.",
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
        <h2 className="text-3xl font-bold tracking-tight">Alışlar</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setCurrentPurchase(null);
              setPurchaseForm({
                supplierName: '',
                productName: '',
                quantity: 0,
                unitPrice: 0,
                totalAmount: 0,
                date: new Date(),
                description: '',
              });
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Alış Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{currentPurchase ? "Alışı Düzenle" : "Yeni Alış Ekle"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="supplierName" className="text-right">Tedarikçi</Label>
                <Select value={purchaseForm.supplierName} onValueChange={handleSupplierSelect}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Tedarikçi Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.name}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="productName" className="text-right">Ürün</Label>
                <Select value={purchaseForm.productName} onValueChange={handleProductSelect}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Ürün Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.name}>
                        {product.name} ({product.unitPrice.toLocaleString('tr-TR')} ₺)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">Miktar</Label>
                <Input id="quantity" type="number" value={purchaseForm.quantity} onChange={handleFormChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unitPrice" className="text-right">Birim Fiyat</Label>
                <Input id="unitPrice" type="number" value={purchaseForm.unitPrice} onChange={handleFormChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="totalAmount" className="text-right">Toplam Tutar</Label>
                <Input id="totalAmount" type="number" value={purchaseForm.totalAmount} className="col-span-3" disabled />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Açıklama</Label>
                <Input id="description" value={purchaseForm.description} onChange={handleFormChange} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleSavePurchase}>Kaydet</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alış Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Tedarikçi</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead className="text-right">Birim Fiyat</TableHead>
                <TableHead className="text-right">Toplam Tutar</TableHead>
                <TableHead className="text-center">Aksiyonlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Alış bulunamadı.</TableCell>
                </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>{format(purchase.date.toDate(), 'dd MMMM yyyy', { locale: tr })}</TableCell>
                    <TableCell>{purchase.supplierName}</TableCell>
                    <TableCell>{purchase.productName}</TableCell>
                    <TableCell className="text-right">{purchase.quantity}</TableCell>
                    <TableCell className="text-right">{purchase.unitPrice.toLocaleString('tr-TR')} ₺</TableCell>
                    <TableCell className="text-right">{purchase.totalAmount.toLocaleString('tr-TR')} ₺</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(purchase)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeletePurchase(purchase.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
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