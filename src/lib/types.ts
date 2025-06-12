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
  notes?: string; // İletişimle ilgili ek notlar
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
}

export interface BaseEntity {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string; // Vergi Numarası / TC Kimlik No
  notes?: string | null;
  createdAt: string; // ISO string format
  updatedAt?: string; // ISO string format
}

export interface Customer extends BaseEntity {
  contactHistory?: ContactHistoryItem[]; // Yeni alan
  tasks?: CustomerTask[]; // Yeni alan
}

export interface Supplier extends BaseEntity {
  contactHistory?: ContactHistoryItem[]; // Yeni alan
  tasks?: SupplierTask[]; // Yeni alan
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
}

export interface Sale extends Transaction {
  customerId: string;
  description?: string;
  transactionType: 'sale';
  stockItemId?: string; // Bu alanlar isteğe bağlı olmalı
  quantity?: number; // Bu alanlar isteğe bağlı olmalı
  unitPrice?: number; // Bu alanlar isteğe bağlı olmalı
  totalPrice?: number; // Bu alanlar isteğe bağlı olmalı
}

export interface Payment extends Transaction {
  customerId: string;
  paymentMethod: 'nakit' | 'krediKarti' | 'havale' | 'diger';
  referenceNumber?: string;
  transactionType: 'payment';
}

export interface Purchase extends Transaction {
  supplierId: string;
  description?: string;
  transactionType: 'purchase';
  stockItemId?: string;
  quantityPurchased?: number;
  unitPrice?: number;
}

export interface PaymentToSupplier extends Transaction {
  supplierId: string;
  method: string; // Ödeme yöntemi
  description?: string; // Ek açıklama
  referenceNumber?: string;
  transactionType: 'paymentToSupplier';
}

// Unified transaction type for combined lists
export type UnifiedTransaction = Sale | Payment | Purchase | PaymentToSupplier;

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
  currentStock: number;
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
