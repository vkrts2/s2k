// src/lib/types.ts

export type Currency = "USD" | "TRY" | "EUR";

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
  customerId?: string; // Müşteriye özel iletişim geçmişi için eklendi
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
  website?: string;
  sector?: string;
  city?: string;
  district?: string;
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
  date?: Date;
  currency: Currency;
  stockItemId?: string | null;
  description: string;
  quantity?: string;
  unitPrice?: string;
  dateInput?: string; // Klavyeden tarih girerken geçici string alan
  taxRate?: string; // KDV oranı (faturalı satış için)
  invoiceType?: 'normal' | 'invoice'; // Satış türü
  invoiceFile?: File | null; // Fatura dosyası
};

export interface PurchaseFormValues {
  amount: string;
  date?: Date;
  dateInput?: string;
  currency: Currency;
  stockItemId?: string | null;
  quantityPurchased?: string;
  unitPrice?: string;
  description?: string;
  purchaseType: PurchaseType;
  manualProductName?: string;
  // Faturalı/kalemli alışlar için kalem listesi (UI ve persistence için)
  invoiceItems?: PurchaseInvoiceItem[];
}

export type PaymentFormValues = {
  amount: string;
  date?: Date;
  dateInput?: string;
  method: 'nakit' | 'krediKarti' | 'havale' | 'diger' | 'cek';
  currency: Currency;
  referenceNumber?: string | null;
  description?: string;
  checkDate?: Date | null;
  checkSerialNumber?: string | null;
  checkImageFile?: File | null;
  checkImageUrl?: string | null;
  checkImageData?: string | null; // data URL (base64)
  checkImageMimeType?: string | null;
};

export interface PaymentToSupplierFormValues {
  amount: string;
  date?: Date;
  dateInput?: string;
  method: string;
  currency: Currency;
  referenceNumber?: string | null;
  description?: string;
  checkDate?: Date | null;
  checkSerialNumber?: string | null;
}

export interface ContactHistoryFormValues {
  date: Date;
  type: 'phone' | 'email' | 'meeting' | 'other';
  summary: string;
  notes: string;
}

export type TaskFormValues = {
  description: string;
  dueDate?: Date;
  status: 'pending' | 'completed' | 'in-progress';
};

export interface SupplierTaskFormValues {
  description: string;
  dueDate?: Date;
  status: 'pending' | 'completed' | 'in-progress';
}

export interface Sale {
  id: string;
  customerId: string;
  transactionType: 'sale';
  amount: number;
  date: string; // ISO 8601 format
  currency: Currency;
  description?: string;
  category: TransactionCategory;
  tags: TransactionTag[];
  stockItemId?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  taxRate?: number; // KDV oranı
  taxAmount?: number; // KDV tutarı
  subtotal?: number; // Ara toplam
  items?: QuotationItem[]; // Faturalı satış kalemleri
  invoiceType?: 'normal' | 'invoice';
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

export interface Payment {
  id: string;
  customerId: string;
  transactionType: 'payment';
  date: string; // ISO 8601 format
  amount: number;
  currency: Currency;
  method: 'nakit' | 'krediKarti' | 'havale' | 'diger' | 'cek';
  description?: string;
  referenceNumber?: string | null;
  checkDate?: string | null;
  checkSerialNumber?: string | null;
  checkImageUrl?: string | null;
  checkImageData?: string | null;
  checkImageMimeType?: string | null;
  category: TransactionCategory;
  tags: TransactionTag[];
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
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
  purchaseType?: PurchaseType;
  manualProductName?: string;
  // Faturalı/kalemli alışlar için kalem listesi
  invoiceItems?: PurchaseInvoiceItem[];
}

export interface PaymentToSupplier {
  id: string;
  supplierId: string;
  amount: number;
  date: string;
  method: string;
  currency: Currency;
  referenceNumber?: string | null;
  description?: string;
  checkDate?: string | null;
  checkSerialNumber?: string | null;
  transactionType: 'paymentToSupplier';
  category: TransactionCategory;
  tags: TransactionTag[];
  createdAt: string;
  updatedAt: string;
}

export type StockTransaction = {
  id: string;
  date: string;
  transactionType: 'sale' | 'purchase';
  amount: number;
  currency: Currency;
  stockItemId: string;
  customerId?: string;
  supplierId?: string;
  quantitySold?: number;
  quantityPurchased?: number;
  unitPrice?: number;
  relatedId?: string; // İlgili satış/alış dokümanı ID'si
  unit?: string; // Birim bilgisi (adet, kg, mt...)
  balanceAfter?: number; // Hareket sonrası kalan stok miktarı
  action?: 'apply' | 'revert'; // Normal uygulama mı, telafi (revert) mi
  customerName?: string;
  supplierName?: string;
};

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
];

