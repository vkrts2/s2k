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
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { getPurchases, getSales, getStockItems } from "@/lib/storage";
import type { Purchase, Sale, StockItem } from "@/lib/types";

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
  const { user } = useAuth();

  // Purchased but never sold list state
  const [purchasedNotSold, setPurchasedNotSold] = useState<{
    stockItemId: string;
    productName: string;
    totalPurchased: number;
    lastPurchaseDate: string | null;
  }[]>([]);

  useEffect(() => {
    fetchStockMovements();
    fetchProducts();
  }, []);

  useEffect(() => {
    // Compute purchased but never sold after auth available
    if (!user) return;
    (async () => {
      try {
        const [purchases, sales, stockItems] = await Promise.all([
          getPurchases(user.uid),
          getSales(user.uid),
          getStockItems(user.uid),
        ]);

        // Build maps for quantities
        const nameById: Record<string, string> = Object.fromEntries(
          (stockItems as StockItem[]).map(si => [si.id, si.name])
        );

        const purchasedQtyById: Record<string, { qty: number; lastDate: string | null }> = {};
        (purchases as Purchase[]).forEach(p => {
          const sid = p.stockItemId;
          const qty = p.quantityPurchased ?? null;
          if (!sid || !qty || qty <= 0) return;
          const d = p.date;
          if (!purchasedQtyById[sid]) {
            purchasedQtyById[sid] = { qty: 0, lastDate: null };
          }
          purchasedQtyById[sid].qty += qty;
          // Track last purchase date (max)
          try {
            const prev = purchasedQtyById[sid].lastDate;
            if (!prev || (new Date(d).getTime() > new Date(prev).getTime())) {
              purchasedQtyById[sid].lastDate = d;
            }
          } catch {}
        });

        const soldQtyById: Record<string, number> = {};
        (sales as Sale[]).forEach(s => {
          const sid = s.stockItemId ?? null;
          const qty = s.quantity ?? null;
          if (!sid || !qty || qty <= 0) return;
          soldQtyById[sid] = (soldQtyById[sid] || 0) + qty;
        });

        const result = Object.entries(purchasedQtyById)
          .filter(([sid, v]) => v.qty > 0 && (!soldQtyById[sid] || soldQtyById[sid] === 0))
          .map(([sid, v]) => ({
            stockItemId: sid,
            productName: nameById[sid] || 'Bilinmeyen Ürün',
            totalPurchased: v.qty,
            lastPurchaseDate: v.lastDate ?? null,
          }))
          // sort by last purchase desc
          .sort((a, b) => {
            const da = a.lastPurchaseDate ? new Date(a.lastPurchaseDate).getTime() : 0;
            const db = b.lastPurchaseDate ? new Date(b.lastPurchaseDate).getTime() : 0;
            return db - da;
          });

        setPurchasedNotSold(result);
      } catch (e) {
        console.error('Satın alınıp satılmamış ürünler hesaplanırken hata:', e);
      }
    })();
  }, [user]);

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

      <Card>
        <CardHeader>
          <CardTitle>Satın Alınmış Ama Satılmamış Ürünler</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün</TableHead>
                <TableHead className="text-right">Alınan Toplam Miktar</TableHead>
                <TableHead>Son Alış Tarihi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchasedNotSold.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">Kayıt bulunamadı.</TableCell>
                </TableRow>
              ) : (
                purchasedNotSold.map(item => (
                  <TableRow key={item.stockItemId}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-right">{item.totalPurchased}</TableCell>
                    <TableCell>{item.lastPurchaseDate ? format(parseISO(item.lastPurchaseDate), 'dd MMMM yyyy', { locale: tr }) : '-'}</TableCell>
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