"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from 'next/navigation';
import { PlusCircle, MinusCircle } from 'lucide-react';
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number; // Current stock quantity
}

interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export default function CreateInvoicePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Generate a simple invoice number based on date and time
    const now = new Date();
    const formattedDate = format(now, 'yyyyMMddHHmmss');
    setInvoiceNumber(`INV-${formattedDate}`);
  }, []);

  const fetchData = async () => {
    try {
      const customersCollection = collection(db, "customers");
      const customerSnapshot = await getDocs(customersCollection);
      setCustomers(customerSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Customer)));

      const productsCollection = collection(db, "products");
      const productSnapshot = await getDocs(productsCollection);
      setProducts(productSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        price: doc.data().price || 0,
        quantity: doc.data().quantity || 0, // current stock
      })) as Product[]);
    } catch (error) {
      console.error("Veriler yüklenirken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Müşteri ve ürün verileri yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { productId: '', productName: '', quantity: 0, price: 0, total: 0 }]);
  };

  const handleRemoveInvoiceItem = (index: number) => {
    const newItems = invoiceItems.filter((_, i) => i !== index);
    setInvoiceItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...invoiceItems];
    const currentItem = newItems[index];

    if (field === 'productId') {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        currentItem.productId = value;
        currentItem.productName = selectedProduct.name;
        currentItem.price = selectedProduct.price;
        currentItem.total = currentItem.quantity * selectedProduct.price;
      }
    } else if (field === 'quantity') {
      const quantity = Number(value);
      const productInStock = products.find(p => p.id === currentItem.productId);
      if (productInStock && quantity > productInStock.quantity) {
        toast({
          title: "Stok Uyarısı",
          description: `Seçilen ürün için yeterli stok bulunmuyor. Mevcut: ${productInStock.quantity}`,
        });
        currentItem.quantity = productInStock.quantity; // Limit to available stock
      } else {
        currentItem.quantity = quantity;
      }
      currentItem.total = currentItem.quantity * currentItem.price;
    } else if (field === 'price') {
      currentItem.price = Number(value);
      currentItem.total = currentItem.quantity * currentItem.price;
    }
    setInvoiceItems(newItems);
  };

  const calculateTotalAmount = () => {
    return invoiceItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSaveInvoice = async () => {
    if (!customerId || invoiceItems.length === 0 || invoiceItems.some(item => !item.productId || item.quantity <= 0 || item.price <= 0)) {
      toast({
        title: "Hata",
        description: "Lütfen tüm zorunlu alanları doldurun ve geçerli ürünler ekleyin.",
        variant: "destructive",
      });
      return;
    }

    try {
      const totalAmount = calculateTotalAmount();
      const invoiceData = {
        invoiceNumber,
        customerId,
        customerName: customers.find(c => c.id === customerId)?.name || customerName,
        date: new Date(),
        invoiceItems: invoiceItems.map(({ productId, productName, quantity, price, total }) => ({
          productId,
          productName,
          quantity,
          price,
          total,
        })),
        totalAmount,
        description,
        status: 'Ödenmedi', // Default status
      };

      await addDoc(collection(db, "invoices"), invoiceData);

      // Optionally update product quantities in stock
      for (const item of invoiceItems) {
        const productRef = doc(db, "products", item.productId);
        const currentProduct = products.find(p => p.id === item.productId);
        if (currentProduct) {
          const newQuantity = currentProduct.quantity - item.quantity;
          // Here, you would typically use a transaction to ensure atomicity for stock updates.
          // For simplicity, direct update is used.
          await updateDoc(productRef, { quantity: newQuantity });
        }
      }

      toast({
        title: "Başarılı",
        description: "Fatura başarıyla oluşturuldu.",
      });
      router.push('/invoices');
    } catch (error) {
      console.error("Fatura oluşturulurken hata oluştu: ", error);
      toast({
        title: "Hata",
        description: "Fatura oluşturulurken bir hata oluştu.",
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
        <h2 className="text-3xl font-bold tracking-tight">Yeni Fatura Oluştur</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fatura Detayları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invoiceNumber" className="text-right">Fatura No</Label>
              <Input id="invoiceNumber" value={invoiceNumber} readOnly className="col-span-3 bg-gray-100" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer" className="text-right">Müşteri</Label>
              <Select value={customerId} onValueChange={(value) => {
                setCustomerId(value);
                setCustomerName(customers.find(c => c.id === value)?.name || '');
              }}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Müşteri Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-4">Ürünler</h3>
            {invoiceItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 border p-4 rounded-md relative">
                <Button
                  variant="destructive" size="sm"
                  onClick={() => handleRemoveInvoiceItem(index)}
                  className="absolute top-2 right-2"
                >
                  <MinusCircle className="h-4 w-4" />
                </Button>
                <div className="col-span-2">
                  <Label>Ürün</Label>
                  <Select value={item.productId} onValueChange={(value) => handleItemChange(index, 'productId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ürün Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (Stok: {product.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Miktar</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    min="1"
                  />
                </div>
                <div>
                  <Label>Birim Fiyat</Label>
                  <Input
                    type="number"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-span-1">
                  <Label>Toplam</Label>
                  <Input type="text" value={item.total.toLocaleString('tr-TR')} readOnly className="bg-gray-100" />
                </div>
              </div>
            ))}
            <Button onClick={handleAddInvoiceItem} variant="outline" className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Ürün Ekle
            </Button>

            <div className="grid grid-cols-4 items-center gap-4 mt-6">
              <Label htmlFor="description" className="text-right">Açıklama/Notlar</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
            </div>

            <div className="flex justify-end items-center mt-6">
              <span className="text-2xl font-bold mr-4">Toplam Tutar:</span>
              <span className="text-3xl font-bold text-primary">{calculateTotalAmount().toLocaleString('tr-TR')} ₺</span>
            </div>

            <div className="flex justify-end mt-8">
              <Button onClick={handleSaveInvoice}>Fatura Oluştur</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 