'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, Edit, Trash } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BackToHomeButton from '@/components/common/back-to-home-button';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'Yeni' | 'İletişim Kuruldu' | 'Nitelikli' | 'Kaybedildi';
  source?: string;
  createdAt: string;
}

const leadFormSchema = z.object({
  name: z.string().min(2, { message: "Ad en az 2 karakter olmalıdır." }),
  email: z.string().email({ message: "Geçerli bir e-posta adresi giriniz." }),
  phone: z.string().optional(),
  status: z.enum(['Yeni', 'İletişim Kuruldu', 'Nitelikli', 'Kaybedildi']),
  source: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([
    {
      id: "1",
      name: "Ayşe Yılmaz",
      email: "ayse.yilmaz@example.com",
      phone: "5321234567",
      status: 'Yeni',
      source: 'Web Sitesi',
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      name: "Mehmet Demir",
      email: "mehmet.demir@example.com",
      phone: "5439876543",
      status: 'İletişim Kuruldu',
      source: 'Referans',
      createdAt: new Date().toISOString(),
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      status: 'Yeni',
      source: '',
    },
  });

  const handleAddLead = (values: LeadFormValues) => {
    const newLead: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      ...values,
      createdAt: new Date().toISOString(),
    };
    setLeads(prev => [...prev, newLead]);
    setShowLeadModal(false);
    form.reset();
  };

  const handleEditLead = (values: LeadFormValues) => {
    if (!editingLead) return;
    setLeads(prev =>
      prev.map(lead =>
        lead.id === editingLead.id
          ? { ...lead, ...values, updatedAt: new Date().toISOString() }
          : lead
      )
    );
    setShowLeadModal(false);
    setEditingLead(null);
    form.reset();
  };

  const handleDeleteLead = (id: string) => {
    setLeads(prev => prev.filter(lead => lead.id !== id));
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    form.reset(lead);
    setShowLeadModal(true);
  };

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (lead.phone && lead.phone.includes(searchQuery)) ||
    lead.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Potansiyel Müşteriler</h2>
        <Dialog open={showLeadModal} onOpenChange={setShowLeadModal}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingLead(null); form.reset(); setShowLeadModal(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Potansiyel Müşteri
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingLead ? 'Potansiyel Müşteri Düzenle' : 'Yeni Potansiyel Müşteri Ekle'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(editingLead ? handleEditLead : handleAddLead)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="Müşteri adı" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-posta</FormLabel>
                      <FormControl>
                        <Input placeholder="eposta@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input placeholder="5xx xxx xx xx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durum</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Durum seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Yeni">Yeni</SelectItem>
                          <SelectItem value="İletişim Kuruldu">İletişim Kuruldu</SelectItem>
                          <SelectItem value="Nitelikli">Nitelikli</SelectItem>
                          <SelectItem value="Kaybedildi">Kaybedildi</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kaynak</FormLabel>
                      <FormControl>
                        <Input placeholder="Kaynak (örn: Web Sitesi, Referans)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">{editingLead ? 'Kaydet' : 'Ekle'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Potansiyel Müşteri Listesi</CardTitle>
          <CardDescription>Tüm potansiyel müşterilerinizi buradan yönetin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Label htmlFor="search" className="sr-only">Ara</Label>
            <Input
              id="search"
              type="text"
              placeholder="Potansiyel müşteri ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline"><Search className="h-4 w-4" /></Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adı</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Kaynak</TableHead>
                <TableHead>Oluşturulma Tarihi</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.phone || '-'}</TableCell>
                  <TableCell>{lead.status}</TableCell>
                  <TableCell>{lead.source || '-'}</TableCell>
                  <TableCell>{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openEditModal(lead)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="sm" className="ml-2" onClick={() => handleDeleteLead(lead.id)}><Trash className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredLeads.length === 0 && (
            <p className="text-center text-muted-foreground mt-4">Hiç potansiyel müşteri bulunamadı.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 