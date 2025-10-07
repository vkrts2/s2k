"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Users, Truck, Package, ReceiptText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
// import { formatCurrency } from "@/lib/utils";

interface CustomerResult {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: "customer";
}

interface SupplierResult {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: "supplier";
}

interface ProductResult {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  type: "product";
}

interface TransactionResult {
  id: string;
  type: "transaction";
  transactionType: string; // e.g., 'Fatura', 'Alış', 'Ödeme (Gelen)', 'Ödeme (Giden)'
  description: string;
  amount: number;
  date: Date;
  link: string;
}

type SearchResult = CustomerResult | SupplierResult | ProductResult | TransactionResult;

export default function AdvancedSearchPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "customers" | "suppliers" | "products" | "transactions">("all");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!user?.uid) {
      setError("Arama yapmak için giriş yapmalısınız.");
      return;
    }
    setLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      let results: SearchResult[] = [];

      // Search Customers
      if (activeTab === "all" || activeTab === "customers") {
        const customersRef = collection(db, `users/${user.uid}/customers`);
        const q = query(customersRef, orderBy("name"));
        const customerSnapshot = await getDocs(q);
        customerSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.name.toLowerCase().includes(lowerCaseSearchTerm) ||
              data.email?.toLowerCase().includes(lowerCaseSearchTerm) ||
              data.phone?.toLowerCase().includes(lowerCaseSearchTerm)) {
            results.push({ id: doc.id, name: data.name, email: data.email, phone: data.phone, type: "customer" });
          }
        });
      }

      // Search Suppliers
      if (activeTab === "all" || activeTab === "suppliers") {
        const suppliersRef = collection(db, `users/${user.uid}/suppliers`);
        const q = query(suppliersRef, orderBy("name"));
        const supplierSnapshot = await getDocs(q);
        supplierSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.name.toLowerCase().includes(lowerCaseSearchTerm) ||
              data.email?.toLowerCase().includes(lowerCaseSearchTerm) ||
              data.phone?.toLowerCase().includes(lowerCaseSearchTerm)) {
            results.push({ id: doc.id, name: data.name, email: data.email, phone: data.phone, type: "supplier" });
          }
        });
      }

      // Search Products (Stock Items)
      if (activeTab === "all" || activeTab === "products") {
        const productsRef = collection(db, `users/${user.uid}/stockItems`);
        const q = query(productsRef, orderBy("name"));
        const productSnapshot = await getDocs(q);
        productSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.name.toLowerCase().includes(lowerCaseSearchTerm) ||
              data.category?.toLowerCase().includes(lowerCaseSearchTerm)) {
            results.push({ id: doc.id, name: data.name, category: data.category, quantity: data.quantity, unitPrice: data.unitPrice, type: "product" });
          }
        });
      }

      // Search Transactions (Invoices, Purchases, Payments)
      if (activeTab === "all" || activeTab === "transactions") {
        // Invoices (Sales)
        const invoicesRef = collection(db, `users/${user.uid}/invoices`);
        const invoicesSnapshot = await getDocs(invoicesRef);
        invoicesSnapshot.forEach(doc => {
          const data = doc.data();
          const description = `Fatura No: ${data.invoiceNumber || doc.id} - ${data.customerName}`;
          if (description.toLowerCase().includes(lowerCaseSearchTerm) ||
              data.totalAmount.toString().includes(lowerCaseSearchTerm) ||
              format(data.date.toDate(), 'dd.MM.yyyy').includes(lowerCaseSearchTerm)) {
            results.push({
              id: doc.id,
              type: "transaction",
              transactionType: "Fatura",
              description: description,
              amount: data.totalAmount,
              date: data.date.toDate(),
              link: `/invoices/${doc.id}`,
            });
          }
        });

        // Purchases
        const purchasesRef = collection(db, `users/${user.uid}/purchases`);
        const purchasesSnapshot = await getDocs(purchasesRef);
        purchasesSnapshot.forEach(doc => {
          const data = doc.data();
          const description = data.description || `Alış: ${doc.id} - ${data.supplierName}`;
          if (description.toLowerCase().includes(lowerCaseSearchTerm) ||
              data.amount.toString().includes(lowerCaseSearchTerm) ||
              format(data.date.toDate(), 'dd.MM.yyyy').includes(lowerCaseSearchTerm)) {
            results.push({
              id: doc.id,
              type: "transaction",
              transactionType: "Alış",
              description: description,
              amount: data.amount,
              date: data.date.toDate(),
              link: `/suppliers/${data.supplierId}/purchases`,
            });
          }
        });

        // Payments (from customers)
        const paymentsRef = collection(db, `users/${user.uid}/payments`);
        const paymentsSnapshot = await getDocs(paymentsRef);
        paymentsSnapshot.forEach(doc => {
          const data = doc.data();
          const description = data.description || `Ödeme (Gelen): ${doc.id} - ${data.customerName}`;
          if (description.toLowerCase().includes(lowerCaseSearchTerm) ||
              data.amount.toString().includes(lowerCaseSearchTerm) ||
              format(data.date.toDate(), 'dd.MM.yyyy').includes(lowerCaseSearchTerm)) {
            results.push({
              id: doc.id,
              type: "transaction",
              transactionType: "Ödeme (Gelen)",
              description: description,
              amount: data.amount,
              date: data.date.toDate(),
              link: `/customers/${data.customerId}/payments`,
            });
          }
        });

        // Payments (to suppliers)
        const paymentsToSuppliersRef = collection(db, `users/${user.uid}/paymentsToSuppliers`);
        const paymentsToSuppliersSnapshot = await getDocs(paymentsToSuppliersRef);
        paymentsToSuppliersSnapshot.forEach(doc => {
          const data = doc.data();
          const description = data.description || `Ödeme (Giden): ${doc.id} - ${data.supplierName}`;
          if (description.toLowerCase().includes(lowerCaseSearchTerm) ||
              data.amount.toString().includes(lowerCaseSearchTerm) ||
              format(data.date.toDate(), 'dd.MM.yyyy').includes(lowerCaseSearchTerm)) {
            results.push({
              id: doc.id,
              type: "transaction",
              transactionType: "Ödeme (Giden)",
              description: description,
              amount: data.amount,
              date: data.date.toDate(),
              link: `/suppliers/${data.supplierId}/payments`,
            });
          }
        });
      }

      setSearchResults(results);
    } catch (err) {
      console.error("Arama sırasında hata oluştu:", err);
      setError("Arama yapılırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gelişmiş Arama</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Arama Yap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Input
              placeholder="Arama terimi girin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
            <Button onClick={handleSearch} disabled={loading}>
              <SearchIcon className="h-4 w-4 mr-2" />
              Ara
            </Button>
          </div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "all" | "customers" | "suppliers" | "products" | "transactions")}>
            <TabsList>
              <TabsTrigger value="all">Tümü</TabsTrigger>
              <TabsTrigger value="customers">Müşteriler</TabsTrigger>
              <TabsTrigger value="suppliers">Tedarikçiler</TabsTrigger>
              <TabsTrigger value="products">Ürünler</TabsTrigger>
              <TabsTrigger value="transactions">İşlemler</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <p>Aranıyor...</p>
              ) : error ? (
                <p className="text-red-500">Hata: {error}</p>
              ) : searchResults.length === 0 ? (
                <p>Hiç sonuç bulunamadı.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Türü</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead>Detay</TableHead>
                      <TableHead className="text-right">Tutar/Adet</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead className="text-right">Eylem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          {result.type === "customer" && <Badge variant="outline"><Users className="h-3 w-3 mr-1"/> Müşteri</Badge>}
                          {result.type === "supplier" && <Badge variant="outline"><Truck className="h-3 w-3 mr-1"/> Tedarikçi</Badge>}
                          {result.type === "product" && <Badge variant="outline"><Package className="h-3 w-3 mr-1"/> Ürün</Badge>}
                          {result.type === "transaction" && <Badge variant="outline"><ReceiptText className="h-3 w-3 mr-1"/> {result.transactionType}</Badge>}
                        </TableCell>
                        <TableCell>
                          {result.type === "customer" && result.name}
                          {result.type === "supplier" && result.name}
                          {result.type === "product" && result.name}
                          {result.type === "transaction" && result.description}
                        </TableCell>
                        <TableCell>
                          {result.type === "customer" && (
                            <div className="text-sm text-muted-foreground">
                              {result.email && <p>E-posta: {result.email}</p>}
                              {result.phone && <p>Telefon: {result.phone}</p>}
                            </div>
                          )}
                          {result.type === "supplier" && (
                            <div className="text-sm text-muted-foreground">
                              {result.email && <p>E-posta: {result.email}</p>}
                              {result.phone && <p>Telefon: {result.phone}</p>}
                            </div>
                          )}
                          {result.type === "product" && (
                            <div className="text-sm text-muted-foreground">
                              <p>Kategori: {result.category}</p>
                              <p>Birim Fiyat: {/* formatCurrency(result.unitPrice, 'TRY') */}</p>
                            </div>
                          )}
                          {result.type === "transaction" && (
                            <div className="text-sm text-muted-foreground">
                              <p>Tarih: {format(result.date, 'dd.MM.yyyy HH:mm', { locale: tr })}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {result.type === "product" && result.quantity.toLocaleString()}
                          {result.type === "transaction" && /* formatCurrency(result.amount, 'TRY') */ "-"}
                          {(result.type === "customer" || result.type === "supplier") && "-"}
                        </TableCell>
                        <TableCell>
                          {result.type === "transaction" ? (
                            format(result.date, 'dd.MM.yyyy')
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {result.type === "customer" && <Link href={`/customers/${result.id}`}><Button variant="outline" size="sm">Görüntüle</Button></Link>}
                          {result.type === "supplier" && <Link href={`/suppliers/${result.id}`}><Button variant="outline" size="sm">Görüntüle</Button></Link>}
                          {result.type === "product" && <Link href={`/stock/${result.id}`}><Button variant="outline" size="sm">Görüntüle</Button></Link>}
                          {result.type === "transaction" && <Link href={result.link}><Button variant="outline" size="sm">Görüntüle</Button></Link>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 