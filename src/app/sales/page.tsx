"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';
import { getCustomers } from '@/lib/storage';
import { storageDeleteSale } from '@/lib/storage';
import BackToHomeButton from '@/components/common/back-to-home-button';

interface Sale {
  id: string;
  customerName: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  date: any; // Firebase Timestamp
  description?: string;
  userId?: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  unitPrice: number;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [saleForm, setSaleForm] = useState({
    customerName: '',
    productName: '',
    quantity: 0,
    unitPrice: 0,
    totalAmount: 0,
    date: new Date(),
    description: '',
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchSales();
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      if (!user?.uid) {
        setSales([]);
        setLoading(false);
        return;
      }
      const salesCollection = collection(db, "sales");
      const salesQuery = query(salesCollection, where("userId", "==", user.uid));
      const saleSnapshot = await getDocs(salesQuery);
      const salesList = saleSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sale[];
      setSales(salesList);
    } catch (error) {
      console.error("Satışlar yüklenirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Satışlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const customersCollection = collection(db, "customers");
      const customerSnapshot = await getDocs(customersCollection);
      const customersList = customerSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      })) as Customer[];
      setCustomers(customersList);
    } catch (error) {
      console.error("Müşteriler yüklenirken hata oluştu: ", error);
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
    setSaleForm(prev => {
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
      setSaleForm(prev => ({
        ...prev,
        productName: selectedProductName,
        unitPrice: selectedProduct.unitPrice,
        totalAmount: prev.quantity * selectedProduct.unitPrice,
      }));
    } else {
      setSaleForm(prev => ({
        ...prev,
        productName: selectedProductName,
        unitPrice: 0,
        totalAmount: 0,
      }));
    }
  };

  const handleCustomerSelect = (selectedCustomerName: string) => {
    setSaleForm(prev => ({ ...prev, customerName: selectedCustomerName }));
  };

  const handleSaveSale = async () => {
    try {
      const dataToSave = { ...saleForm, date: new Date(), userId: user?.uid };

      if (currentSale) {
        // Update sale
        const saleRef = doc(db, "sales", currentSale.id);
        await updateDoc(saleRef, dataToSave);
        toast({
          title: "Başarılı",
          description: "Satış başarıyla güncellendi.",
        });
      } else {
        // Add new sale
        await addDoc(collection(db, "sales"), dataToSave);
        toast({
          title: "Başarılı",
          description: "Satış başarıyla eklendi.",
        });
      }
      setIsModalOpen(false);
      setSaleForm({
        customerName: '',
        productName: '',
        quantity: 0,
        unitPrice: 0,
        totalAmount: 0,
        date: new Date(),
        description: '',
      });
      fetchSales();
    } catch (error) {
      console.error("Satış kaydedilirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Satış kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (sale: Sale) => {
    setCurrentSale(sale);
    setSaleForm({
      customerName: sale.customerName,
      productName: sale.productName,
      quantity: sale.quantity,
      unitPrice: sale.unitPrice,
      totalAmount: sale.totalAmount,
      date: sale.date.toDate(), // Convert Firestore Timestamp to Date object
      description: sale.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteSale = async (id: string) => {
    try {
      if (!user?.uid) {
        toast({
          title: "Hata",
          description: "Kullanıcı oturumu bulunamadı.",
          variant: "destructive",
        });
        return;
      }
      await storageDeleteSale(user.uid, id);
      toast({
        title: "Başarılı",
        description: "Satış başarıyla silindi.",
      });
      fetchSales();
    } catch (error) {
      console.error("Satış silinirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Satış silinirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  // Arama filtresi
  const filteredSales = sales.filter(sale =>
    sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sayfalama
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Sayfa değişince başa dön
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <h2 className="text-3xl font-bold tracking-tight">Satışlar</h2>
          <Input
            placeholder="Müşteri, ürün veya açıklama ara..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setCurrentSale(null);
                setSaleForm({
                  customerName: '',
                  productName: '',
                  quantity: 0,
                  unitPrice: 0,
                  totalAmount: 0,
                  date: new Date(),
                  description: '',
                });
              }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Satış Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{currentSale ? "Satışı Düzenle" : "Yeni Satış Ekle"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="customerName" className="text-right">Müşteri</Label>
                  <Select value={saleForm.customerName} onValueChange={handleCustomerSelect}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Müşteri Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.name}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="productName" className="text-right">Ürün</Label>
                  <Select value={saleForm.productName} onValueChange={handleProductSelect}>
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
                  <Input id="quantity" type="number" value={saleForm.quantity} onChange={handleFormChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="unitPrice" className="text-right">Birim Fiyat</Label>
                  <Input id="unitPrice" type="number" value={saleForm.unitPrice} onChange={handleFormChange} className="col-span-3" disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="totalAmount" className="text-right">Toplam Tutar</Label>
                  <Input id="totalAmount" type="number" value={saleForm.totalAmount} className="col-span-3" disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">Açıklama</Label>
                  <Input id="description" value={saleForm.description} onChange={handleFormChange} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleSaveSale}>Kaydet</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Satış Listesi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead className="text-right">Birim Fiyat</TableHead>
                    <TableHead className="text-right">Toplam Tutar</TableHead>
                    <TableHead className="text-center">Aksiyonlar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Satış bulunamadı.</TableCell>
                    </TableRow>
                  ) : (
                    paginatedSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{format(sale.date.toDate(), 'dd MMMM yyyy', { locale: tr })}</TableCell>
                        <TableCell>{sale.customerName}</TableCell>
                        <TableCell>{sale.productName}</TableCell>
                        <TableCell className="text-right">{sale.quantity}</TableCell>
                        <TableCell className="text-right">{sale.unitPrice.toLocaleString('tr-TR')} ₺</TableCell>
                        <TableCell className="text-right">{sale.totalAmount.toLocaleString('tr-TR')} ₺</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => handleEditClick(sale)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteSale(sale.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="mx-2">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 