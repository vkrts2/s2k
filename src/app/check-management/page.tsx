'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format, parse, isValid } from "date-fns";
import { tr } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import BackToHomeButton from '@/components/common/back-to-home-button';
import { useAuth } from '@/contexts/AuthContext';
import type { BankCheck } from '@/lib/types';
import { getChecks, addCheck as addCheckToDb, updateCheck as updateCheckInDb, deleteCheck as deleteCheckFromDb } from '@/lib/storage';

type Check = BankCheck;

export default function CheckManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [checks, setChecks] = useState<Check[]>([]);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [editingCheck, setEditingCheck] = useState<Check | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checkIdToDelete, setCheckIdToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const [issueDateInput, setIssueDateInput] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');

  const refresh = async () => {
    if (!user) return;
    const list = await getChecks(user.uid);
    setChecks(list);
  };

  useEffect(() => {
    if (!user) return;
    // 1) Firestore'dan çek
    refresh();

    // 2) LocalStorage'ta eski kayıt varsa bir kez Firestore'a taşı
    const MIGRATION_KEY = 'ermay_checks_migrated';
    if (localStorage.getItem(MIGRATION_KEY) === '1') return;

    try {
      const savedChecks = localStorage.getItem('ermay_checks');
      if (!savedChecks) return;
      const parsed: any[] = JSON.parse(savedChecks);
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      const toIso = (val: any) => {
        if (!val) return new Date().toISOString();
        try { return new Date(val).toISOString(); } catch { return new Date().toISOString(); }
      };

      const migrate = async () => {
        for (const c of parsed) {
          const payload: Omit<BankCheck, 'id' | 'createdAt' | 'updatedAt'> = {
            checkNumber: String(c.checkNumber || ''),
            bankName: String(c.bankName || ''),
            branchName: c.branchName ? String(c.branchName) : undefined,
            accountNumber: c.accountNumber ? String(c.accountNumber) : undefined,
            amount: Number(c.amount) || 0,
            issueDate: toIso(c.issueDate),
            dueDate: toIso(c.dueDate),
            status: (c.status as any) || 'pending',
            partyName: String(c.partyName || ''),
            partyType: (c.partyType === 'supplier' ? 'supplier' : 'customer'),
            description: c.description ? String(c.description) : undefined,
          };
          await addCheckToDb(user.uid, payload);
        }
        localStorage.setItem(MIGRATION_KEY, '1');
        await refresh();
        toast({ title: 'Eski çek verileri aktarıldı', description: 'LocalStorage kayıtları Firestore\'a taşındı.' });
      };

      migrate();
    } catch (e) {
      console.error('Check migration error', e);
    }
  }, [user]);

  // LocalStorage ve JSON'dan içe aktarma
  const normalizeToIso = (val: any) => {
    if (!val) return new Date().toISOString();
    try {
      const d = typeof val === 'string' ? new Date(val) : val;
      return new Date(d).toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  const importArrayToFirestore = async (arr: any[]) => {
    if (!user) return;
    for (const c of arr) {
      const payload: Omit<BankCheck, 'id' | 'createdAt' | 'updatedAt'> = {
        checkNumber: String(c.checkNumber || ''),
        bankName: String(c.bankName || ''),
        branchName: c.branchName ? String(c.branchName) : undefined,
        accountNumber: c.accountNumber ? String(c.accountNumber) : undefined,
        amount: Number(c.amount) || 0,
        issueDate: normalizeToIso(c.issueDate),
        dueDate: normalizeToIso(c.dueDate),
        status: (c.status as any) || 'pending',
        partyName: String(c.partyName || ''),
        partyType: (c.partyType === 'supplier' ? 'supplier' : 'customer'),
        description: c.description ? String(c.description) : undefined,
      };
      await addCheckToDb(user.uid, payload);
    }
    await refresh();
  };

  const handleImportFromLocal = async () => {
    try {
      const raw = localStorage.getItem('ermay_checks');
      if (!raw) {
        toast({ title: 'Veri bulunamadı', description: 'Bu alan adında localStorage\'da eski çek verisi yok.' });
        return;
      }
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length === 0) {
        toast({ title: 'Veri bulunamadı', description: 'LocalStorage\'da geçerli çek verisi yok.' });
        return;
      }
      await importArrayToFirestore(arr);
      toast({ title: 'İçe aktarıldı', description: 'LocalStorage\'daki çekler Firestore\'a aktarıldı.' });
    } catch (e) {
      toast({ title: 'Hata', description: 'İçe aktarma sırasında bir hata oluştu.', variant: 'destructive' });
    }
  };

  const handleImportFromJson = async (file: File) => {
    try {
      const text = await file.text();
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('Geçersiz dosya');
      await importArrayToFirestore(arr);
      toast({ title: 'İçe aktarıldı', description: 'JSON dosyasından çekler aktarıldı.' });
    } catch (e) {
      toast({ title: 'Hata', description: 'JSON okuma/aktarma hatası.', variant: 'destructive' });
    }
  };

  // Debug function to add sample data
  const addSampleData = () => {
    const sampleCheck: Check = {
      id: crypto.randomUUID(),
      checkNumber: 'CHK-2024001',
      bankName: 'Örnek Banka',
      branchName: 'Merkez Şube',
      accountNumber: '1234567890',
      amount: 5000,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'pending',
      partyName: 'Örnek Müşteri',
      partyType: 'customer',
      description: 'Örnek çek'
    };
    
    // saveChecks([...checks, sampleCheck]); // This line is removed as per the edit hint
    toast({
      title: "Örnek Veri Eklendi",
      description: "Test için örnek çek eklendi.",
    });
  };

  const handleAddCheck = async () => {
    if (!checkNumber || !bankName || !amount || !issueDate || !dueDate || !partyName) {
      toast({
        title: "Hata",
        description: "Lütfen tüm zorunlu alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;
    const payload: Omit<BankCheck, 'id' | 'createdAt' | 'updatedAt'> = {
      checkNumber,
      bankName,
      branchName,
      accountNumber,
      amount: parseFloat(amount),
      issueDate: (issueDate as Date).toISOString(),
      dueDate: (dueDate as Date).toISOString(),
      status,
      partyName,
      partyType,
      description,
    };
    await addCheckToDb(user.uid, payload);
    await refresh();
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
    setDueDateInput(check.dueDate ? format(new Date(check.dueDate), 'dd.MM.yyyy') : '');
  };

  const handleUpdateCheck = async () => {
    if (!editingCheck) return;
    if (!user) return;
    const updated: BankCheck = {
      id: editingCheck.id,
      checkNumber,
      bankName,
      branchName,
      accountNumber,
      amount: parseFloat(amount),
      issueDate: (issueDate as Date).toISOString(),
      dueDate: (dueDate as Date).toISOString(),
      status,
      partyName,
      partyType,
      description,
      createdAt: editingCheck.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await updateCheckInDb(user.uid, updated);
    await refresh();
    setShowCheckModal(false);
    resetForm();
    toast({
      title: "Başarılı",
      description: "Çek başarıyla güncellendi.",
    });
  };

  const handleDeleteCheck = (checkId: string) => {
    setCheckIdToDelete(checkId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCheck = async () => {
    if (!checkIdToDelete || !user) return;
    await deleteCheckFromDb(user.uid, checkIdToDelete);
    await refresh();
    setDeleteDialogOpen(false);
    setCheckIdToDelete(null);
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
    setDueDateInput('');
  };

  const filteredChecks = checks.filter(check =>
    check.checkNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    check.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    check.partyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (issueDate) {
      setIssueDateInput(format(issueDate, 'dd.MM.yyyy'));
    } else {
      setIssueDateInput('');
    }
  }, [issueDate]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Çek Yönetimi</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={addSampleData}>Örnek Veri Ekle</Button>
          <Button variant="secondary" onClick={handleImportFromLocal}>Local'dan İçe Aktar</Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>JSON'dan İçe Aktar</Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFromJson(f); }} />
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
                    <Input
                      type="text"
                      placeholder="gg.aa.yyyy"
                      value={issueDateInput}
                      onChange={e => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.length > 8) val = val.slice(0, 8);
                        if (val.length >= 5) val = val.replace(/(\d{2})(\d{2})(\d{0,4})/, "$1.$2.$3");
                        else if (val.length >= 3) val = val.replace(/(\d{2})(\d{0,2})/, "$1.$2");
                        setIssueDateInput(val);
                        if (val.length === 10) {
                          const parsed = parse(val, 'dd.MM.yyyy', new Date());
                          if (isValid(parsed)) {
                            setIssueDate(parsed);
                          }
                        } else {
                          setIssueDate(undefined);
                        }
                      }}
                      className="w-32 mt-2"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Vade Tarihi</Label>
                    <Input
                      type="text"
                      placeholder="gg.aa.yyyy"
                      value={dueDateInput}
                      onChange={e => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.length > 8) val = val.slice(0, 8);
                        if (val.length >= 5) val = val.replace(/(\d{2})(\d{2})(\d{0,4})/, "$1.$2.$3");
                        else if (val.length >= 3) val = val.replace(/(\d{2})(\d{0,2})/, "$1.$2");
                        setDueDateInput(val);
                        if (val.length === 10) {
                          const parsed = parse(val, 'dd.MM.yyyy', new Date());
                          if (isValid(parsed)) {
                            setDueDate(parsed);
                          } else {
                            setDueDate(undefined);
                          }
                        } else {
                          setDueDate(undefined);
                        }
                      }}
                      className="w-32 mt-2"
                      maxLength={10}
                    />
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Çekler ({checks.length})</CardTitle>
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
                    <TableCell>{Number(check.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</TableCell>
                    <TableCell>{format(new Date(check.dueDate), "dd.MM.yyyy", { locale: tr })}</TableCell>
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
                          onClick={() => { setCheckIdToDelete(check.id); setDeleteDialogOpen(true); }}
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Çek Silinsin mi?</DialogTitle>
          </DialogHeader>
          <p>Bu çeki silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
            <Button variant="destructive" onClick={confirmDeleteCheck}>Evet, Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 