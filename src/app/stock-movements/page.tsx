"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Archive } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { getStockMovements, getStockMovementsPage, getStockItems } from "@/lib/storage";
import type { StockTransaction, StockItem } from "@/lib/types";
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function StockMovementsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<StockTransaction[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedType, setSelectedType] = useState<'all' | 'purchase' | 'sale'>('all');
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  const nameById = useMemo(() => Object.fromEntries(items.map(i => [i.id, i.name])), [items]);
  const unitById = useMemo(() => Object.fromEntries(items.map(i => [i.id, i.unit || ''])), [items]);

  const filteredMovements = useMemo(() => {
    let data = movements;
    if (selectedItemId !== 'all') {
      data = data.filter(m => m.stockItemId === selectedItemId);
    }
    if (selectedType !== 'all') {
      data = data.filter(m => m.transactionType === selectedType);
    }
    if (dateFrom) {
      const fromTs = new Date(dateFrom).getTime();
      data = data.filter(m => {
        const t = new Date(m.date).getTime();
        return !isNaN(fromTs) ? t >= fromTs : true;
      });
    }
    if (dateTo) {
      const toTs = new Date(dateTo).getTime();
      data = data.filter(m => {
        const t = new Date(m.date).getTime();
        return !isNaN(toTs) ? t <= toTs + 24*60*60*1000 - 1 : true; // gün sonuna kadar
      });
    }
    return data;
  }, [movements, selectedItemId, selectedType, dateFrom, dateTo]);

  useEffect(() => {
    const run = async () => {
      if (!user) { setLoading(false); return; }
      setLoading(true);
      try {
        const fromISO = dateFrom ? (() => { const d = new Date(dateFrom); d.setHours(0,0,0,0); return d.toISOString(); })() : undefined;
        const toISO = dateTo ? (() => { const d = new Date(dateTo); d.setHours(23,59,59,999); return d.toISOString(); })() : undefined;
        const typeFilter = selectedType;
        const stockItemFilter = selectedItemId !== 'all' ? selectedItemId : undefined;

        const [{ items: pageItems, nextCursor }, sis] = await Promise.all([
          getStockMovementsPage(user.uid, {
            filters: {
              stockItemId: stockItemFilter,
              type: typeFilter,
              from: fromISO,
              to: toISO,
            },
            limitSize: 50,
          }),
          getStockItems(user.uid),
        ]);
        setMovements(pageItems);
        setNextCursor(nextCursor);
        setItems(sis);
      } finally {
        setLoading(false);
      }
    };
    // Filtre değişince cursor ve listeyi sıfırla
    setNextCursor(undefined);
    setMovements([]);
    run();
  }, [user, selectedItemId, selectedType, dateFrom, dateTo]);

  const handleLoadMore = async () => {
    if (!user || !nextCursor) return;
    setLoadingMore(true);
    try {
      const fromISO = dateFrom ? (() => { const d = new Date(dateFrom); d.setHours(0,0,0,0); return d.toISOString(); })() : undefined;
      const toISO = dateTo ? (() => { const d = new Date(dateTo); d.setHours(23,59,59,999); return d.toISOString(); })() : undefined;
      const stockItemFilter = selectedItemId !== 'all' ? selectedItemId : undefined;
      const typeFilter = selectedType;
      const { items: moreItems, nextCursor: next } = await getStockMovementsPage(user.uid, {
        filters: { stockItemId: stockItemFilter, type: typeFilter, from: fromISO, to: toISO },
        limitSize: 50,
        startAfterDate: nextCursor,
      });
      setMovements(prev => [...prev, ...moreItems]);
      setNextCursor(next);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleExportCsv = () => {
    const rows = [
      ['Tarih', 'Ürün', 'Tür', 'Miktar', 'Birim', 'Birim Fiyat', 'Tutar', 'Bakiye'],
      ...filteredMovements.map(m => [
        format(parseISO(m.date), 'yyyy-MM-dd HH:mm'),
        nameById[m.stockItemId] || m.stockItemId,
        m.transactionType === 'purchase' ? 'Giriş' : 'Çıkış',
        String(m.quantityPurchased ?? m.quantitySold ?? ''),
        String(m.unit ?? unitById[m.stockItemId] ?? ''),
        typeof m.unitPrice === 'number' ? String(m.unitPrice) : '',
        typeof m.amount === 'number' ? String(m.amount) : '',
        typeof m.balanceAfter === 'number' ? String(m.balanceAfter) : ''
      ])
    ];
    const csv = rows.map(r => r.map(field => {
      const s = String(field ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stok-hareketleri-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Archive className="mr-3 h-7 w-7 text-primary" /> Stok Hareketleri
        </h1>
        <Button asChild variant="outline">
          <Link href="/stock">Stok Kalemlerine Git</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hareket Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 md:items-end mb-4">
            <div className="w-full md:w-64">
              <label className="block text-sm mb-1">Ürün</label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Ürün seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {items.map(it => (
                    <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm mb-1">Tür</label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tür seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="purchase">Giriş</SelectItem>
                  <SelectItem value="sale">Çıkış</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm mb-1">Başlangıç</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Bitiş</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="md:ml-auto flex gap-2">
              <Button variant="ghost" onClick={() => { setSelectedItemId('all'); setSelectedType('all'); setDateFrom(''); setDateTo(''); }}>
                Filtreleri Temizle
              </Button>
              <Button variant="outline" onClick={handleExportCsv}>CSV Dışa Aktar</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead>Birim</TableHead>
                  <TableHead className="text-right">Birim Fiyat</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead className="text-right">Bakiye</TableHead>
                  <TableHead className="text-right">Detay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">Yükleniyor...</TableCell>
                  </TableRow>
                ) : filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">Henüz hareket yok.</TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{format(parseISO(m.date), 'dd MMM yyyy HH:mm', { locale: tr })}</TableCell>
                      <TableCell>{nameById[m.stockItemId] || m.stockItemId}</TableCell>
                      <TableCell>
                        <span className={
                          m.transactionType === 'purchase'
                            ? 'inline-flex items-center rounded bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 text-xs'
                            : 'inline-flex items-center rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 text-xs'
                        }>
                          {m.transactionType === 'purchase' ? 'Giriş' : 'Çıkış'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{m.quantityPurchased ?? m.quantitySold ?? '-'}</TableCell>
                      <TableCell>{m.unit ?? unitById[m.stockItemId] ?? '-'}</TableCell>
                      <TableCell className="text-right">{typeof m.unitPrice === 'number' ? m.unitPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '-'}</TableCell>
                      <TableCell className="text-right">{typeof m.amount === 'number' ? m.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '-'}</TableCell>
                      <TableCell className="text-right">{typeof m.balanceAfter === 'number' ? m.balanceAfter : '-'}</TableCell>
                      <TableCell className="text-right">
                        {m.transactionType === 'sale' && m.customerId && m.relatedId ? (
                          <Link className="text-primary underline" href={`/customers/${m.customerId}/sales/${m.relatedId}`}>Aç</Link>
                        ) : m.transactionType === 'purchase' && m.relatedId ? (
                          <Link className="text-primary underline" href={`/purchases/${m.relatedId}`}>Aç</Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {nextCursor && (
            <div className="flex justify-center mt-3">
              <Button variant="secondary" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}