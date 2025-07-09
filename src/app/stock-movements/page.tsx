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

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'Giriş' | 'Çıkış';
  quantity: number;
  date: any; // Firebase Timestamp
  description?: string;
}

interface Product {
  id: string;
  name: string;
  quantity: number; // Current quantity in stock
}

export default function StockMovementsPage() {
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movementForm, setMovementForm] = useState({
    productId: '',
    productName: '',
    type: 'Giriş' as 'Giriş' | 'Çıkış',
    quantity: 0,
    date: new Date(),
    description: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStockMovements();
    fetchProducts();
  }, []);

  const fetchStockMovements = async () => {
    setLoading(true);
    try {
      const movementsCollection = collection(db, "stockMovements");
      const movementSnapshot = await getDocs(movementsCollection);
      const movementsList = movementSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StockMovement[];
      setStockMovements(movementsList.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()));
    } catch (error) {
      console.error("Stok hareketleri yüklenirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Stok hareketleri yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const productsCollection = collection(db, "products");
      const productSnapshot = await getDocs(productsCollection);
      const productsList = productSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        quantity: doc.data().quantity || 0, // Ensure quantity is number
      })) as Product[];
      setProducts(productsList);
    } catch (error) {
      console.error("Ürünler yüklenirken hata oluştu: ", error);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setMovementForm(prev => ({
      ...prev,
      [id]: id === 'quantity' ? Number(value) : value
    }));
  };

  const handleProductSelect = (selectedProductId: string) => {
    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (selectedProduct) {
      setMovementForm(prev => ({
        ...prev,
        productId: selectedProductId,
        productName: selectedProduct.name,
      }));
    } else {
      setMovementForm(prev => ({
        ...prev,
        productId: '',
        productName: '',
      }));
    }
  };

  const handleTypeSelect = (selectedType: 'Giriş' | 'Çıkış') => {
    setMovementForm(prev => ({ ...prev, type: selectedType }));
  };

  const handleSaveMovement = async () => {
    try {
      const dataToSave = { ...movementForm, date: new Date() };

      const productRef = doc(db, "products", dataToSave.productId);
      const productDoc = await getDocs(collection(db, "products"));
      const currentProduct = productDoc.docs.find(d => d.id === dataToSave.productId)?.data() as Product;

      if (!currentProduct) {
        toast({
          title: "Hata",
          description: "Ürün bulunamadı.",
          variant: "destructive",
        });
        return;
      }

      let newQuantity = currentProduct.quantity;
      if (dataToSave.type === 'Giriş') {
        newQuantity += dataToSave.quantity;
      } else if (dataToSave.type === 'Çıkış') {
        if (newQuantity < dataToSave.quantity) {
          toast({
            title: "Hata",
            description: "Stokta yeterli ürün bulunmuyor.",
            variant: "destructive",
          });
          return;
        }
        newQuantity -= dataToSave.quantity;
      }

      await updateDoc(productRef, { quantity: newQuantity });
      await addDoc(collection(db, "stockMovements"), dataToSave);

      toast({
        title: "Başarılı",
        description: "Stok hareketi başarıyla kaydedildi ve ürün miktarı güncellendi.",
      });
      setIsModalOpen(false);
      setMovementForm({
        productId: '',
        productName: '',
        type: 'Giriş',
        quantity: 0,
        date: new Date(),
        description: '',
      });
      fetchStockMovements();
      fetchProducts(); // Refresh product list to show updated quantities
    } catch (error) {
      console.error("Stok hareketi kaydedilirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Stok hareketi kaydedilirken bir hata oluştu.",
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
        <h2 className="text-3xl font-bold tracking-tight">Stok Hareketleri</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setMovementForm({
                productId: '',
                productName: '',
                type: 'Giriş',
                quantity: 0,
                date: new Date(),
                description: '',
              });
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Stok Hareketi Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Yeni Stok Hareketi Ekle</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="productId" className="text-right">Ürün</Label>
                <Select value={movementForm.productId} onValueChange={handleProductSelect}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Ürün Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (Mevcut: {product.quantity})
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
                    <SelectItem value="Giriş">Giriş</SelectItem>
                    <SelectItem value="Çıkış">Çıkış</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">Miktar</Label>
                <Input id="quantity" type="number" value={movementForm.quantity} onChange={handleFormChange} className="col-span-3" />
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
          <CardTitle>Stok Hareketleri Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead>Açıklama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Stok hareketi bulunamadı.</TableCell>
                </TableRow>
              ) : (
                stockMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{format(movement.date.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}</TableCell>
                    <TableCell>{movement.productName}</TableCell>
                    <TableCell>{movement.type === 'Giriş' ? <ArrowUpCircle className="h-4 w-4 text-green-500 inline-block mr-1" /> : <ArrowDownCircle className="h-4 w-4 text-red-500 inline-block mr-1" />} {movement.type}</TableCell>
                    <TableCell className="text-right">{movement.quantity}</TableCell>
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