import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Currency, Sale, Purchase, Payment, PaymentToSupplier, Customer, Supplier, Cost } from './types';
import { ReportFilters, EXCHANGE_RATES, ReportType } from './reportTypes';

// Para Birimi Formatlaması
export const formatCurrency = (amount: number, currency: Currency, locale: string = 'tr-TR'): string => {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
};

// Sayı Formatlaması
export const formatNumber = (number: number, locale: string = 'tr-TR'): string => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
};

// Tarih Formatlaması
export const formatDate = (date: string | Date, formatStr: string = 'dd.MM.yyyy'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: tr });
};

// Para Birimi Dönüşümü
export const convertCurrency = (amount: number, fromCurrency: Currency, toCurrency: Currency): number => {
  if (fromCurrency === toCurrency) return amount;
  return amount * EXCHANGE_RATES[fromCurrency][toCurrency];
};

// Tarih Aralığı Filtreleme
export const filterByDateRange = <T extends { date: string }>(
  data: T[],
  dateRange: { start: Date; end: Date }
): T[] => {
  return data.filter(item => {
    const itemDate = parseISO(item.date);
    return isWithinInterval(itemDate, { start: dateRange.start, end: dateRange.end });
  });
};

// Müşteri Filtreleme
export const filterByCustomer = <T extends { customerId: string }>(
  data: T[],
  customerId?: string
): T[] => {
  if (!customerId) return data;
  return data.filter(item => item.customerId === customerId);
};

// Tedarikçi Filtreleme
export const filterBySupplier = <T extends { supplierId: string }>(
  data: T[],
  supplierId?: string
): T[] => {
  if (!supplierId) return data;
  return data.filter(item => item.supplierId === supplierId);
};

// Para Birimi Filtreleme
export const filterByCurrency = <T extends { currency: Currency }>(
  data: T[],
  currency?: Currency
): T[] => {
  if (!currency) return data;
  return data.filter(item => item.currency === currency);
};

// Toplam Hesaplama
export const calculateTotal = (items: Array<{ amount: number; currency: Currency }>, targetCurrency: Currency): number => {
  return items.reduce((total, item) => {
    return total + convertCurrency(item.amount, item.currency, targetCurrency);
  }, 0);
};

// Para Birimi Bazında Gruplama
export const groupByCurrency = <T extends { amount: number; currency: Currency }>(
  items: T[]
): Record<Currency, number> => {
  const result: Record<Currency, number> = { TRY: 0, USD: 0, EUR: 0 };
  
  items.forEach(item => {
    result[item.currency] = (result[item.currency] || 0) + item.amount;
  });
  
  return result;
};

// Kategori Bazında Gruplama
export const groupByCategory = <T extends { amount: number; currency: Currency; category?: string }>(
  items: T[],
  targetCurrency: Currency
): Record<string, number> => {
  const result: Record<string, number> = {};
  
  items.forEach(item => {
    const category = item.category || 'Diğer';
    const amount = convertCurrency(item.amount, item.currency, targetCurrency);
    result[category] = (result[category] || 0) + amount;
  });
  
  return result;
};

// Aylık Gruplama
export const groupByMonth = <T extends { date: string; amount: number; currency: Currency }>(
  items: T[],
  targetCurrency: Currency
): Record<string, number> => {
  const result: Record<string, number> = {};
  
  items.forEach(item => {
    const monthKey = format(parseISO(item.date), 'yyyy-MM');
    const amount = convertCurrency(item.amount, item.currency, targetCurrency);
    result[monthKey] = (result[monthKey] || 0) + amount;
  });
  
  return result;
};

// Yüzde Hesaplama
export const calculatePercentage = (part: number, total: number): number => {
  if (total === 0) return 0;
  return (part / total) * 100;
};

// Gecikmiş Ödeme Hesaplama
export const calculateOverdueDays = (dueDate: string): number => {
  const due = parseISO(dueDate);
  const today = new Date();
  return Math.max(0, differenceInDays(today, due));
};

