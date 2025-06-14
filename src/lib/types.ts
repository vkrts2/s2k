// src/lib/types.ts
import type { LucideIcon } from "lucide-react";

export type Currency = "USD" | "TRY";

export interface Price {
  amount: number;
  currency: Currency;
}

// Yeni: İletişim Geçmişi Öğesi
export interface ContactHistoryItem {
  id: string;
  date: string; // ISO string format
  type: 'phone' | 'email' | 'meeting' | 'other';
  summary: string;
  notes?: string;
  supplierId?: string; // Tedarikçiye özel iletişim geçmişi için eklendi
  createdAt: string; // ISO string format
  updatedAt: string; // ISO string format
}

// Yeni: Müşteri Görevi
export interface CustomerTask {
  id: string;
  description: string;
  dueDate?: string; // ISO string format (YYYY-MM-DD)
  status: 'pending' | 'completed' | 'in-progress';
  createdAt: string; // ISO string format
  updatedAt: string; // ISO string format
}

// Yeni: Tedarikçi Görevi (Müşteri Görevine benzer)
export interface SupplierTask {
  id: string;
  description: string;
  dueDate?: string; // ISO string format (YYYY-MM-DD)
  status: 'pending' | 'completed' | 'in-progress';
  createdAt: string; // ISO string format
  updatedAt: string; // ISO string format
  supplierId?: string; // Tedarikçiye özel görevler için eklendi
}

export interface BaseEntity {
  id: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string; // Vergi Numarası / TC Kimlik No
  notes?: string | null;
  createdAt: string; // ISO string format
  updatedAt?: string; // ISO string format
}

export interface Customer extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  taxOffice?: string;
  notes?: string | null;
  contactHistory?: ContactHistoryItem[];
  tasks?: CustomerTask[];
  defaultCurrency?: Currency;
}

export interface Supplier extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  taxOffice?: string;
  notes?: string | null;
  contactHistory?: ContactHistoryItem[];
  tasks?: SupplierTask[];
  defaultCurrency?: Currency;
}

export type TransactionCategory =
  | 'satis'
  | 'odeme'
  | 'iade'
  | 'indirim'
  | 'komisyon'
  | 'diger';

export type TransactionTag = {
  id: string;
  name: string;
  color: string;
};

// Unified Transaction interface for all transaction types
export interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: Currency;
  category: TransactionCategory;
  tags: TransactionTag[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export type SaleFormValues = {
  amount: string;
  date: Date;
  currency: Currency;
  stockItemId?: string;
  description: string;
  quantity?: string;
  unitPrice?: string;
};

export interface PurchaseFormValues {
  amount: string;
  date: Date;
  currency: Currency;
  stockItemId?: string;
  description?: string;
  quantityPurchased?: string;
  unitPrice?: string;
}

export type PaymentFormValues = {
  amount: string;
  date: Date;
  method: 'nakit' | 'krediKarti' | 'havale' | 'diger' | 'cek';
  currency: Currency;
  referenceNumber?: string | null;
  description?: string;
  checkDate?: Date | null;
  checkSerialNumber?: string | null;
};

export interface PaymentToSupplierFormValues {
  amount: string;
  date: Date;
  method: string;
  currency: Currency;
  referenceNumber?: string | null;
}

export interface ContactHistoryFormValues {
  date: Date;
  type: 'phone' | 'email' | 'meeting' | 'other';
  summary: string;
  notes: string;
}

export interface SupplierTaskFormValues {
  description: string;
  dueDate?: Date;
  status: 'pending' | 'completed' | 'in-progress';
}

export interface Sale {
  id: string;
  customerId: string;
  amount: number;
  date: string;
  currency: Currency;
  stockItemId?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  category: 'satis';
  tags: TransactionTag[];
  transactionType: 'sale';
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  customerId: string;
  referenceNumber?: string | null;
  amount: number;
  date: string;
  currency: Currency;
  category: 'odeme';
  tags: TransactionTag[];
  transactionType: 'payment';
  method: 'nakit' | 'krediKarti' | 'havale' | 'diger' | 'cek';
  description?: string;
  checkDate?: string | null; // ISO string formatında saklanacak
  checkSerialNumber?: string | null;
  createdAt: string; // ISO string format
  updatedAt: string; // ISO string format
}

export type UnifiedTransaction = (Sale & { transactionType: 'sale' }) | 
                                (Payment & { transactionType: 'payment' });

export interface Purchase extends Transaction {
  supplierId: string;
  description?: string;
  transactionType: 'purchase';
  stockItemId?: string | null;
  quantityPurchased?: number | null;
  unitPrice?: number | null;
}

export interface PaymentToSupplier extends Transaction {
  supplierId: string;
  method: string; // Ödeme yöntemi
  description?: string; // Ek açıklama
  referenceNumber?: string | null;
  transactionType: 'paymentToSupplier';
}

export type StockTransaction = {
  id: string;
  date: string;
  transactionType: 'sale' | 'purchase';
  amount: number;
  currency: Currency;
  stockItemId: string;
  quantitySold?: number;
  quantityPurchased?: number;
  unitPrice?: number;
  customerName?: string;
  supplierName?: string;
};

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string; // ISO string format
  dueDate?: string;   // Optional, ISO string format (YYYY-MM-DD)
  notes?: string;     // Optional
}