export type PortfolioSector = (typeof portfolioSectors)[number];

export interface PortfolioItem {
  id: string;
  companyName: string;
  gsm?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  district?: string;
  sector: PortfolioSector;
  notes?: string;
  taxId?: string;
  taxOffice?: string;
  contacted?: boolean; // Görüşme durumunu takip etmek için eklendi
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
  currentStock: number;
  salePrice?: {
    amount: number;
    currency: Currency;
  };
  createdAt: string;
  updatedAt: string;
}

// Fiyat Teklifi Tipleri
export interface QuotationItem {
  id?: string;
  stockItemId?: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate: number; // KDV oranı (ör: 10 veya 20)
  unit?: string; // Birim (ör: mt, kg, top)
}

// Satın alma (alış) kalemi — faturalı/kalemli alış kaydı için
export interface PurchaseInvoiceItem {
  productName: string;
  quantity?: number; // Firestore: undefined yerine null yazılabilir
  unit?: string; // örn: kg, adet, mt
  unitPrice?: number;
  taxRate?: number; // KDV oranı (stok/ürün alışlarında)
  // Stoğa bağlama için opsiyonel alan
  stockItemId?: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  date: string | Date;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  customerTaxOffice?: string;
  validUntil?: string | Date;
  items: QuotationItem[];
  subTotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  currency: 'TRY' | 'USD' | 'EUR';
  status: 'Taslak' | 'Gönderildi' | 'Kabul Edildi' | 'Reddedildi' | 'Süresi Doldu';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierTask extends BaseEntity {
  description: string;
  dueDate?: string;
  status: 'pending' | 'completed' | 'in-progress';
}

export interface Setting {
  id: string;
  [key: string]: any;
}

export interface Cost {
  id: string;
  description: string;
  userId: string;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

// Satın alma siparişi kalemi
export interface PurchaseOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Satın alma siparişi
export interface PurchaseOrder {
  id: string;
  supplierId: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'Beklemede' | 'Onaylandı' | 'Tamamlandı' | 'İptal Edildi';
  createdAt: string;
  updatedAt: string;
}

// Alış tipi
export enum PurchaseType {
  STOCK = 'stock',
  MANUAL = 'manual',
}

// TodoItem tipi eklendi
export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

// Sipariş Yönetimi için tip tanımlamaları
export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  specifications?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerId: string;
  orderDate: Date;
  deliveryDate: Date;
  status: 'pending' | 'confirmed' | 'in_production' | 'ready' | 'delivered' | 'cancelled';
  totalAmount: number;
  currency: string;
  items: OrderItem[];
  notes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt?: string;
  updatedAt?: string;
}

// Yeni: Çek yönetimi tipi
export interface BankCheck extends BaseEntity {
  checkNumber: string;
  bankName: string;
  branchName?: string;
  accountNumber?: string;
  amount: number;
  issueDate: string | Date;
  dueDate: string | Date;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  partyName: string;
  partyType: 'customer' | 'supplier';
  description?: string;
  images?: string[]; // Array of image file names or URLs
}
