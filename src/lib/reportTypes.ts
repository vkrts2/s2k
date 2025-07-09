import { Currency, Sale, Purchase, Payment, PaymentToSupplier, Customer, Supplier, Cost } from './types';

// Rapor Filtreleri
export interface ReportFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  customerId?: string;
  supplierId?: string;
  currency?: Currency;
  category?: string;
}

// Rapor Türleri
export type ReportType = 
  | 'income-expense'
  | 'customer-sales-payments'
  | 'profit-loss'
  | 'cash-flow'
  | 'receivables-payables'
  | 'expense-analysis';

// Para Birimi Dönüşüm Oranları (gerçek uygulamada API'den alınacak)
export const EXCHANGE_RATES: Record<Currency, Record<Currency, number>> = {
  TRY: { TRY: 1, USD: 0.031, EUR: 0.029 },
  USD: { TRY: 32.5, USD: 1, EUR: 0.93 },
  EUR: { TRY: 35, USD: 1.08, EUR: 1 }
};

// Gelir-Gider Raporu
export interface IncomeExpenseReport {
  period: string;
  income: {
    total: number;
    byCurrency: Record<Currency, number>;
    byCategory: Record<string, number>;
    details: Array<{
      date: string;
      amount: number;
      currency: Currency;
      category: string;
      description: string;
      customerName?: string;
    }>;
  };
  expenses: {
    total: number;
    byCurrency: Record<Currency, number>;
    byCategory: Record<string, number>;
    details: Array<{
      date: string;
      amount: number;
      currency: Currency;
      category: string;
      description: string;
      supplierName?: string;
    }>;
  };
  netIncome: number;
  netIncomeByCurrency: Record<Currency, number>;
}

// Müşteri Bazlı Rapor
export interface CustomerReport {
  customerId: string;
  customerName: string;
  period: string;
  sales: {
    total: number;
    count: number;
    byCurrency: Record<Currency, number>;
    details: Array<{
      id: string;
      date: string;
      amount: number;
      currency: Currency;
      description: string;
    }>;
  };
  payments: {
    total: number;
    count: number;
    byCurrency: Record<Currency, number>;
    details: Array<{
      id: string;
      date: string;
      amount: number;
      currency: Currency;
      method: string;
      description: string;
    }>;
  };
  balance: number; // sales - payments
  balanceByCurrency: Record<Currency, number>;
}

// Kar-Zarar Raporu
export interface ProfitLossReport {
  period: string;
  revenue: {
    total: number;
    byCurrency: Record<Currency, number>;
    byMonth: Record<string, number>;
  };
  costs: {
    total: number;
    byCurrency: Record<Currency, number>;
    byMonth: Record<string, number>;
  };
  grossProfit: number;
  grossProfitByCurrency: Record<Currency, number>;
  grossProfitMargin: number; // yüzde
  netProfit: number;
  netProfitByCurrency: Record<Currency, number>;
  netProfitMargin: number; // yüzde
}

// Nakit Akış Raporu
export interface CashFlowReport {
  period: string;
  operatingActivities: {
    cashIn: number;
    cashOut: number;
    netCash: number;
    details: Array<{
      date: string;
      type: 'in' | 'out';
      amount: number;
      currency: Currency;
      description: string;
    }>;
  };
  investingActivities: {
    cashIn: number;
    cashOut: number;
    netCash: number;
  };
  financingActivities: {
    cashIn: number;
    cashOut: number;
    netCash: number;
  };
  netCashFlow: number;
  beginningBalance: number;
  endingBalance: number;
}

// Tahsilat ve Borç Raporu
export interface ReceivablesPayablesReport {
  period: string;
  receivables: {
    total: number;
    byCurrency: Record<Currency, number>;
    byCustomer: Array<{
      customerId: string;
      customerName: string;
      amount: number;
      currency: Currency;
      overdueAmount: number;
      daysOverdue: number;
    }>;
  };
  payables: {
    total: number;
    byCurrency: Record<Currency, number>;
    bySupplier: Array<{
      supplierId: string;
      supplierName: string;
      amount: number;
      currency: Currency;
      overdueAmount: number;
      daysOverdue: number;
    }>;
  };
  netPosition: number;
}

// Gider Analizi Raporu
export interface ExpenseAnalysisReport {
  period: string;
  totalExpenses: number;
  byCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  byMonth: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
  byCurrency: Record<Currency, number>;
  topExpenses: Array<{
    id: string;
    date: string;
    amount: number;
    currency: Currency;
    category: string;
    description: string;
  }>;
}

// Grafik Veri Tipleri
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

// Rapor Sonuçları
export interface ReportResult {
  type: ReportType;
  filters: ReportFilters;
  data: IncomeExpenseReport | CustomerReport | ProfitLossReport | CashFlowReport | ReceivablesPayablesReport | ExpenseAnalysisReport;
  generatedAt: string;
  currency: Currency;
}

// PDF/Excel Çıktı Seçenekleri
export interface ExportOptions {
  format: 'pdf' | 'excel';
  includeCharts: boolean;
  includeDetails: boolean;
  currency: Currency;
  language: 'tr' | 'en';
}

// Rapor Konfigürasyonu
export interface ReportConfig {
  defaultCurrency: Currency;
  dateFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
    precision: number;
  };
  charts: {
    colors: string[];
    defaultHeight: number;
  };
} 