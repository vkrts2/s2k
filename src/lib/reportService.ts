// src/lib/reportService.ts

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  QuerySnapshot,
  DocumentData 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Sale, 
  Purchase, 
  Payment, 
  PaymentToSupplier, 
  Customer, 
  Supplier, 
  Cost,
  Currency 
} from './types';
import { 
  ReportFilters, 
  ReportType,
  IncomeExpenseReport,
  CustomerReport,
  ProfitLossReport,
  CashFlowReport,
  ReceivablesPayablesReport,
  ExpenseAnalysisReport
} from './reportTypes';
import {
  filterByDateRange,
  filterByCustomer,
  filterBySupplier,
  filterByCurrency,
  calculateTotal,
  groupByCurrency,
  groupByCategory,
  groupByMonth,
  calculatePercentage,
  calculateCustomerBalance,
  calculateSupplierBalance,
  calculateProfitMargin,
  formatReportPeriod,
  convertCurrency,
  formatDate
} from './reportUtils';

export class ReportService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Veri Çekme Fonksiyonları
  private async getSales(filters: ReportFilters): Promise<Sale[]> {
    const salesRef = collection(db, `users/${this.userId}/sales`);
    const snapshot = await getDocs(salesRef);
    let sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
    
    // Filtreleme
    sales = filterByDateRange(sales, filters.dateRange);
    if (filters.customerId) {
      sales = filterByCustomer(sales, filters.customerId);
    }
    if (filters.currency) {
      sales = filterByCurrency(sales, filters.currency);
    }
    
    return sales;
  }

  private async getPurchases(filters: ReportFilters): Promise<Purchase[]> {
    const purchasesRef = collection(db, `users/${this.userId}/purchases`);
    const snapshot = await getDocs(purchasesRef);
    let purchases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase));
    
    // Filtreleme
    purchases = filterByDateRange(purchases, filters.dateRange);
    if (filters.supplierId) {
      purchases = filterBySupplier(purchases, filters.supplierId);
    }
    if (filters.currency) {
      purchases = filterByCurrency(purchases, filters.currency);
    }
    
    return purchases;
  }

  private async getPayments(filters: ReportFilters): Promise<Payment[]> {
    const paymentsRef = collection(db, `users/${this.userId}/payments`);
    const snapshot = await getDocs(paymentsRef);
    let payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
    
    // Filtreleme
    payments = filterByDateRange(payments, filters.dateRange);
    if (filters.customerId) {
      payments = filterByCustomer(payments, filters.customerId);
    }
    if (filters.currency) {
      payments = filterByCurrency(payments, filters.currency);
    }
    
    return payments;
  }

  private async getPaymentsToSuppliers(filters: ReportFilters): Promise<PaymentToSupplier[]> {
    const paymentsRef = collection(db, `users/${this.userId}/paymentsToSuppliers`);
    const snapshot = await getDocs(paymentsRef);
    let payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentToSupplier));
    
    // Filtreleme
    payments = filterByDateRange(payments, filters.dateRange);
    if (filters.supplierId) {
      payments = filterBySupplier(payments, filters.supplierId);
    }
    if (filters.currency) {
      payments = filterByCurrency(payments, filters.currency);
    }
    
    return payments;
  }

  private async getCustomers(): Promise<Customer[]> {
    const customersRef = collection(db, `users/${this.userId}/customers`);
    const snapshot = await getDocs(customersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
  }

  private async getSuppliers(): Promise<Supplier[]> {
    const suppliersRef = collection(db, `users/${this.userId}/suppliers`);
    const snapshot = await getDocs(suppliersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
  }

  private async getCosts(filters: ReportFilters): Promise<Cost[]> {
    const costsRef = collection(db, `users/${this.userId}/costs`);
    const snapshot = await getDocs(costsRef);
    let costs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cost));
    // Cost modelinde date alanı yok, bu yüzden filtreleme yapılmıyor
    return costs;
  }

  // Gelir-Gider Raporu
  async generateIncomeExpenseReport(filters: ReportFilters): Promise<IncomeExpenseReport> {
    const [sales, purchases, payments, paymentsToSuppliers, customers, suppliers] = await Promise.all([
      this.getSales(filters),
      this.getPurchases(filters),
      this.getPayments(filters),
      this.getPaymentsToSuppliers(filters),
      this.getCustomers(),
      this.getSuppliers()
    ]);

    const targetCurrency = filters.currency || 'TRY';

    // Gelir hesaplamaları (satışlar + ödemeler)
    const incomeDetails = [
      ...sales.map(sale => ({
        date: sale.date,
        amount: sale.amount,
        currency: sale.currency,
        category: sale.category || 'Satış',
        description: sale.description || 'Satış',
        customerName: customers.find(c => c.id === sale.customerId)?.name
      })),
      ...payments.map(payment => ({
        date: payment.date,
        amount: payment.amount,
        currency: payment.currency,
        category: 'Ödeme',
        description: payment.description || 'Müşteri Ödemesi',
        customerName: customers.find(c => c.id === payment.customerId)?.name
      }))
    ];

    // Gider hesaplamaları (alışlar + devreden bakiyeler)
    const expenseDetails = [
      // Devreden bakiyeleri ekle (sadece description'da 'devreden bakiye' geçenler)
      ...purchases
        .filter(purchase => purchase.description && purchase.description.toLowerCase().includes('devreden bakiye'))
        .map(purchase => ({
          date: purchase.date,
          amount: purchase.amount,
          currency: purchase.currency,
          category: 'Devreden Bakiye',
          description: purchase.description || 'Devreden Bakiye',
          supplierName: suppliers.find(s => s.id === purchase.supplierId)?.name
        })),
      // Normal alışlar (description'da 'devreden bakiye' geçmeyenler)
      ...purchases
        .filter(purchase => !(purchase.description && purchase.description.toLowerCase().includes('devreden bakiye')))
        .map(purchase => ({
          date: purchase.date,
          amount: purchase.amount,
          currency: purchase.currency,
          category: purchase.category || 'Alış',
          description: purchase.description || 'Tedarikçi Alışı',
          supplierName: suppliers.find(s => s.id === purchase.supplierId)?.name
        })),
    ];

    const incomeTotal = calculateTotal(incomeDetails, targetCurrency);
    const expenseTotal = calculateTotal(expenseDetails, targetCurrency);
    const netIncome = incomeTotal - expenseTotal;

    return {
      period: formatReportPeriod(filters.dateRange.start, filters.dateRange.end),
      income: {
        total: incomeTotal,
        byCurrency: groupByCurrency(incomeDetails),
        byCategory: groupByCategory(incomeDetails, targetCurrency),
        details: incomeDetails
      },
      expenses: {
        total: expenseTotal,
        byCurrency: groupByCurrency(expenseDetails),
        byCategory: groupByCategory(expenseDetails, targetCurrency),
        details: expenseDetails
      },
      netIncome,
      netIncomeByCurrency: {
        TRY: convertCurrency(netIncome, targetCurrency, 'TRY'),
        USD: convertCurrency(netIncome, targetCurrency, 'USD'),
        EUR: convertCurrency(netIncome, targetCurrency, 'EUR')
      }
    };
  }

  // Müşteri Bazlı Rapor
  async generateCustomerReport(filters: ReportFilters): Promise<CustomerReport> {
    if (!filters.customerId) {
      throw new Error('Müşteri ID gerekli');
    }

    const [sales, payments, customers] = await Promise.all([
      this.getSales(filters),
      this.getPayments(filters),
      this.getCustomers()
    ]);

    const customer = customers.find(c => c.id === filters.customerId);
    if (!customer) {
      throw new Error('Müşteri bulunamadı');
    }

    const targetCurrency = filters.currency || 'TRY';

    const salesDetails = sales.map(sale => ({
      id: sale.id,
      date: sale.date,
      amount: sale.amount,
      currency: sale.currency,
      description: sale.description || 'Satış'
    }));

    const paymentsDetails = payments.map(payment => ({
      id: payment.id,
      date: payment.date,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      description: payment.description || 'Ödeme'
    }));

    const salesTotal = calculateTotal(salesDetails, targetCurrency);
    const paymentsTotal = calculateTotal(paymentsDetails, targetCurrency);
    const balance = salesTotal - paymentsTotal;

    return {
      customerId: customer.id,
      customerName: customer.name,
      period: formatReportPeriod(filters.dateRange.start, filters.dateRange.end),
      sales: {
        total: salesTotal,
        count: sales.length,
        byCurrency: groupByCurrency(salesDetails),
        details: salesDetails
      },
      payments: {
        total: paymentsTotal,
        count: payments.length,
        byCurrency: groupByCurrency(paymentsDetails),
        details: paymentsDetails
      },
      balance,
      balanceByCurrency: {
        TRY: convertCurrency(balance, targetCurrency, 'TRY'),
        USD: convertCurrency(balance, targetCurrency, 'USD'),
        EUR: convertCurrency(balance, targetCurrency, 'EUR')
      }
    };
  }

  // Kar-Zarar Raporu
  async generateProfitLossReport(filters: ReportFilters): Promise<ProfitLossReport> {
    const [sales, purchases] = await Promise.all([
      this.getSales(filters),
      this.getPurchases(filters)
    ]);

    const targetCurrency = filters.currency || 'TRY';

    const revenueTotal = calculateTotal(sales, targetCurrency);
    const costsTotal = calculateTotal(purchases, targetCurrency);
    const grossProfit = revenueTotal - costsTotal;
    const grossProfitMargin = calculateProfitMargin(revenueTotal, costsTotal);
    const netProfit = grossProfit; // Basit hesaplama, giderler eklenebilir
    const netProfitMargin = calculateProfitMargin(revenueTotal, costsTotal);

    return {
      period: formatReportPeriod(filters.dateRange.start, filters.dateRange.end),
      revenue: {
        total: revenueTotal,
        byCurrency: groupByCurrency(sales),
        byMonth: groupByMonth(sales, targetCurrency)
      },
      costs: {
        total: costsTotal,
        byCurrency: groupByCurrency(purchases),
        byMonth: groupByMonth(purchases, targetCurrency)
      },
      grossProfit,
      grossProfitByCurrency: {
        TRY: convertCurrency(grossProfit, targetCurrency, 'TRY'),
        USD: convertCurrency(grossProfit, targetCurrency, 'USD'),
        EUR: convertCurrency(grossProfit, targetCurrency, 'EUR')
      },
      grossProfitMargin,
      netProfit,
      netProfitByCurrency: {
        TRY: convertCurrency(netProfit, targetCurrency, 'TRY'),
        USD: convertCurrency(netProfit, targetCurrency, 'USD'),
        EUR: convertCurrency(netProfit, targetCurrency, 'EUR')
      },
      netProfitMargin
    };
  }

  // Nakit Akış Raporu
  async generateCashFlowReport(filters: ReportFilters): Promise<CashFlowReport> {
    const [payments, paymentsToSuppliers] = await Promise.all([
      this.getPayments(filters),
      this.getPaymentsToSuppliers(filters)
    ]);

    const targetCurrency = filters.currency || 'TRY';

    const operatingActivities = {
      cashIn: calculateTotal(payments, targetCurrency),
      cashOut: calculateTotal(paymentsToSuppliers, targetCurrency),
      netCash: 0,
      details: [
        ...payments.map(p => ({
          date: p.date,
          type: 'in' as const,
          amount: p.amount,
          currency: p.currency,
          description: p.description || 'Nakit Giriş'
        })),
        ...paymentsToSuppliers.map(p => ({
          date: p.date,
          type: 'out' as const,
          amount: p.amount,
          currency: p.currency,
          description: p.description || 'Nakit Çıkış'
        }))
      ]
    };

    operatingActivities.netCash = operatingActivities.cashIn - operatingActivities.cashOut;

    return {
      period: formatReportPeriod(filters.dateRange.start, filters.dateRange.end),
      operatingActivities,
      investingActivities: { cashIn: 0, cashOut: 0, netCash: 0 },
      financingActivities: { cashIn: 0, cashOut: 0, netCash: 0 },
      netCashFlow: operatingActivities.netCash,
      beginningBalance: 0, // Bu değer hesaplanabilir
      endingBalance: operatingActivities.netCash
    };
  }

  // Tahsilat ve Borç Raporu
  async generateReceivablesPayablesReport(filters: ReportFilters): Promise<ReceivablesPayablesReport> {
    const [sales, payments, purchases, paymentsToSuppliers, customers, suppliers] = await Promise.all([
      this.getSales(filters),
      this.getPayments(filters),
      this.getPurchases(filters),
      this.getPaymentsToSuppliers(filters),
      this.getCustomers(),
      this.getSuppliers()
    ]);

    const targetCurrency = filters.currency || 'TRY';

    // Müşteri alacakları
    const receivablesByCustomer = customers.map(customer => {
      const balance = calculateCustomerBalance(customer.id, sales, payments, targetCurrency);
      return {
        customerId: customer.id,
        customerName: customer.name,
        amount: Math.max(0, balance),
        currency: targetCurrency,
        overdueAmount: 0, // Bu hesaplanabilir
        daysOverdue: 0 // Bu hesaplanabilir
      };
    }).filter(r => r.amount > 0);

    // Tedarikçi borçları
    const payablesBySupplier = suppliers.map(supplier => {
      const balance = calculateSupplierBalance(supplier.id, purchases, paymentsToSuppliers, targetCurrency);
      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        amount: Math.max(0, balance),
        currency: targetCurrency,
        overdueAmount: 0, // Bu hesaplanabilir
        daysOverdue: 0 // Bu hesaplanabilir
      };
    }).filter(p => p.amount > 0);

    const receivablesTotal = receivablesByCustomer.reduce((sum, r) => sum + r.amount, 0);
    const payablesTotal = payablesBySupplier.reduce((sum, p) => sum + p.amount, 0);
    const netPosition = receivablesTotal - payablesTotal;

    return {
      period: formatReportPeriod(filters.dateRange.start, filters.dateRange.end),
      receivables: {
        total: receivablesTotal,
        byCurrency: groupByCurrency(receivablesByCustomer),
        byCustomer: receivablesByCustomer
      },
      payables: {
        total: payablesTotal,
        byCurrency: groupByCurrency(payablesBySupplier),
        bySupplier: payablesBySupplier
      },
      netPosition
    };
  }

  // Gider Analizi Raporu
  async generateExpenseAnalysisReport(filters: ReportFilters): Promise<ExpenseAnalysisReport> {
    const [purchases, paymentsToSuppliers, costs] = await Promise.all([
      this.getPurchases(filters),
      this.getPaymentsToSuppliers(filters),
      this.getCosts(filters)
    ]);

    const targetCurrency = filters.currency || 'TRY';

    // Tüm giderleri birleştir
    const allExpenses = [
      ...purchases.map(p => ({
        id: p.id,
        date: p.date,
        amount: p.amount,
        currency: p.currency,
        category: p.category || 'Alış',
        description: p.description || 'Tedarikçi Alışı'
      })),
      ...paymentsToSuppliers.map(p => ({
        id: p.id,
        date: p.date,
        amount: p.amount,
        currency: p.currency,
        category: 'Tedarikçi Ödemesi',
        description: p.description || 'Tedarikçi Ödemesi'
      })),
      ...costs.map(c => ({
        id: c.id,
        date: c.createdAt,
        amount: 0, // Cost modelinde amount yok, bu eklenebilir
        currency: 'TRY' as Currency,
        category: 'Gider',
        description: c.description
      }))
    ];

    const totalExpenses = calculateTotal(allExpenses, targetCurrency);
    const byCategory = groupByCategory(allExpenses, targetCurrency);
    const byMonth = groupByMonth(allExpenses, targetCurrency);

    // Kategori analizi
    const categoryAnalysis = Object.entries(byCategory).map(([category, amount]) => ({
      category,
      amount,
      percentage: calculatePercentage(amount, totalExpenses),
      count: allExpenses.filter(e => e.category === category).length
    })).sort((a, b) => b.amount - a.amount);

    // Aylık analiz
    const monthlyAnalysis = Object.entries(byMonth).map(([month, amount]) => ({
      month: formatDate(month + '-01', 'MMMM yyyy'),
      amount,
      count: allExpenses.filter(e => {
        const expenseMonth = formatDate(e.date, 'yyyy-MM');
        return expenseMonth === month;
      }).length
    })).sort((a, b) => a.month.localeCompare(b.month));

    // En yüksek giderler
    const topExpenses = allExpenses
      .sort((a, b) => convertCurrency(b.amount, b.currency, targetCurrency) - convertCurrency(a.amount, a.currency, targetCurrency))
      .slice(0, 10);

    return {
      period: formatReportPeriod(filters.dateRange.start, filters.dateRange.end),
      totalExpenses,
      byCategory: categoryAnalysis,
      byMonth: monthlyAnalysis,
      byCurrency: groupByCurrency(allExpenses),
      topExpenses
    };
  }

  // Ana rapor oluşturma fonksiyonu
  async generateReport(type: ReportType, filters: ReportFilters) {
    try {
      switch (type) {
        case 'income-expense':
          return await this.generateIncomeExpenseReport(filters);
        case 'customer-sales-payments':
          return await this.generateCustomerReport(filters);
        case 'profit-loss':
          return await this.generateProfitLossReport(filters);
        case 'cash-flow':
          return await this.generateCashFlowReport(filters);
        case 'receivables-payables':
          return await this.generateReceivablesPayablesReport(filters);
        case 'expense-analysis':
          return await this.generateExpenseAnalysisReport(filters);
        default:
          throw new Error('Geçersiz rapor türü');
      }
    } catch (error) {
      console.error('Rapor oluşturma hatası:', error);
      throw error;
    }
  }
} 