// Müşteri Bakiyesi Hesaplama
export const calculateCustomerBalance = (
  customerId: string,
  sales: Sale[],
  payments: Payment[],
  targetCurrency: Currency
): number => {
  const customerSales = sales.filter(s => s.customerId === customerId);
  const customerPayments = payments.filter(p => p.customerId === customerId);
  
  const totalSales = calculateTotal(customerSales, targetCurrency);
  const totalPayments = calculateTotal(customerPayments, targetCurrency);
  
  return totalSales - totalPayments;
};

// Tedarikçi Bakiyesi Hesaplama
export const calculateSupplierBalance = (
  supplierId: string,
  purchases: Purchase[],
  payments: PaymentToSupplier[],
  targetCurrency: Currency
): number => {
  const supplierPurchases = purchases.filter(p => p.supplierId === supplierId);
  const supplierPayments = payments.filter(p => p.supplierId === supplierId);
  
  const totalPurchases = calculateTotal(supplierPurchases, targetCurrency);
  const totalPayments = calculateTotal(supplierPayments, targetCurrency);
  
  return totalPurchases - totalPayments;
};

// Kar Marjı Hesaplama
export const calculateProfitMargin = (revenue: number, costs: number): number => {
  if (revenue === 0) return 0;
  return ((revenue - costs) / revenue) * 100;
};

// Rapor Dönemi Formatlaması
export const formatReportPeriod = (startDate: Date, endDate: Date): string => {
  const start = format(startDate, 'dd MMMM yyyy', { locale: tr });
  const end = format(endDate, 'dd MMMM yyyy', { locale: tr });
  return `${start} - ${end}`;
};

// Grafik Renkleri
export const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

// Grafik Verisi Oluşturma
export const createChartData = (
  labels: string[],
  datasets: Array<{ label: string; data: number[]; color?: string }>
) => {
  return {
    labels,
    datasets: datasets.map((dataset, index) => ({
      label: dataset.label,
      data: dataset.data,
      backgroundColor: dataset.color || CHART_COLORS[index % CHART_COLORS.length],
      borderColor: dataset.color || CHART_COLORS[index % CHART_COLORS.length],
      borderWidth: 1,
    })),
  };
};

// Rapor Başlığı Oluşturma
export const getReportTitle = (type: ReportType): string => {
  const titles: Record<ReportType, string> = {
    'income-expense': 'Gelir-Gider Raporu',
    'customer-sales-payments': 'Müşteri Satış ve Ödeme Raporu',
    'profit-loss': 'Kar-Zarar Raporu',
    'cash-flow': 'Nakit Akış Raporu',
    'receivables-payables': 'Tahsilat ve Borç Raporu',
    'expense-analysis': 'Gider Analizi Raporu',
  };
  return titles[type];
};

// Rapor Açıklaması Oluşturma
export const getReportDescription = (type: ReportType): string => {
  const descriptions: Record<ReportType, string> = {
    'income-expense': 'Belirtilen dönemdeki gelir ve gider hareketlerinin detaylı analizi',
    'customer-sales-payments': 'Müşteri bazında satış ve ödeme hareketlerinin özeti',
    'profit-loss': 'İşletmenin kar ve zarar durumunun detaylı analizi',
    'cash-flow': 'Nakit giriş ve çıkışlarının zaman içindeki dağılımı',
    'receivables-payables': 'Alacak ve borç durumlarının detaylı analizi',
    'expense-analysis': 'Gider kalemlerinin kategorik ve zamansal analizi',
  };
  return descriptions[type];
};

// Veri Doğrulama
export const validateReportData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  
  // Temel alanların varlığını kontrol et
  const requiredFields = ['id', 'date', 'amount'];
  return requiredFields.every(field => data.hasOwnProperty(field));
};

// Hata Mesajları
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'Bilinmeyen bir hata oluştu';
};

// Rapor Konfigürasyonu
export const DEFAULT_REPORT_CONFIG = {
  defaultCurrency: 'TRY' as Currency,
  dateFormat: 'dd.MM.yyyy',
  numberFormat: {
    decimal: ',',
    thousands: '.',
    precision: 2,
  },
  charts: {
    colors: CHART_COLORS,
    defaultHeight: 300,
  },
}; 