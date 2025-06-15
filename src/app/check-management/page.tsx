'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Check {
  id: string;
  checkNumber: string;
  bankName: string;
  branchName: string;
  accountNumber: string;
  amount: number;
  issueDate: Date;
  dueDate: Date;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  partyName: string;
  partyType: 'customer' | 'supplier';
  description?: string;
}

export default function CheckManagementPage() {
  const { toast } = useToast();
  const [checks, setChecks] = useState<Check[]>([]);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [editingCheck, setEditingCheck] = useState<Check | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [checkNumber, setCheckNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState<Date>();
  const [dueDate, setDueDate] = useState<Date>();
  const [status, setStatus] = useState<Check['status']>('pending');
  const [partyName, setPartyName] = useState("");
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer');
  const [description, setDescription] = useState("");

  useEffect(() => {
    // Load checks from localStorage
    const savedChecks = localStorage.getItem('ermay_checks');
    if (savedChecks) {
      setChecks(JSON.parse(savedChecks));
    }
  }, []);

  const saveChecks = (newChecks: Check[]) => {
    localStorage.setItem('ermay_checks', JSON.stringify(newChecks));
    setChecks(newChecks);
  };

  const handleAddCheck = () => {
    if (!checkNumber || !bankName || !amount || !issueDate || !dueDate || !partyName) {
      toast({
        title: "Hata",
        description: "Lütfen tüm zorunlu alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    const newCheck: Check = {
      id: Date.now().toString(),
      checkNumber,
      bankName,
      branchName,
      accountNumber,
      amount: parseFloat(amount),
      issueDate: issueDate,
      dueDate: dueDate,
      status,
      partyName,
      partyType,
      description,
    };

    saveChecks([...checks, newCheck]);
    setShowCheckModal(false);
    resetForm();
    toast({
      title: "Başarılı",
      description: "Çek başarıyla eklendi.",
    });
  };

  const handleEditCheck = (check: Check) => {
    setEditingCheck(check);
    setCheckNumber(check.checkNumber);
    setBankName(check.bankName);
    setBranchName(check.branchName);
    setAccountNumber(check.accountNumber);
    setAmount(check.amount.toString());
    setIssueDate(new Date(check.issueDate));
    setDueDate(new Date(check.dueDate));
    setStatus(check.status);
    setPartyName(check.partyName);
    setPartyType(check.partyType);
    setDescription(check.description || "");
    setShowCheckModal(true);
  };

  const handleUpdateCheck = () => {
    if (!editingCheck) return;

    const updatedChecks = checks.map(check =>
      check.id === editingCheck.id
        ? {
            ...check,
            checkNumber,
            bankName,
            branchName,
            accountNumber,
            amount: parseFloat(amount),
            issueDate: issueDate!,
            dueDate: dueDate!,
            status,
            partyName,
            partyType,
            description,
          }
        : check
    );

    saveChecks(updatedChecks);
    setShowCheckModal(false);
    resetForm();
    toast({
      title: "Başarılı",
      description: "Çek başarıyla güncellendi.",
    });
  };

  const handleDeleteCheck = (checkId: string) => {
    const updatedChecks = checks.filter(check => check.id !== checkId);
    saveChecks(updatedChecks);
    toast({
      title: "Başarılı",
      description: "Çek başarıyla silindi.",
    });
  };

  const resetForm = () => {
    setEditingCheck(null);
    setCheckNumber("");
    setBankName("");
    setBranchName("");
    setAccountNumber("");
    setAmount("");
    setIssueDate(undefined);
    setDueDate(undefined);
    setStatus('pending');
    setPartyName("");
    setPartyType('customer');
    setDescription("");
  };

  const filteredChecks = checks.filter(check =>
    check.checkNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    check.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    check.partyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Çek Yönetimi</h2>
        <Dialog open={showCheckModal} onOpenChange={setShowCheckModal}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingCheck(null); resetForm(); setShowCheckModal(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Çek
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingCheck ? "Çek Düzenle" : "Yeni Çek Ekle"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkNumber">Çek Numarası</Label>
                  <Input
                    id="checkNumber"
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Banka Adı</Label>
                  <Input
                    id="bankName"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branchName">Şube Adı</Label>
                  <Input
                    id="branchName"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Hesap Numarası</Label>
                  <Input
                    id="accountNumber"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Tutar</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Durum</Label>
                  <Select value={status} onValueChange={(value: Check['status']) => setStatus(value)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Beklemede</SelectItem>
                      <SelectItem value="cleared">Tahsil Edildi</SelectItem>
                      <SelectItem value="bounced">Karşılıksız</SelectItem>
                      <SelectItem value="cancelled">İptal Edildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="issueDate">Keşide Tarihi</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !issueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {issueDate ? format(issueDate, "PPP", { locale: tr }) : "Tarih seçin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={issueDate}
                        onSelect={setIssueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Vade Tarihi</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP", { locale: tr }) : "Tarih seçin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partyType">Taraf Tipi</Label>
                  <Select value={partyType} onValueChange={(value: 'customer' | 'supplier') => setPartyType(value)}>
                    <SelectTrigger id="partyType">
                      <SelectValue placeholder="Taraf tipi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Müşteri</SelectItem>
                      <SelectItem value="supplier">Tedarikçi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partyName">Taraf Adı</Label>
                  <Input
                    id="partyName"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCheckModal(false)}>
                İptal
              </Button>
              <Button onClick={editingCheck ? handleUpdateCheck : handleAddCheck}>
                {editingCheck ? "Güncelle" : "Ekle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Çekler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Çek ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Çek No</TableHead>
                  <TableHead>Banka</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Vade Tarihi</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Taraf</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChecks.map((check) => (
                  <TableRow key={check.id}>
                    <TableCell>{check.checkNumber}</TableCell>
                    <TableCell>{check.bankName}</TableCell>
                    <TableCell>{check.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</TableCell>
                    <TableCell>{format(new Date(check.dueDate), "dd MMMM yyyy", { locale: tr })}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        check.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        check.status === 'cleared' ? 'bg-green-100 text-green-800' :
                        check.status === 'bounced' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {check.status === 'pending' ? 'Beklemede' :
                         check.status === 'cleared' ? 'Tahsil Edildi' :
                         check.status === 'bounced' ? 'Karşılıksız' :
                         'İptal Edildi'}
                      </span>
                    </TableCell>
                    <TableCell>{check.partyName}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCheck(check)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCheck(check.id)}
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