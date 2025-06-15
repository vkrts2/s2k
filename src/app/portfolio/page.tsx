// src/app/portfolio/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, MapPin, Building2, Home, Factory, Store, Landmark } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface PortfolioItem {
  id: string;
  name: string;
  type: 'apartment' | 'house' | 'land' | 'commercial' | 'industrial';
  address: string;
  city: string;
  district: string;
  purchaseDate: Date;
  purchasePrice: number;
  currentValue: number;
  status: 'active' | 'sold' | 'rented';
  tenant?: string;
  rentAmount?: number;
  notes?: string;
}

const ALL_CITIES_VALUE = "all";

export default function PortfolioPage() {
  const { toast } = useToast();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState(ALL_CITIES_VALUE);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<PortfolioItem['type']>('apartment');
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [status, setStatus] = useState<PortfolioItem['status']>('active');
  const [tenant, setTenant] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Load portfolio items from localStorage
    const savedItems = localStorage.getItem('ermay_portfolio_items');
    if (savedItems) {
      setPortfolioItems(JSON.parse(savedItems));
    }
  }, []);

  const savePortfolioItems = (newItems: PortfolioItem[]) => {
    localStorage.setItem('ermay_portfolio_items', JSON.stringify(newItems));
    setPortfolioItems(newItems);
  };

  const handleAddItem = () => {
    if (!name || !address || !city || !district || !purchasePrice || !currentValue) {
      toast({
        title: "Hata",
        description: "Lütfen tüm zorunlu alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    const newItem: PortfolioItem = {
      id: Date.now().toString(),
      name,
      type,
      address,
      city,
      district,
      purchaseDate,
      purchasePrice: parseFloat(purchasePrice),
      currentValue: parseFloat(currentValue),
      status,
      tenant: tenant || undefined,
      rentAmount: rentAmount ? parseFloat(rentAmount) : undefined,
      notes,
    };

    savePortfolioItems([...portfolioItems, newItem]);
    setShowItemModal(false);
    resetForm();
    toast({
      title: "Başarılı",
      description: "Portföy kaydı başarıyla eklendi.",
    });
  };

  const handleEditItem = (item: PortfolioItem) => {
    setEditingItem(item);
    setName(item.name);
    setType(item.type);
    setAddress(item.address);
    setCity(item.city);
    setDistrict(item.district);
    setPurchaseDate(new Date(item.purchaseDate));
    setPurchasePrice(item.purchasePrice.toString());
    setCurrentValue(item.currentValue.toString());
    setStatus(item.status);
    setTenant(item.tenant || "");
    setRentAmount(item.rentAmount?.toString() || "");
    setNotes(item.notes || "");
    setShowItemModal(true);
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;

    const updatedItems = portfolioItems.map(item =>
      item.id === editingItem.id
        ? {
            ...item,
            name,
            type,
            address,
            city,
            district,
            purchaseDate,
            purchasePrice: parseFloat(purchasePrice),
            currentValue: parseFloat(currentValue),
            status,
            tenant: tenant || undefined,
            rentAmount: rentAmount ? parseFloat(rentAmount) : undefined,
            notes,
          }
        : item
    );

    savePortfolioItems(updatedItems);
    setShowItemModal(false);
    resetForm();
    toast({
      title: "Başarılı",
      description: "Portföy kaydı başarıyla güncellendi.",
    });
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = portfolioItems.filter(item => item.id !== itemId);
    savePortfolioItems(updatedItems);
    toast({
      title: "Başarılı",
      description: "Portföy kaydı başarıyla silindi.",
    });
  };

  const resetForm = () => {
    setEditingItem(null);
    setName("");
    setType('apartment');
    setAddress("");
    setCity("");
    setDistrict("");
    setPurchaseDate(new Date());
    setPurchasePrice("");
    setCurrentValue("");
    setStatus('active');
    setTenant("");
    setRentAmount("");
    setNotes("");
  };

  const getTypeIcon = (type: PortfolioItem['type']) => {
    switch (type) {
      case 'apartment':
        return <Building2 className="h-4 w-4" />;
      case 'house':
        return <Home className="h-4 w-4" />;
      case 'land':
        return <Landmark className="h-4 w-4" />;
      case 'commercial':
        return <Store className="h-4 w-4" />;
      case 'industrial':
        return <Factory className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: PortfolioItem['type']) => {
    switch (type) {
      case 'apartment':
        return 'Daire';
      case 'house':
        return 'Ev';
      case 'land':
        return 'Arsa';
      case 'commercial':
        return 'Ticari';
      case 'industrial':
        return 'Sanayi';
    }
  };

  const uniqueCities = Array.from(new Set(portfolioItems.map(item => item.city)));

  const filteredItems = portfolioItems.filter(item =>
    (selectedCity === ALL_CITIES_VALUE || item.city === selectedCity) &&
    (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
     item.district.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Portföy Listesi</h2>
        <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingItem(null); resetForm(); setShowItemModal(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Portföy Kaydı
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Portföy Kaydını Düzenle" : "Yeni Portföy Kaydı"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">İsim</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tür</Label>
                  <Select value={type} onValueChange={(value: PortfolioItem['type']) => setType(value)}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Tür seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Daire</SelectItem>
                      <SelectItem value="house">Ev</SelectItem>
                      <SelectItem value="land">Arsa</SelectItem>
                      <SelectItem value="commercial">Ticari</SelectItem>
                      <SelectItem value="industrial">Sanayi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">İl</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">İlçe</Label>
                  <Input
                    id="district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Alış Fiyatı</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentValue">Güncel Değer</Label>
                  <Input
                    id="currentValue"
                    type="number"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Durum</Label>
                  <Select value={status} onValueChange={(value: PortfolioItem['status']) => setStatus(value)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="sold">Satıldı</SelectItem>
                      <SelectItem value="rented">Kirada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {status === 'rented' && (
                  <div className="space-y-2">
                    <Label htmlFor="rentAmount">Kira Bedeli</Label>
                    <Input
                      id="rentAmount"
                      type="number"
                      value={rentAmount}
                      onChange={(e) => setRentAmount(e.target.value)}
                    />
                  </div>
                )}
              </div>
              {status === 'rented' && (
                <div className="space-y-2">
                  <Label htmlFor="tenant">Kiracı</Label>
                  <Input
                    id="tenant"
                    value={tenant}
                    onChange={(e) => setTenant(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="notes">Notlar</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowItemModal(false)}>
                İptal
              </Button>
              <Button onClick={editingItem ? handleUpdateItem : handleAddItem}>
                {editingItem ? "Güncelle" : "Ekle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portföy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              placeholder="Portföy ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="İl seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CITIES_VALUE}>Tüm İller</SelectItem>
                {uniqueCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İsim</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Konum</TableHead>
                  <TableHead>Alış Fiyatı</TableHead>
                  <TableHead>Güncel Değer</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        {getTypeLabel(item.type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{item.district}, {item.city}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.purchasePrice.toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: 'TRY'
                      })}
                    </TableCell>
                    <TableCell>
                      {item.currentValue.toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: 'TRY'
                      })}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.status === 'active' ? 'bg-green-100 text-green-800' :
                        item.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status === 'active' ? 'Aktif' :
                         item.status === 'sold' ? 'Satıldı' :
                         'Kirada'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