export const portfolioSectors = [
  "Ev Tekstili",
  "Promosyon",
  "İnşaat",
  "Çanta",
  "Ayakkabı",
  "Laminasyon",
  "Kapitone",
  "Mobilya",
  "Tarım",
  "Filtre"
] as const;

export type PortfolioSector = typeof portfolioSectors[number];

export interface PortfolioItem {
  id: string;
  companyName: string;
  phone?: string;
  address?: string;
  city?: string;
  sector: PortfolioSector;
  notes?: string;
  createdAt: string; // ISO string format
  updatedAt: string; // ISO string format
}

export interface ArchivedFile {
  id: string;
  name: string;
  type: string; // MIME type
  size: number; // in bytes
  uploadDate: string; // ISO string format
}

export interface UsefulLink {
  id: string;
  name: string;
  url: string;
  createdAt: string; // ISO string format
}

export interface StockItem {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  createdAt: string;
  updatedAt: string;
}

// Fiyat Teklifi Tipleri
export interface QuotationItem {
  id: string; // Her bir kalem için benzersiz ID (örn: crypto.randomUUID())
  stockItemId?: string; // Stoktan seçildiyse ID'si
  productName: string; // Stoktan seçilmemişse manuel ürün/hizmet adı
  quantity: number;
  unitPrice: number;
  total: number; // quantity * unitPrice
}

export type QuotationStatus = 'Taslak' | 'Gönderildi' | 'Kabul Edildi' | 'Reddedildi' | 'Süresi Doldu';

export interface Quotation {
  id: string;
  quotationNumber: string; // Örn: TEKLIF-2024-001
  customerId?: string; // Portföyden seçilen müşteri ID'si
  customerName: string; // Müşteri adı (Portföyden gelebilir veya manuel)
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  date: string; // Teklif tarihi (YYYY-MM-DD)
  validUntilDate?: string; // Geçerlilik tarihi (YYYY-MM-DD)
  items: QuotationItem[];
  subTotal: number;
  taxRate?: number; // KDV oranı, örn: 10, 20
  taxAmount?: number; // Hesaplanan KDV tutarı
  grandTotal: number;
  currency: Currency; // Teklifin genel para birimi
  status: QuotationStatus;
  createdAt: string; // ISO string format
  updatedAt: string; // ISO string format
}

export interface SupplierTask extends BaseEntity {
  description: string;
  dueDate?: string;
  status: 'pending' | 'completed' | 'in-progress';
}
