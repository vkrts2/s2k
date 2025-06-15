import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSupplierById, getPurchases, getPaymentsToSuppliers } from '@/lib/storage';
import type { Supplier, Purchase, PaymentToSupplier, Currency } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface ExtractPageProps {
  params: {
    id: string;
  };
}

// Re-using formatCurrencyForPdf and adapting it for general use
const formatCurrency = (amount?: number, currency?: Currency): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }
  const resolvedCurrency = currency || 'TRY';
  try {
    return amount.toLocaleString('tr-TR', { style: 'currency', currency: resolvedCurrency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch (e) {
    console.error("Error formatting currency:", amount, resolvedCurrency, e);
    let symbol: string = resolvedCurrency;
    if (resolvedCurrency === 'TRY') symbol = '₺';
    else if (resolvedCurrency === 'USD') symbol = '$';
    return `${symbol}${amount.toFixed(2)}`;
  }
};

const safeFormatDate = (dateString?: string | null, formatString: string = 'dd.MM.yyyy') => {
  if (!dateString) return 'Tarih Yok';
  const date = parseISO(dateString);
  return isValid(date) ? format(date, formatString, { locale: tr }) : 'Geçersiz Tarih';
};

type UnifiedTransaction = (Purchase & { transactionType: 'purchase' }) | (PaymentToSupplier & { transactionType: 'paymentToSupplier' });

export default function ExtractPage({ params }: ExtractPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { id: supplierId } = params;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<PaymentToSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!supplierId) {
      setError("Tedarikçi ID'si bulunamadı.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const fetchedSupplier = await getSupplierById(user.uid, supplierId);
        if (fetchedSupplier) {
          setSupplier(fetchedSupplier);
        } else {
          setError("Tedarikçi bulunamadı.");
        }

        const fetchedPurchases = await getPurchases(user.uid, supplierId);
        setPurchases(fetchedPurchases);

        const fetchedPayments = await getPaymentsToSuppliers(user.uid, supplierId);
        setPayments(fetchedPayments);

      } catch (err) {
        console.error("Ekstre verileri çekilirken hata oluştu:", err);
        setError("Ekstre verileri çekilirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, supplierId, router]);

  const unifiedTransactions = useMemo(() => {
    const transactions: UnifiedTransaction[] = [...purchases, ...payments];
    return transactions.sort((a, b) => {
      const dateA = parseISO(a.date);
      const dateB = parseISO(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }, [purchases, payments]);

  const totalPurchases = useMemo(() => {
    return purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  }, [purchases]);

  const totalPayments = useMemo(() => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [payments]);

  const balance = useMemo(() => {
    return totalPayments - totalPurchases;
  }, [totalPurchases, totalPayments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Tedarikçi bilgisi yüklenemedi.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Tedarikçi Ekstresi: {supplier.name}</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Genel Bilgiler</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <p className="font-medium">Tedarikçi Adı:</p>
          <p>{supplier.name}</p>
          <p className="font-medium">E-posta:</p>
          <p>{supplier.email || '-'}</p>
          <p className="font-medium">Telefon:</p>
          <p>{supplier.phone || '-'}</p>
          <p className="font-medium">Adres:</p>
          <p>{supplier.address || '-'}</p>
          <p className="font-medium">Vergi Numarası:</p>
          <p>{supplier.taxNumber || '-'}</p>
          <p className="font-medium">Toplam Satın Alma:</p>
          <p>{formatCurrency(totalPurchases, 'TRY')}</p>
          <p className="font-medium">Toplam Ödeme:</p>
          <p>{formatCurrency(totalPayments, 'TRY')}</p>
          <p className="font-medium">Bakiye:</p>
          <p className={balance > 0 ? "text-red-500 font-bold" : "text-green-500 font-bold"}>
            {formatCurrency(balance, 'TRY')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>İşlem Detayları</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>İşlem Tipi</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Ödeme Yöntemi</TableHead>
                <TableHead>Referans No / Çek No</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unifiedTransactions.length > 0 ? (
                unifiedTransactions.map((item) => (
                  <TableRow key={`${item.transactionType}-${item.id}`}>
                    <TableCell>{safeFormatDate(item.date, 'dd.MM.yyyy')}</TableCell>
                    <TableCell>
                      {item.transactionType === 'purchase' ? (
                        <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Satın Alma</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">Ödeme</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.amount, item.currency)}
                    </TableCell>
                    <TableCell>{item.description || '-'}</TableCell>
                    <TableCell>
                      {'method' in item ? (
                        item.method === 'nakit' ? 'Nakit' :
                        item.method === 'banka' ? 'Banka Havalesi' :
                        item.method === 'krediKarti' ? 'Kredi Kartı' :
                        item.method === 'cek' ? 'Çek' : 'Diğer'
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {'referenceNumber' in item && item.referenceNumber ? item.referenceNumber :
                       'checkSerialNumber' in item && item.checkSerialNumber ? item.checkSerialNumber : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Bu tedarikçi için herhangi bir işlem bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 