// src/lib/storage.ts
import { db } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, setDoc, getDoc, limit, startAfter, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
// Server build için firebase-admin sadece server dosyalarında import edilmeli.
// Storage katmanı API route üzerinden çağrıldığı için burada ayrıca admin importuna gerek yok.
import { formatISO, parseISO, format, addDays } from 'date-fns';
import { buildDailyFifoAggregates, buildDailyFifoByCustomer } from './analytics';
import type { Customer, Sale, Payment, Currency, Supplier, Purchase, PaymentToSupplier, TodoItem, PortfolioItem, ArchivedFile, UsefulLink, StockItem, Price, Quotation, QuotationItem, ContactHistoryItem, SupplierTask, Cost, Order, OrderItem, StockTransaction } from "./types";
import type { BankCheck } from "./types";
// import { storeFileInDB, deleteFileFromDB } from './indexedDBStorage'; // Firebase Storage kullanılacaksa bu kısım değişecek
import { useAuth } from '@/contexts/AuthContext';

// localStorage anahtarları kaldırıldı, artık Firestore koleksiyon yolları kullanılacak

// isClient ve localStorage yardımcıları kaldırıldı

// Firebase Storage referansı
const storage = getStorage();

// Yardımcı fonksiyon: Dosyayı Firebase Storage'a yükler ve URL'sini döndürür
export const uploadFileToFirebaseStorage = async (uid: string, file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, `${uid}/${path}/${file.name}_${Date.now()}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};

// -------------------- Analytics Daily By Customer --------------------
export const rebuildAnalyticsDailyByCustomer = async (
  uid: string,
  fromISO?: string,
  toISO?: string
): Promise<number> => {
  if (!uid) return 0;
  try {
    // Hareketleri tarih aralığına göre çek
    const parts: any[] = [];
    if (fromISO) parts.push(where('date', '>=', fromISO));
    if (toISO) parts.push(where('date', '<=', toISO));
    parts.push(orderBy('date', 'asc'));
    const qref = query(_getUserCollectionRef(uid, 'stockMovements'), ...parts);
    const snap = await getDocs(qref);
    const movements: StockTransaction[] = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));

    // Günlük müşteri bazlı özetleri oluştur
    const daily = buildDailyFifoByCustomer(movements as any);
    const colRef = _getUserCollectionRef(uid, 'analyticsDailyByCustomer');
    let count = 0;
    for (const key of Object.keys(daily)) {
      const row = (daily as any)[key];
      const docId = `${row.dateKey}_${row.customerId}`;
      await setDoc(doc(colRef, docId), row, { merge: true } as any);
      count++;
    }
    return count;
  } catch (e) {
    console.error('rebuildAnalyticsDailyByCustomer error', e);
    return 0;
  }
};

export const getAnalyticsDailyByCustomer = async (
  uid: string,
  opts?: { from?: string; to?: string; customerId?: string }
): Promise<Array<{ id: string; dateKey: string; customerId: string; soldQty: number; salesAmount: number; cogs: number; profit: number }>> => {
  if (!uid) return [];
  try {
    const colRef = _getUserCollectionRef(uid, 'analyticsDailyByCustomer');
    const parts: any[] = [];
    if (opts?.from) parts.push(where('dateKey', '>=', opts.from.slice(0,10)));
    if (opts?.to) parts.push(where('dateKey', '<=', opts.to.slice(0,10)));
    if (opts?.customerId) parts.push(where('customerId', '==', opts.customerId));
    parts.push(orderBy('dateKey', 'asc'));
    const qref = query(colRef, ...parts);
    const snap = await getDocs(qref);
    return snap.docs.map((d:any)=> ({ id: d.id, ...(d.data() as any) }));
  } catch (e) {
    console.error('getAnalyticsDailyByCustomer error', e);
    return [];
  }
};

// Read analyticsDaily rows with optional filters
export const getAnalyticsDaily = async (
  uid: string,
  opts?: { from?: string; to?: string; stockItemId?: string }
): Promise<Array<{ id: string; dateKey: string; productId: string; currency?: string; purchasedQty: number; purchasedAmount: number; soldQty: number; salesAmount: number; cogs: number; profit: number }>> => {
  if (!uid) return [];
  try {
    const colRef = _getUserCollectionRef(uid, 'analyticsDaily');
    const parts: any[] = [];
    // dateKey alanı YYYY-MM-DD, string karşılaştırması için aralık uygun
    if (opts?.from) parts.push(where('dateKey', '>=', opts.from.slice(0,10)));
    if (opts?.to) parts.push(where('dateKey', '<=', opts.to.slice(0,10)));
    if (opts?.stockItemId) parts.push(where('productId', '==', opts.stockItemId));
    parts.push(orderBy('dateKey', 'asc'));
    const qref = query(colRef, ...parts);
    const snap = await getDocs(qref);
    return snap.docs.map((d:any)=> ({ id: d.id, ...(d.data() as any) }));
  } catch (e) {
    console.error('getAnalyticsDaily error', e);
    return [];
  }
};

export const getStockMovementsPage = async (
  uid: string,
  opts?: { filters?: { stockItemId?: string; type?: 'purchase' | 'sale' | 'all'; from?: string; to?: string }, limitSize?: number, startAfterDate?: string }
): Promise<{ items: StockTransaction[]; nextCursor?: string }> => {
  if (!uid) return { items: [] };
  try {
    const col = _getUserCollectionRef(uid, 'stockMovements');
    const parts: any[] = [];
    const f = opts?.filters;
    if (f?.type && f.type !== 'all') parts.push(where('transactionType', '==', f.type));
    if (f?.stockItemId) parts.push(where('stockItemId', '==', f.stockItemId));
    if (f?.from) parts.push(where('date', '>=', f.from));
    if (f?.to) parts.push(where('date', '<=', f.to));
    parts.push(orderBy('date', 'desc'));
    if (opts?.startAfterDate) parts.push(startAfter(opts.startAfterDate));
    parts.push(limit(Math.max(1, Math.min(200, opts?.limitSize ?? 50))));

    const qref = query(col, ...parts);
    const snap = await getDocs(qref);
    const items: StockTransaction[] = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
    const nextCursor = items.length > 0 ? items[items.length - 1].date : undefined;
    return { items, nextCursor };
  } catch (e) {
    console.error('getStockMovementsPage error', e);
    return { items: [] };
  }
};

// Yardımcı fonksiyon: Kullanıcıya özel koleksiyon referansı döndürür
export const _getUserCollectionRef = (uid: string, collectionName: string) => {
  console.log(`_getUserCollectionRef called for collection: ${collectionName}, with uid: ${uid}`);
  if (!uid) {
    throw new Error("User ID (uid) is required for Firestore operations.");
  }
  return collection(db, "users", uid, collectionName);
};

// Yeni: Kullanıcı verilerini Firestore'dan çeken fonksiyon
export const getUserById = async (uid: string): Promise<any | null> => {
  if (!uid) {
    console.error("getUserById: User ID (uid) is missing.");
    return null;
  }
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log("getUserById: No such user document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return null;
  }
};

// Customer Functions
export const getCustomers = async (uid: string): Promise<Customer[]> => {
  console.log(`getCustomers called with uid: ${uid}`);
  if (!uid) {
    console.error("getCustomers: User ID (uid) is missing.");
    return [];
  }
  try {
    // Sadece customers koleksiyonundan müşteri verilerini çek
    const customersQuery = query(_getUserCollectionRef(uid, "customers"), orderBy("createdAt", "desc"));
    const customersSnapshot = await getDocs(customersQuery);
    const customers = customersSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data() as Omit<Customer, 'id'>
    }));
    return customers;
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
};

export const getCustomerById = async (uid: string, customerId: string): Promise<Customer | undefined> => {
  const customerDocRef = doc(_getUserCollectionRef(uid, "customers"), customerId);
  const docSnap = await getDoc(customerDocRef); // getDoc import edildi
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() as Omit<Customer, 'id'> };
  }
  return undefined;
};

export const getCustomerByName = async (uid: string, customerName: string): Promise<Customer | null> => {
  if (!uid || !customerName) {
    console.error("getCustomerByName: User ID or customer name is missing.");
    return null;
  }
  try {
    const customersQuery = query(_getUserCollectionRef(uid, "customers"), where("name", "==", customerName));
    const customersSnapshot = await getDocs(customersQuery);
    if (!customersSnapshot.empty) {
      const customerDoc = customersSnapshot.docs[0];
      return { id: customerDoc.id, ...customerDoc.data() as Omit<Customer, 'id'> };
    }
    return null;
  } catch (error) {
    console.error("Error fetching customer by name:", error);
    return null;
  }
};

export const addCustomer = async (uid: string, customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
  const now = formatISO(new Date());
  const newCustomerData = {
    ...customerData,
    createdAt: now,
    updatedAt: now,
    notes: customerData.notes || null,
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "customers"), newCustomerData);
  return { ...newCustomerData, id: docRef.id } as Customer;
};

export const updateCustomer = async (uid: string, updatedCustomer: Customer): Promise<Customer> => {
  const now = formatISO(new Date());
  const customerDocRef = doc(_getUserCollectionRef(uid, "customers"), updatedCustomer.id);
  const finalCustomer = { ...updatedCustomer, updatedAt: now, notes: updatedCustomer.notes || null };
  await updateDoc(customerDocRef, finalCustomer);
  return finalCustomer;
};

export const deleteCustomer = async (uid: string, customerId: string): Promise<void> => {
  const customerDocRef = doc(_getUserCollectionRef(uid, "customers"), customerId);
  await deleteDoc(customerDocRef);

  // Müşteriye ait satışları sil
  const salesQuery = query(_getUserCollectionRef(uid, "sales"), where("customerId", "==", customerId));
  const salesSnapshot = await getDocs(salesQuery);
  salesSnapshot.forEach(async (saleDoc: QueryDocumentSnapshot<DocumentData>) => {
    await deleteDoc(doc(_getUserCollectionRef(uid, "sales"), saleDoc.id));
  });

  // Müşteriye ait ödemeleri sil
  const paymentsQuery = query(_getUserCollectionRef(uid, "payments"), where("customerId", "==", customerId));
  const paymentsSnapshot = await getDocs(paymentsQuery);
  paymentsSnapshot.forEach(async (paymentDoc: QueryDocumentSnapshot<DocumentData>) => {
    await deleteDoc(doc(_getUserCollectionRef(uid, "payments"), paymentDoc.id));
  });
};

// Stock Item Functions
export const getStockItems = async (uid: string): Promise<StockItem[]> => {
  if (!uid) {
    console.error("getStockItems: User ID (uid) is missing. Returning empty array.");
    return [];
  }
  try {
    const q = query(_getUserCollectionRef(uid, "stockItems"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    // Add logging to inspect querySnapshot and its docs property
    console.log("getStockItems - querySnapshot:", querySnapshot);

    if (!Array.isArray(querySnapshot.docs)) {
      console.error("getStockItems: querySnapshot.docs is not an array.", querySnapshot.docs);
      return [];
    }

    const items: StockItem[] = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data() as Omit<StockItem, 'id'>
    }));
    return items.sort((a, b) => {
      if (a.name && b.name) {
        const nameCompare = a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' });
        if (nameCompare !== 0) return nameCompare;
      }
      try {
          return parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime();
      } catch(e) { return 0; }
    });
  } catch (error) {
    console.error("Error fetching stock items:", error);
    return [];
  }
};

export const getStockItemById = async (uid: string, itemId: string): Promise<StockItem | undefined> => {
  const stockItemDocRef = doc(_getUserCollectionRef(uid, "stockItems"), itemId);
  const docSnap = await getDoc(stockItemDocRef); // getDoc import edildi
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() as Omit<StockItem, 'id'> };
  }
  return undefined;
};

export const addStockItem = async (uid: string, itemData: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<StockItem> => {
  console.log("addStockItem çağrıldı, itemData:", itemData);
  const now = formatISO(new Date());
  const dataForFirestore: any = {
    ...itemData,
    createdAt: now,
    updatedAt: now,
  };

  console.log("addStockItem - Firestore'a gönderilecek veri:", dataForFirestore);
  const docRef = await addDoc(_getUserCollectionRef(uid, "stockItems"), dataForFirestore);
  return { ...dataForFirestore, id: docRef.id } as StockItem;
};

export const updateStockItem = async (uid: string, updatedItemData: StockItem): Promise<StockItem> => {
  console.log("updateStockItem çağrıldı, updatedItemData:", updatedItemData);
  const now = formatISO(new Date());
  const stockItemDocRef = doc(_getUserCollectionRef(uid, "stockItems"), updatedItemData.id);
  
  const { id, ...restOfUpdatedData } = updatedItemData;
  const dataForFirestore: any = {
    ...restOfUpdatedData,
    updatedAt: now,
  };

  console.log("updateStockItem - Firestore'a gönderilecek veri:", dataForFirestore);
  await updateDoc(stockItemDocRef, dataForFirestore);
  return { ...dataForFirestore, id: updatedItemData.id } as StockItem;
};

export const deleteStockItem = async (uid: string, itemId: string): Promise<void> => {
  const stockItemDocRef = doc(_getUserCollectionRef(uid, "stockItems"), itemId);
  await deleteDoc(stockItemDocRef);
};

// Sale Functions
export const getSales = async (uid: string, customerId?: string): Promise<Sale[]> => {
  console.log(`getSales called with uid: ${uid}`);
  if (!uid) {
    console.error("getSales: User ID (uid) is missing.");
    return [];
  }
  try {
    let salesQuery = query(_getUserCollectionRef(uid, "sales"), orderBy("date", "desc"));
    if (customerId) {
      salesQuery = query(salesQuery, where("customerId", "==", customerId));
    }
    const querySnapshot = await getDocs(salesQuery);
    console.log("getSales - querySnapshot.docs:", querySnapshot.docs);
    const sales: Sale[] = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
      let description = doc.data().description;
      if (!description && doc.data().stockItemId) {
        description = "Stok Ürünü Satışı";
      } else if (!description) {
        description = "Genel Satış";
      }
      return {
        id: doc.id,
        ...doc.data() as Omit<Sale, 'id'>,
        currency: doc.data().currency || 'TRY',
        description: description
      };
    });
    return sales;
  } catch (error) {
    console.error("Error fetching sales:", error);
    return [];
  }
};

export const getSaleById = async (uid: string, saleId: string): Promise<Sale | undefined> => {
  const saleDocRef = doc(_getUserCollectionRef(uid, "sales"), saleId);
  const docSnap = await getDoc(saleDocRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() as Omit<Sale, 'id'> };
  }
  return undefined;
};

export const addSale = async (uid: string, saleData: Omit<Sale, 'id' | 'transactionType' | 'createdAt' | 'updatedAt'>): Promise<Sale> => {
  let description = saleData.description;
  if (saleData.stockItemId && !description) {
    const stockItem = await getStockItemById(uid, saleData.stockItemId); // uid eklendi ve await
    description = stockItem ? stockItem.name : "Stok Ürünü Satışı";
  } else if (!description) {
    description = "Genel Satış";
  }

  const now = formatISO(new Date());
  const newSaleData: any = {
    ...saleData,
    transactionType: 'sale',
    description: description,
    createdAt: now,
    updatedAt: now,
  };

  // Firestore 'undefined' değeri desteklemez; undefined olan alanları kaldır
  const sanitized = Object.fromEntries(
    Object.entries(newSaleData).filter(([, value]) => value !== undefined)
  );

  // Stok yeterlilik kontrolü (negatif stok engeli)
  // Tekil satış kalemi
  const singleQtyToSell = Number((sanitized as any).quantity);
  const singleItemId = (sanitized as any).stockItemId as string | undefined;
  if (singleItemId && Number.isFinite(singleQtyToSell) && singleQtyToSell > 0) {
    const item = await getStockItemById(uid, singleItemId);
    const available = item?.currentStock ?? 0;
    if (available < singleQtyToSell) {
      throw new Error(`Yetersiz stok: ${item?.name || singleItemId}. Mevcut: ${available}, İstenen: ${singleQtyToSell}`);
    }
  }
  // Faturalı kalemler
  if (Array.isArray((sanitized as any).items)) {
    for (const it of (sanitized as any).items as any[]) {
      const q = Number(it?.quantity);
      const sid = it?.stockItemId as string | undefined;
      if (sid && Number.isFinite(q) && q > 0) {
        const item = await getStockItemById(uid, sid);
        const available = item?.currentStock ?? 0;
        if (available < q) {
          throw new Error(`Yetersiz stok: ${item?.name || sid}. Mevcut: ${available}, İstenen: ${q}`);
        }
      }
    }
  }

  const docRef = await addDoc(_getUserCollectionRef(uid, "sales"), sanitized as any);

  // Stock adjustment and movement recording
  try {
    // Single-item sale
    const singleQty = Number((sanitized as any).quantity);
    const singleUnitPrice = (sanitized as any).unitPrice != null ? Number((sanitized as any).unitPrice) : undefined;
    const singleAmount = (sanitized as any).amount != null ? Number((sanitized as any).amount) : undefined;
    if (sanitized.stockItemId && Number.isFinite(singleQty) && singleQty > 0) {
      await _adjustStockAndRecordMovement(uid, sanitized.stockItemId as string, -Math.abs(singleQty), sanitized.date as string, {
        unitPrice: singleUnitPrice,
        relatedId: docRef.id,
        amount: singleAmount,
        customerId: (sanitized as any).customerId,
      });
    }
    // Invoice items
    if (Array.isArray((sanitized as any).items)) {
      for (const it of (sanitized as any).items as any[]) {
        const q = Number(it?.quantity);
        const up = it?.unitPrice != null ? Number(it.unitPrice) : undefined;
        if (it?.stockItemId && Number.isFinite(q) && q > 0) {
          await _adjustStockAndRecordMovement(uid, it.stockItemId as string, -Math.abs(q), sanitized.date as string, {
            unitPrice: up,
            relatedId: docRef.id,
            amount: (up != null && Number.isFinite(q)) ? up * q : undefined,
            customerId: (sanitized as any).customerId,
          });
        }
      }
    }
  } catch (e) {
    console.error('addSale stock adjust error:', e);
  }

  return { ...(sanitized as any), id: docRef.id } as Sale;
};

export const updateSale = async (uid: string, updatedSaleData: Sale): Promise<Sale> => {
  const saleDocRef = doc(_getUserCollectionRef(uid, "sales"), updatedSaleData.id);

  // 1) Eski veriyi çek ve stok etkisini geri al (eskiyi iade = stok artır)
  const prevSnap = await getDoc(saleDocRef);
  if (prevSnap.exists()) {
    const prev = prevSnap.data() as any;
    // Tekil kalem
    const pq = Number(prev?.quantity);
    if (prev?.stockItemId && Number.isFinite(pq) && pq > 0) {
      await _adjustStockAndRecordMovement(uid, String(prev.stockItemId), Math.abs(pq), prev.date as string, {
        unitPrice: prev.unitPrice != null ? Number(prev.unitPrice) : undefined,
        relatedId: updatedSaleData.id,
        amount: prev.amount != null ? Number(prev.amount) : undefined,
        action: 'revert',
      });
    }
    // Faturalı kalemler
    if (Array.isArray(prev?.items)) {
      for (const it of prev.items as any[]) {
        const q = Number(it?.quantity);
        if (it?.stockItemId && Number.isFinite(q) && q > 0) {
          await _adjustStockAndRecordMovement(uid, String(it.stockItemId), Math.abs(q), prev.date as string, {
            unitPrice: it.unitPrice != null ? Number(it.unitPrice) : undefined,
            relatedId: updatedSaleData.id,
            amount: it.unitPrice != null && Number.isFinite(q) ? Number(it.unitPrice) * q : undefined,
            action: 'revert',
          });
        }
      }
    }
  }

  // 2) Güncel veriyi kaydet
  let dataToUpdate: Partial<Sale> = {
    amount: updatedSaleData.amount,
    date: updatedSaleData.date,
    currency: updatedSaleData.currency,
    description: updatedSaleData.description,
    stockItemId: updatedSaleData.stockItemId,
    quantity: updatedSaleData.quantity,
    unitPrice: updatedSaleData.unitPrice,
    invoiceType: updatedSaleData.invoiceType,
    items: updatedSaleData.items,
    taxRate: updatedSaleData.taxRate,
    taxAmount: updatedSaleData.taxAmount,
    subtotal: updatedSaleData.subtotal,
    updatedAt: new Date().toISOString(),
  };
  dataToUpdate = Object.fromEntries(
    Object.entries(dataToUpdate).filter(([, value]) => value !== undefined)
  ) as Partial<Sale>;
  await updateDoc(saleDocRef, dataToUpdate);

  // 3) Yeni verinin stok etkisini uygula (satış = stok azalt)
  try {
    // Yeterlilik kontrolü: tekil kalem
    const checkSingleQty = Number(updatedSaleData.quantity);
    if (updatedSaleData.stockItemId && Number.isFinite(checkSingleQty) && checkSingleQty > 0) {
      const item = await getStockItemById(uid, String(updatedSaleData.stockItemId));
      const available = item?.currentStock ?? 0;
      if (available < checkSingleQty) {
        throw new Error(`Yetersiz stok: ${item?.name || updatedSaleData.stockItemId}. Mevcut: ${available}, İstenen: ${checkSingleQty}`);
      }
    }
    // Yeterlilik kontrolü: faturalı kalemler
    if (Array.isArray(updatedSaleData.items)) {
      for (const it of updatedSaleData.items as any[]) {
        const qcheck = Number(it?.quantity);
        if (it?.stockItemId && Number.isFinite(qcheck) && qcheck > 0) {
          const item = await getStockItemById(uid, String(it.stockItemId));
          const available = item?.currentStock ?? 0;
          if (available < qcheck) {
            throw new Error(`Yetersiz stok: ${item?.name || it.stockItemId}. Mevcut: ${available}, İstenen: ${qcheck}`);
          }
        }
      }
    }

    const singleQty = Number(updatedSaleData.quantity);
    const singleUnitPrice = updatedSaleData.unitPrice != null ? Number(updatedSaleData.unitPrice) : undefined;
    const singleAmount = updatedSaleData.amount != null ? Number(updatedSaleData.amount) : undefined;
    if (updatedSaleData.stockItemId && Number.isFinite(singleQty) && singleQty > 0) {
      await _adjustStockAndRecordMovement(uid, updatedSaleData.stockItemId as string, -Math.abs(singleQty), updatedSaleData.date as any, {
        unitPrice: singleUnitPrice,
        relatedId: updatedSaleData.id,
        amount: singleAmount,
      });
    }
    if (Array.isArray(updatedSaleData.items)) {
      for (const it of updatedSaleData.items as any[]) {
        const q = Number(it?.quantity);
        const up = it?.unitPrice != null ? Number(it.unitPrice) : undefined;
        if (it?.stockItemId && Number.isFinite(q) && q > 0) {
          await _adjustStockAndRecordMovement(uid, String(it.stockItemId), -Math.abs(q), updatedSaleData.date as any, {
            unitPrice: up,
            relatedId: updatedSaleData.id,
            amount: up != null && Number.isFinite(q) ? up * q : undefined,
          });
        }
      }
    }
  } catch (e) {
    console.error('updateSale stock adjust error:', e);
  }

  return { ...updatedSaleData, updatedAt: dataToUpdate.updatedAt as string };
};

export const storageDeleteSale = async (uid: string, saleId: string): Promise<void> => {
  if (!uid || !saleId) {
    console.error("storageDeleteSale: Missing uid or saleId.");
    throw new Error("Kullanıcı veya Satış ID bilgisi eksik.");
  }
  
  const saleDocRef = doc(db, "users", uid, "sales", saleId);
  
  try {
    // Önce belgenin var olduğunu kontrol et
    const docSnap = await getDoc(saleDocRef);
    if (!docSnap.exists()) {
      throw new Error("Silinecek satış bulunamadı");
    }

    const prev = docSnap.data() as any;
    // Eski satış etkisini geri al (stok artır)
    try {
      const q = Number(prev?.quantity);
      if (prev?.stockItemId && Number.isFinite(q) && q > 0) {
        await _adjustStockAndRecordMovement(uid, String(prev.stockItemId), Math.abs(q), prev.date as string, {
          unitPrice: prev.unitPrice != null ? Number(prev.unitPrice) : undefined,
          relatedId: saleId,
          amount: prev.amount != null ? Number(prev.amount) : undefined,
          action: 'revert',
        });
      }
      if (Array.isArray(prev?.items)) {
        for (const it of prev.items as any[]) {
          const qq = Number(it?.quantity);
          if (it?.stockItemId && Number.isFinite(qq) && qq > 0) {
            await _adjustStockAndRecordMovement(uid, String(it.stockItemId), Math.abs(qq), prev.date as string, {
              unitPrice: it.unitPrice != null ? Number(it.unitPrice) : undefined,
              relatedId: saleId,
              amount: it.unitPrice != null && Number.isFinite(qq) ? Number(it.unitPrice) * qq : undefined,
              action: 'revert',
            });
          }
        }
      }
    } catch (e) {
      console.error('storageDeleteSale stock adjust error:', e);
    }

    // Silme işlemini gerçekleştir
    await deleteDoc(saleDocRef);
    // İlgili hareketleri sil
    await _deleteStockMovementsByRelatedId(uid, saleId);

    // Silme işleminin başarılı olduğunu doğrula
    const verifySnap = await getDoc(saleDocRef);
    if (verifySnap.exists()) {
      throw new Error("Silme işlemi doğrulanamadı");
    }
    
    console.log(`storageDeleteSale: Successfully deleted saleId ${saleId}`);
  } catch (error) {
    console.error(`storageDeleteSale: Error deleting sale ${saleId}:`, error);
    throw error;
  }
};

// relatedId ile kaydedilmiş stok hareketlerini siler
const _deleteStockMovementsByRelatedId = async (uid: string, relatedId: string): Promise<void> => {
  try {
    const q = query(
      _getUserCollectionRef(uid, 'stockMovements'),
      where('relatedId', '==', relatedId)
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await deleteDoc(doc(_getUserCollectionRef(uid, 'stockMovements'), d.id));
    }
  } catch (e) {
    console.error('_deleteStockMovementsByRelatedId error', e);
  }
};

// Payment Functions
export const getPayments = async (uid: string, customerId?: string): Promise<Payment[]> => {
  if (!uid) {
    console.error("getPayments: User ID (uid) is missing.");
    return [];
  }
  try {
    let paymentsQuery = query(_getUserCollectionRef(uid, "payments"), orderBy("date", "desc"));
    if (customerId) {
      paymentsQuery = query(paymentsQuery, where("customerId", "==", customerId));
    }
    const querySnapshot = await getDocs(paymentsQuery);
    const payments: Payment[] = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data() as Omit<Payment, 'id'>,
      currency: doc.data().currency || 'TRY'
    }));
    return payments;
  } catch (error) {
    console.error("Error fetching payments:", error);
    return [];
  }
};

export const getPaymentById = async (uid: string, paymentId: string): Promise<Payment | undefined> => {
  const paymentDocRef = doc(_getUserCollectionRef(uid, "payments"), paymentId);
  const docSnap = await getDoc(paymentDocRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() as Omit<Payment, 'id'> };
  }
  return undefined;
};

export const addPayment = async (uid: string, paymentData: Omit<Payment, 'id' | 'transactionType'>): Promise<Payment> => {
  const now = formatISO(new Date());
  const newPaymentData: any = {
    ...paymentData,
    createdAt: now,
    updatedAt: now,
    description: paymentData.description ?? null,
    referenceNumber: paymentData.referenceNumber ?? null,
    checkDate: paymentData.checkDate ?? null,
    checkSerialNumber: paymentData.checkSerialNumber ?? null,
  };
  // Opsiyonel çek görseli yüklemesi
  // Eğer server upload ile gelen bir URL varsa doğrudan kullan
  if ((paymentData as any).checkImageUrl) {
    newPaymentData.checkImageUrl = (paymentData as any).checkImageUrl;
  } else if ((paymentData as any).checkImageData) {
    // İstemciden API route'a yüklet: firebase-admin'i client bundle'a sokmadan URL al
    try {
      const dataUrl: string = (paymentData as any).checkImageData;
      const mime: string = (paymentData as any).checkImageMimeType || 'application/octet-stream';
      const body = new FormData();
      body.append('uid', uid);
      body.append('dataUrl', dataUrl);
      body.append('mime', mime);
      const res = await fetch('/api/upload-check-image', { method: 'POST', body } as any);
      if (res.ok) {
        const json = await res.json();
        if (json?.url) newPaymentData.checkImageUrl = json.url;
      } else {
        console.warn('upload-check-image API hatası:', res.status);
      }
    } catch (e) {
      console.error('Base64 çek görseli yüklenirken hata:', e);
    }
  }
  Object.keys(newPaymentData).forEach(key => {
    if (newPaymentData[key] === undefined) newPaymentData[key] = null;
  });
  const docRef = await addDoc(_getUserCollectionRef(uid, "payments"), newPaymentData);
  return { ...newPaymentData, id: docRef.id } as Payment;
};

export const updatePayment = async (uid: string, updatedPayment: Payment): Promise<Payment> => {
  const paymentDocRef = doc(_getUserCollectionRef(uid, "payments"), updatedPayment.id);
  const dataToUpdate: Partial<Payment> = {
    amount: updatedPayment.amount,
    date: updatedPayment.date,
    currency: updatedPayment.currency,
    method: updatedPayment.method,
    description: updatedPayment.description,
    referenceNumber: updatedPayment.referenceNumber,
    checkDate: updatedPayment.checkDate,
    checkSerialNumber: updatedPayment.checkSerialNumber,
    updatedAt: new Date().toISOString(),
  };
  // undefined olan alanları sil
  Object.keys(dataToUpdate).forEach(
    (key) => dataToUpdate[key as keyof typeof dataToUpdate] === undefined && delete dataToUpdate[key as keyof typeof dataToUpdate]
  );
  await updateDoc(paymentDocRef, dataToUpdate);
  // Güncel dokümanı tekrar çek
  const docSnap = await getDoc(paymentDocRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Payment;
  }
  // Eğer bir hata olursa, en azından güncellenmiş alanları döndür
  return { ...updatedPayment, ...dataToUpdate } as Payment;
};

export const storageDeletePayment = async (uid: string, paymentId: string): Promise<void> => {
  console.log('storageDeletePayment: Deleting payment', { uid, paymentId });
  if (!uid || !paymentId) {
    console.error("storageDeletePayment: Missing uid or paymentId.");
    throw new Error("Kullanıcı veya Ödeme ID bilgisi eksik.");
  }
  
  const paymentDocRef = doc(db, "users", uid, "payments", paymentId);
  
  try {
    await deleteDoc(paymentDocRef);
    console.log(`storageDeletePayment: Successfully deleted paymentId ${paymentId}`);
  } catch (error)
  {
    console.error(`storageDeletePayment: Error deleting payment ${paymentId}:`, error);
    throw error;
  }
};

// Supplier Functions
export const getSuppliers = async (uid: string): Promise<Supplier[]> => {
  console.log(`getSuppliers called with uid: ${uid}`);
  if (!uid) {
    console.error("getSuppliers: User ID (uid) is missing.");
    return [];
  }
  try {
    const q = query(_getUserCollectionRef(uid, "suppliers"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data() as Omit<Supplier, 'id'>
    }));
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return [];
  }
};

export const getSupplierById = async (uid: string, supplierId: string): Promise<Supplier | undefined> => {
  const supplierDocRef = doc(_getUserCollectionRef(uid, "suppliers"), supplierId);
  const docSnap = await getDoc(supplierDocRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() as Omit<Supplier, 'id'> };
  }
  return undefined;
};

export const addSupplier = async (uid: string, supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> => {
  const now = formatISO(new Date());
  const newSupplierData = {
    ...supplierData,
    createdAt: now,
    updatedAt: now,
    notes: supplierData.notes || null,
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "suppliers"), newSupplierData);
  return { ...newSupplierData, id: docRef.id } as Supplier;
};

export const updateSupplier = async (uid: string, updatedSupplier: Supplier): Promise<Supplier> => {
  const now = formatISO(new Date());
  const supplierDocRef = doc(_getUserCollectionRef(uid, "suppliers"), updatedSupplier.id);
  const finalSupplier = { ...updatedSupplier, updatedAt: now, notes: updatedSupplier.notes || null };
  await updateDoc(supplierDocRef, finalSupplier);
  return finalSupplier;
};

export const deleteSupplier = async (uid: string, supplierId: string): Promise<void> => {
  const supplierDocRef = doc(_getUserCollectionRef(uid, "suppliers"), supplierId);
  await deleteDoc(supplierDocRef);

  // Tedarikçiye ait alışları sil
  const purchasesQuery = query(_getUserCollectionRef(uid, "purchases"), where("supplierId", "==", supplierId));
  const purchasesSnapshot = await getDocs(purchasesQuery);
  purchasesSnapshot.forEach(async (purchaseDoc: QueryDocumentSnapshot<DocumentData>) => {
    await deleteDoc(doc(_getUserCollectionRef(uid, "purchases"), purchaseDoc.id));
  });

  // Tedarikçiye ait ödemeleri sil
  const paymentsToSupplierQuery = query(_getUserCollectionRef(uid, "paymentsToSuppliers"), where("supplierId", "==", supplierId));
  const paymentsToSupplierSnapshot = await getDocs(paymentsToSupplierQuery);
  paymentsToSupplierSnapshot.forEach(async (paymentToSupplierDoc: QueryDocumentSnapshot<DocumentData>) => {
    await deleteDoc(doc(_getUserCollectionRef(uid, "paymentsToSuppliers"), paymentToSupplierDoc.id));
  });
};

// Purchase Functions
export const getPurchases = async (uid: string, supplierId?: string): Promise<Purchase[]> => {
  console.log(`getPurchases called with uid: ${uid}`);
  if (!uid) {
    console.error("getPurchases: User ID (uid) is missing.");
    return [];
  }
  try {
    let purchasesQuery = query(_getUserCollectionRef(uid, "purchases"), orderBy("date", "desc"));
    if (supplierId) {
      purchasesQuery = query(purchasesQuery, where("supplierId", "==", supplierId));
    }
    const querySnapshot = await getDocs(purchasesQuery);
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data() as Omit<Purchase, 'id'>
    }));
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return [];
  }
};

export const addPurchase = async (uid: string, purchaseData: Omit<Purchase, 'id' | 'transactionType' | 'description'> & {description?: string}): Promise<Purchase> => {
  const now = formatISO(new Date());
  // Deep sanitize undefined values (Firestore does not allow undefined)
  const sanitizeDeep = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map((v) => sanitizeDeep(v));
    } else if (obj && typeof obj === 'object') {
      const entries = Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeDeep(v)] as const);
      return Object.fromEntries(entries);
    }
    return obj;
  };

  const composed: any = {
    ...purchaseData,
    transactionType: 'purchase',
    createdAt: now,
    updatedAt: now,
  };
  // Specifically sanitize invoiceItems elements
  if (Array.isArray((composed as any).invoiceItems)) {
    composed.invoiceItems = (composed as any).invoiceItems.map((it: any) =>
      sanitizeDeep(it)
    );
  }
  const newPurchaseData = sanitizeDeep(composed);

  console.log('addPurchase -> saving purchase data:', newPurchaseData);
  const docRef = await addDoc(_getUserCollectionRef(uid, "purchases"), newPurchaseData);

  // Stock adjustment and movement recording
  try {
    // Simple purchase with single stockItemId
    if (newPurchaseData.stockItemId && newPurchaseData.quantityPurchased && newPurchaseData.quantityPurchased > 0) {
      await _adjustStockAndRecordMovement(uid, newPurchaseData.stockItemId as string, Math.abs(newPurchaseData.quantityPurchased as number), newPurchaseData.date as string, {
        unitPrice: newPurchaseData.unitPrice as number | undefined,
        relatedId: docRef.id,
        amount: newPurchaseData.amount as number | undefined,
      });
    }
    // Invoice items purchase
    if (Array.isArray(newPurchaseData.invoiceItems)) {
      for (const it of newPurchaseData.invoiceItems as any[]) {
        if (it?.stockItemId && it?.quantity && it.quantity > 0) {
          await _adjustStockAndRecordMovement(uid, it.stockItemId as string, Math.abs(it.quantity as number), newPurchaseData.date as string, {
            unitPrice: it.unitPrice as number | undefined,
            relatedId: docRef.id,
            amount: (it.unitPrice && it.quantity) ? it.unitPrice * it.quantity : undefined,
          });
        }
      }
    }
  } catch (e) {
    console.error('addPurchase stock adjust error:', e);
  }

  return { ...newPurchaseData, id: docRef.id } as Purchase;
};

export const updatePurchase = async (uid: string, updatedPurchaseData: Purchase): Promise<Purchase> => {
  const now = formatISO(new Date());
  const purchaseDocRef = doc(_getUserCollectionRef(uid, "purchases"), updatedPurchaseData.id);

  // 1) Eski veriyi çek ve stok etkisini geri al (alış iadesi = stok azalt)
  const prevSnap = await getDoc(purchaseDocRef);
  if (prevSnap.exists()) {
    const prev = prevSnap.data() as any;
    const q = Number(prev?.quantityPurchased);
    if (prev?.stockItemId && Number.isFinite(q) && q > 0) {
      await _adjustStockAndRecordMovement(uid, String(prev.stockItemId), -Math.abs(q), prev.date as string, {
        unitPrice: prev.unitPrice != null ? Number(prev.unitPrice) : undefined,
        relatedId: updatedPurchaseData.id,
        amount: prev.amount != null ? Number(prev.amount) : undefined,
        action: 'revert',
      });
    }
    if (Array.isArray(prev?.invoiceItems)) {
      for (const it of prev.invoiceItems as any[]) {
        const qq = Number(it?.quantity);
        if (it?.stockItemId && Number.isFinite(qq) && qq > 0) {
          await _adjustStockAndRecordMovement(uid, String(it.stockItemId), -Math.abs(qq), prev.date as string, {
            unitPrice: it.unitPrice != null ? Number(it.unitPrice) : undefined,
            relatedId: updatedPurchaseData.id,
            amount: it.unitPrice != null && Number.isFinite(qq) ? Number(it.unitPrice) * qq : undefined,
            action: 'revert',
          });
        }
      }
    }
  }

  const { id, ...restOfUpdatedData } = updatedPurchaseData;
  const sanitizeDeep = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map((v) => sanitizeDeep(v));
    } else if (obj && typeof obj === 'object') {
      const entries = Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeDeep(v)] as const);
      return Object.fromEntries(entries);
    }
    return obj;
  };
  const composed: any = {
    ...restOfUpdatedData,
    updatedAt: now,
  };
  if (Array.isArray((composed as any).invoiceItems)) {
    composed.invoiceItems = (composed as any).invoiceItems.map((it: any) => sanitizeDeep(it));
  }
  const dataForFirestore: any = sanitizeDeep(composed);
  console.log('updatePurchase -> updating purchase id:', updatedPurchaseData.id, 'with data:', dataForFirestore);
  await updateDoc(purchaseDocRef, dataForFirestore);
  
  // 3) Yeni verinin stok etkisini uygula (alış = stok artır)
  try {
    const pQty = Number((dataForFirestore as any).quantityPurchased);
    const pUnitPrice = (dataForFirestore as any).unitPrice != null ? Number((dataForFirestore as any).unitPrice) : undefined;
    const pAmount = (dataForFirestore as any).amount != null ? Number((dataForFirestore as any).amount) : undefined;
    if ((dataForFirestore as any).stockItemId && Number.isFinite(pQty) && pQty > 0) {
      await _adjustStockAndRecordMovement(uid, String((dataForFirestore as any).stockItemId), Math.abs(pQty), String((dataForFirestore as any).date), {
        unitPrice: pUnitPrice,
        relatedId: updatedPurchaseData.id,
        amount: pAmount,
      });
    }
    if (Array.isArray((dataForFirestore as any).invoiceItems)) {
      for (const it of (dataForFirestore as any).invoiceItems as any[]) {
        const q = Number(it?.quantity);
        const up = it?.unitPrice != null ? Number(it.unitPrice) : undefined;
        if (it?.stockItemId && Number.isFinite(q) && q > 0) {
          await _adjustStockAndRecordMovement(uid, String(it.stockItemId), Math.abs(q), String((dataForFirestore as any).date), {
            unitPrice: up,
            relatedId: updatedPurchaseData.id,
            amount: up != null && Number.isFinite(q) ? up * q : undefined,
          });
        }
      }
    }
  } catch (e) {
    console.error('updatePurchase stock adjust error:', e);
  }

  return { ...dataForFirestore, id: updatedPurchaseData.id } as Purchase;
};

export const deletePurchase = async (uid: string, purchaseId: string): Promise<void> => {
  const purchaseDocRef = doc(_getUserCollectionRef(uid, "purchases"), purchaseId);
  const snap = await getDoc(purchaseDocRef);
  if (snap.exists()) {
    const prev = snap.data() as any;
    // Eski alış etkisini geri al (stok azalt)
    try {
      const q = Number(prev?.quantityPurchased);
      if (prev?.stockItemId && Number.isFinite(q) && q > 0) {
        await _adjustStockAndRecordMovement(uid, String(prev.stockItemId), -Math.abs(q), prev.date as string, {
          unitPrice: prev.unitPrice != null ? Number(prev.unitPrice) : undefined,
          relatedId: purchaseId,
          amount: prev.amount != null ? Number(prev.amount) : undefined,
          action: 'revert',
        });
      }
      if (Array.isArray(prev?.invoiceItems)) {
        for (const it of prev.invoiceItems as any[]) {
          const qq = Number(it?.quantity);
          if (it?.stockItemId && Number.isFinite(qq) && qq > 0) {
            await _adjustStockAndRecordMovement(uid, String(it.stockItemId), -Math.abs(qq), prev.date as string, {
              unitPrice: it.unitPrice != null ? Number(it.unitPrice) : undefined,
              relatedId: purchaseId,
              amount: it.unitPrice != null && Number.isFinite(qq) ? Number(it.unitPrice) * qq : undefined,
              action: 'revert',
            });
          }
        }
      }
    } catch (e) {
      console.error('deletePurchase stock adjust error:', e);
    }
  }
  await deleteDoc(purchaseDocRef);
  // İlgili hareketleri sil
  await _deleteStockMovementsByRelatedId(uid, purchaseId);
};

// -------------------- Stock Movements and Adjustments --------------------

// Increment or decrement stockItem.currentStock and write a movement record
const _adjustStockAndRecordMovement = async (
  uid: string,
  stockItemId: string,
  delta: number,
  dateISO: string,
  extras?: { unitPrice?: number; relatedId?: string; amount?: number; customerId?: string; supplierId?: string; action?: 'apply' | 'revert' }
) => {
  // Adjust currentStock
  const item = await getStockItemById(uid, stockItemId);
  if (!item) return;
  const next = { ...item, currentStock: (item.currentStock || 0) + delta } as StockItem;
  await updateStockItem(uid, next);

  // Record movement
  const movement: Partial<StockTransaction> & { transactionType: 'sale' | 'purchase' } = {
    date: dateISO || new Date().toISOString(),
    transactionType: delta >= 0 ? 'purchase' : 'sale',
    amount: extras?.amount ?? 0,
    currency: (item.salePrice?.currency as Currency) || 'TRY',
    stockItemId,
    customerId: extras?.customerId,
    supplierId: extras?.supplierId,
    quantityPurchased: delta > 0 ? Math.abs(delta) : undefined,
    quantitySold: delta < 0 ? Math.abs(delta) : undefined,
    unitPrice: extras?.unitPrice,
    relatedId: extras?.relatedId,
    unit: item.unit,
    balanceAfter: next.currentStock,
    action: extras?.action ?? 'apply',
  } as any;
  await addDoc(_getUserCollectionRef(uid, 'stockMovements'), movement);
};

export const getStockMovements = async (
  uid: string,
  filters?: { stockItemId?: string; type?: 'purchase' | 'sale' | 'all'; from?: string; to?: string }
): Promise<StockTransaction[]> => {
  if (!uid) return [];
  try {
    const col = _getUserCollectionRef(uid, 'stockMovements');
    const parts: any[] = [];
    // Tür filtresi
    if (filters?.type && filters.type !== 'all') {
      parts.push(where('transactionType', '==', filters.type));
    }
    // Ürün filtresi
    if (filters?.stockItemId) {
      parts.push(where('stockItemId', '==', filters.stockItemId));
    }
    // Tarih aralığı
    if (filters?.from) {
      parts.push(where('date', '>=', filters.from));
    }
    if (filters?.to) {
      parts.push(where('date', '<=', filters.to));
    }
    // Sıralama
    parts.push(orderBy('date', 'desc'));

    let qref: any;
    if (parts.length > 0) qref = query(col, ...parts);
    else qref = query(col, orderBy('date', 'desc'));

    const snap = await getDocs(qref);
    const items: StockTransaction[] = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
    return items;
  } catch (e) {
    console.error('getStockMovements error', e);
    // Hata halinde, en azından tümünü çekmeye çalış
    try {
      const snap = await getDocs(query(_getUserCollectionRef(uid, 'stockMovements'), orderBy('date', 'desc')));
      return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
    } catch (e2) {
      console.error('getStockMovements fallback error', e2);
      return [];
    }
  }
};

// PaymentToSupplier Functions
export const getPaymentsToSuppliers = async (uid: string, supplierId?: string): Promise<PaymentToSupplier[]> => {
  console.log(`getPaymentsToSuppliers called with uid: ${uid}`);
  if (!uid) {
    console.error("getPaymentsToSuppliers: User ID (uid) is missing.");
    return [];
  }
  try {
    let paymentsQuery = query(_getUserCollectionRef(uid, "paymentsToSuppliers"), orderBy("date", "desc"));
    if (supplierId) {
      paymentsQuery = query(paymentsQuery, where("supplierId", "==", supplierId));
    }
    const querySnapshot = await getDocs(paymentsQuery);
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data() as Omit<PaymentToSupplier, 'id'>,
      currency: doc.data().currency || 'TRY',
    }));
  } catch (error) {
    console.error("Error fetching payments to suppliers:", error);
    return [];
  }
};

export const addPaymentToSupplier = async (uid: string, paymentData: Omit<PaymentToSupplier, 'id' | 'transactionType'>): Promise<PaymentToSupplier> => {
  const now = formatISO(new Date());
  const newPaymentData = {
    ...paymentData,
    transactionType: 'paymentToSupplier',
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "paymentsToSuppliers"), newPaymentData);
  return { ...newPaymentData, id: docRef.id } as PaymentToSupplier;
};

export const updatePaymentToSupplier = async (uid: string, updatedPayment: PaymentToSupplier): Promise<PaymentToSupplier> => {
  const now = formatISO(new Date());
  const paymentDocRef = doc(_getUserCollectionRef(uid, "paymentsToSuppliers"), updatedPayment.id);
  const { id, ...restOfUpdatedData } = updatedPayment;
  const dataForFirestore: any = {
    ...restOfUpdatedData,
    updatedAt: now,
  };
  await updateDoc(paymentDocRef, dataForFirestore);
  return { ...dataForFirestore, id: updatedPayment.id } as PaymentToSupplier;
};

export const deletePaymentToSupplier = async (uid: string, paymentId: string): Promise<void> => {
  const paymentDocRef = doc(_getUserCollectionRef(uid, "paymentsToSuppliers"), paymentId);
  await deleteDoc(paymentDocRef);
};

// Contact History Functions
export const addContactHistory = async (uid: string, contactHistoryData: Omit<ContactHistoryItem, 'id'>): Promise<ContactHistoryItem> => {
  const now = formatISO(new Date());
  const newContactHistoryData = { ...contactHistoryData, createdAt: now, updatedAt: now };
  const docRef = await addDoc(_getUserCollectionRef(uid, "contactHistory"), newContactHistoryData);
  return { ...newContactHistoryData, id: docRef.id } as ContactHistoryItem;
};

export const updateContactHistory = async (uid: string, contactHistoryData: ContactHistoryItem): Promise<ContactHistoryItem> => {
  const now = formatISO(new Date());
  const contactHistoryDocRef = doc(_getUserCollectionRef(uid, "contactHistory"), contactHistoryData.id);
  const finalContactHistory = { ...contactHistoryData, updatedAt: now };
  await updateDoc(contactHistoryDocRef, finalContactHistory);
  return finalContactHistory;
};

export const deleteContactHistory = async (uid: string, contactHistoryId: string): Promise<void> => {
  const contactHistoryDocRef = doc(_getUserCollectionRef(uid, "contactHistory"), contactHistoryId);
  await deleteDoc(contactHistoryDocRef);
};

export const getContactHistory = async (uid: string, supplierId?: string): Promise<ContactHistoryItem[]> => {
  if (!uid) {
    console.error("getContactHistory: User ID (uid) is missing.");
    return [];
  }
  try {
    let q = query(_getUserCollectionRef(uid, "contactHistory"), orderBy("date", "desc"));
    if (supplierId) {
      q = query(q, where("supplierId", "==", supplierId));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data() as Omit<ContactHistoryItem, 'id'>,
    }));
  } catch (error) {
    console.error("Error fetching contact history:", error);
    return [];
  }
};

// Supplier Task Functions
export const getSupplierTasks = async (uid: string, supplierId?: string): Promise<SupplierTask[]> => {
  if (!uid) {
    console.error("getSupplierTasks: User ID (uid) is missing.");
    return [];
  }
  try {
    let q = query(_getUserCollectionRef(uid, "supplierTasks"), orderBy("createdAt", "desc"));
    if (supplierId) {
      q = query(q, where("supplierId", "==", supplierId));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data() as Omit<SupplierTask, 'id'>,
    }));
  } catch (error) {
    console.error("Error fetching supplier tasks:", error);
    return [];
  }
};

export const addSupplierTask = async (uid: string, taskData: Omit<SupplierTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupplierTask> => {
  const now = formatISO(new Date());
  const newTaskData = {
    ...taskData,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "supplierTasks"), newTaskData);
  return { ...newTaskData, id: docRef.id } as SupplierTask;
};

export const updateSupplierTask = async (uid: string, taskData: SupplierTask): Promise<SupplierTask> => {
  const now = formatISO(new Date());
  const taskDocRef = doc(_getUserCollectionRef(uid, "supplierTasks"), taskData.id);
  const { id, ...restOfUpdatedData } = taskData;
  const dataForFirestore: any = {
    ...restOfUpdatedData,
    updatedAt: now,
  };
  // Remove undefined fields to prevent Firebase errors
  Object.keys(dataForFirestore).forEach(key => {
    if (dataForFirestore[key] === undefined) {
      delete dataForFirestore[key];
    }
  });
  await updateDoc(taskDocRef, dataForFirestore);
  return { ...dataForFirestore, id: taskData.id } as SupplierTask;
};

export const deleteSupplierTask = async (uid: string, taskId: string): Promise<void> => {
  const taskDocRef = doc(_getUserCollectionRef(uid, "supplierTasks"), taskId);
  await deleteDoc(taskDocRef);
};
// Stored under users/{uid}/settings/biSalesTargets with a document structure:
// { targets: { 'YYYY-MM': number } }

export const getBISalesTargets = async (uid: string): Promise<Record<string, number>> => {
  if (!uid) return {};
  try {
    const docRef = doc(db as any, "users", uid, "settings", "biSalesTargets");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as any;
      return (data?.targets as Record<string, number>) || {};
    }
    return {};
  } catch (e) {
    console.error("getBISalesTargets error", e);
    return {};
  }
};

export const getBIMonthlyTarget = async (uid: string, monthKey: string): Promise<number | null> => {
  const all = await getBISalesTargets(uid);
  const v = all[monthKey];
  return typeof v === 'number' ? v : null;
};

export const setBIMonthlyTarget = async (uid: string, monthKey: string, amount: number): Promise<void> => {
  if (!uid) throw new Error('setBIMonthlyTarget: uid required');
  if (!monthKey) throw new Error('setBIMonthlyTarget: monthKey required');
  const docRef = doc(db as any, "users", uid, "settings", "biSalesTargets");
  const snap = await getDoc(docRef);
  const current = snap.exists() ? ((snap.data() as any)?.targets || {}) : {};
  const targets = { ...current, [monthKey]: amount };
  await setDoc(docRef, { targets }, { merge: true });
};

// Margin targets (separate document to avoid breaking existing sales targets schema)
export async function getBIMarginMonthlyTarget(uid: string, monthKey: string): Promise<number | null> {
  try {
    const docRef = doc(db as any, "users", uid, "settings", "biMarginTargets");
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() as any : {};
    const targets = (data.targets || {}) as Record<string, number>;
    return typeof targets[monthKey] === 'number' ? targets[monthKey] : null;
  } catch (e) {
    return null;
  }
}

export async function setBIMarginMonthlyTarget(uid: string, monthKey: string, amount: number): Promise<void> {
  const docRef = doc(db as any, "users", uid, "settings", "biMarginTargets");
  const snap = await getDoc(docRef);
  const data = snap.exists() ? snap.data() as any : {};
  const targets = (data.targets || {}) as Record<string, number>;
  targets[monthKey] = amount;
  await setDoc(docRef, { targets }, { merge: true });
}

// Portfolio Functions
export const getPortfolioItems = async (uid: string): Promise<PortfolioItem[]> => {
  console.log(`getPortfolioItems called with uid: ${uid}`);
  if (!uid) {
    console.error("getPortfolioItems: User ID (uid) is missing.");
    return [];
  }
  try {
    const q = query(_getUserCollectionRef(uid, "portfolioItems"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data() as Omit<PortfolioItem, 'id'>
    }));
  } catch (error) {
    console.error("Error fetching portfolio items:", error);
    return [];
  }
};

export const getPortfolioItemById = async (uid: string, id: string): Promise<PortfolioItem | undefined> => {
  const portfolioItemDocRef = doc(_getUserCollectionRef(uid, "portfolioItems"), id);
  const docSnap = await getDoc(portfolioItemDocRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() as Omit<PortfolioItem, 'id'> };
  }
  return undefined;
};

export const addPortfolioItem = async (uid: string, itemData: Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<PortfolioItem> => {
  const now = formatISO(new Date());
  const newItemData = {
    ...itemData,
    createdAt: now,
    updatedAt: now,
  };
  
  // undefined değerleri temizle
  Object.keys(newItemData).forEach(key => {
    if (newItemData[key as keyof typeof newItemData] === undefined) {
      (newItemData as any)[key] = null;
    }
  });
  
  const docRef = await addDoc(_getUserCollectionRef(uid, "portfolioItems"), newItemData);

  // Portföydeki müşteri companyName'i mevcut müşterilerde name ile eşleşiyorsa, müşteriyi güncelle
  if (itemData.companyName) {
    const customersRef = _getUserCollectionRef(uid, "customers");
    const q = query(customersRef, where("name", "==", itemData.companyName));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      // Eşleşen tüm müşterileri güncelle
      for (const docSnap of querySnapshot.docs) {
        const customerId = docSnap.id;
        const customerData = docSnap.data();
        // undefined değerleri temizle
        const updatedCustomer: any = {
          ...customerData,
          name: itemData.companyName,
          phone: itemData.gsm || itemData.phone || customerData.phone || null,
          email: itemData.email || customerData.email || null,
          address: itemData.address || customerData.address || null,
          taxNumber: itemData.taxId || customerData.taxNumber || null,
          taxOffice: itemData.taxOffice || customerData.taxOffice || null,
          notes: itemData.notes || customerData.notes || null,
          city: itemData.city || customerData.city || null,
          district: itemData.district || customerData.district || null,
          website: itemData.website || customerData.website || null,
          sector: itemData.sector || customerData.sector || null,
          updatedAt: now,
        };
        // undefined değerleri null'a çevir
        Object.keys(updatedCustomer).forEach(key => {
          if (updatedCustomer[key] === undefined) {
            updatedCustomer[key] = null;
          }
        });
        await updateDoc(doc(customersRef, customerId), updatedCustomer);
      }
    } else {
      // Hiç müşteri bulunamadıysa yeni müşteri oluştur
      const newCustomer: any = {
        name: itemData.companyName,
        phone: itemData.gsm || itemData.phone || null,
        email: itemData.email || null,
        address: itemData.address || null,
        taxNumber: itemData.taxId || null,
        taxOffice: itemData.taxOffice || null,
        notes: itemData.notes || null,
        city: itemData.city || null,
        district: itemData.district || null,
        website: itemData.website || null,
        sector: itemData.sector || null,
        createdAt: now,
        updatedAt: now,
      };
      // undefined değerleri null'a çevir
      Object.keys(newCustomer).forEach(key => {
        if (newCustomer[key] === undefined) {
          newCustomer[key] = null;
        }
      });
      await addDoc(customersRef, newCustomer);
    }
  }

  return { ...newItemData, id: docRef.id } as PortfolioItem;
};

export const updatePortfolioItem = async (uid: string, updatedItem: PortfolioItem): Promise<PortfolioItem> => {
  const now = formatISO(new Date());
  const portfolioItemDocRef = doc(_getUserCollectionRef(uid, "portfolioItems"), updatedItem.id);
  const { id, ...restOfUpdatedItem } = updatedItem;
  
  // undefined değerleri temizle
  const dataForFirestore: any = {
    ...restOfUpdatedItem,
    updatedAt: now,
  };
  
  // undefined değerleri null'a çevir veya kaldır
  Object.keys(dataForFirestore).forEach(key => {
    if (dataForFirestore[key] === undefined) {
      dataForFirestore[key] = null;
    }
  });
  
  await updateDoc(portfolioItemDocRef, dataForFirestore);

  // Portföydeki müşteri companyName'i mevcut müşterilerde name ile eşleşiyorsa, müşteriyi güncelle
  if (updatedItem.companyName) {
    const customersRef = _getUserCollectionRef(uid, "customers");
    const q = query(customersRef, where("name", "==", updatedItem.companyName));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      for (const docSnap of querySnapshot.docs) {
        const customerId = docSnap.id;
        const customerData = docSnap.data();
        // undefined değerleri temizle
        const updatedCustomer: any = {
          ...customerData,
          name: updatedItem.companyName,
          phone: updatedItem.gsm || updatedItem.phone || customerData.phone || null,
          email: updatedItem.email || customerData.email || null,
          address: updatedItem.address || customerData.address || null,
          taxNumber: updatedItem.taxId || customerData.taxNumber || null,
          taxOffice: updatedItem.taxOffice || customerData.taxOffice || null,
          notes: updatedItem.notes || customerData.notes || null,
          city: updatedItem.city || customerData.city || null,
          district: updatedItem.district || customerData.district || null,
          website: updatedItem.website || customerData.website || null,
          sector: updatedItem.sector || customerData.sector || null,
          updatedAt: now,
        };
        // undefined değerleri null'a çevir
        Object.keys(updatedCustomer).forEach(key => {
          if (updatedCustomer[key] === undefined) {
            updatedCustomer[key] = null;
          }
        });
        await updateDoc(doc(customersRef, customerId), updatedCustomer);
      }
    } else {
      // Hiç müşteri bulunamadıysa yeni müşteri oluştur
      const newCustomer: any = {
        name: updatedItem.companyName,
        phone: updatedItem.gsm || updatedItem.phone || null,
        email: updatedItem.email || null,
        address: updatedItem.address || null,
        taxNumber: updatedItem.taxId || null,
        taxOffice: updatedItem.taxOffice || null,
        notes: updatedItem.notes || null,
        city: updatedItem.city || null,
        district: updatedItem.district || null,
        website: updatedItem.website || null,
        sector: updatedItem.sector || null,
        createdAt: now,
        updatedAt: now,
      };
      Object.keys(newCustomer).forEach(key => {
        if (newCustomer[key] === undefined) {
          newCustomer[key] = null;
        }
      });
      await addDoc(customersRef, newCustomer);
    }
  }

  return { ...dataForFirestore, id: updatedItem.id } as PortfolioItem;
};

export const deletePortfolioItem = async (uid: string, itemId: string): Promise<void> => {
  const portfolioItemDocRef = doc(_getUserCollectionRef(uid, "portfolioItems"), itemId);
  await deleteDoc(portfolioItemDocRef);
};

// Archived Files Functions
export const getArchivedFilesMetadata = async (uid: string): Promise<ArchivedFile[]> => {
  console.log(`getArchivedFilesMetadata called with uid: ${uid}`);
  if (!uid) {
    console.error("getArchivedFilesMetadata: User ID (uid) is missing.");
    return [];
  }
  try {
    const q = query(_getUserCollectionRef(uid, "archivedFiles"), orderBy("uploadDate", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data() as Omit<ArchivedFile, 'id'>
    }));
  } catch (error) {
    console.error("Error fetching archived files metadata:", error);
    return [];
  }
};

export const addArchivedFile = async (uid: string, fileMetadataInput: Omit<ArchivedFile, 'id' | 'uploadDate'>, fileBlob: Blob): Promise<ArchivedFile> => {
  const now = formatISO(new Date());
  const newFileMetadata = {
    ...fileMetadataInput,
    uploadDate: now,
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "archivedFiles"), newFileMetadata);
  return { ...newFileMetadata, id: docRef.id } as ArchivedFile;
};

export const deleteArchivedFile = async (uid: string, fileId: string): Promise<void> => {
  const fileDocRef = doc(_getUserCollectionRef(uid, "archivedFiles"), fileId);
  await deleteDoc(fileDocRef);
};

// Useful Links Functions
export const getUsefulLinks = async (uid: string): Promise<UsefulLink[]> => {
  console.log(`getUsefulLinks called with uid: ${uid}`);
  if (!uid) {
    console.error("getUsefulLinks: User ID (uid) is missing.");
    return [];
  }
  try {
    const q = query(_getUserCollectionRef(uid, "usefulLinks"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data() as Omit<UsefulLink, 'id'>
    }));
  } catch (error) {
    console.error("Error fetching useful links:", error);
    return [];
  }
};

export const addUsefulLink = async (uid: string, linkData: Omit<UsefulLink, 'id' | 'createdAt'>): Promise<UsefulLink> => {
  const now = formatISO(new Date());
  const newLinkData = {
    ...linkData,
    createdAt: now,
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "usefulLinks"), newLinkData);
  return { ...newLinkData, id: docRef.id } as UsefulLink;
};

export const deleteUsefulLink = async (uid: string, linkId: string): Promise<void> => {
  const linkDocRef = doc(_getUserCollectionRef(uid, "usefulLinks"), linkId);
  await deleteDoc(linkDocRef);
};

// Check (Çek) Management Functions
export const getChecks = async (uid: string): Promise<BankCheck[]> => {
  if (!uid) return [];
  try {
    const ref = _getUserCollectionRef(uid, "checks");
    let snapshot;
    try {
      // Primary ordering by dueDate (desc)
      const q1 = query(ref, orderBy("dueDate", "desc"));
      snapshot = await getDocs(q1);
    } catch (err1) {
      console.warn("getChecks: orderBy dueDate failed, falling back to createdAt", err1);
      try {
        // Fallback ordering by createdAt (desc)
        const q2 = query(ref, orderBy("createdAt", "desc"));
        snapshot = await getDocs(q2);
      } catch (err2) {
        console.warn("getChecks: orderBy createdAt failed, fetching without order", err2);
        // Last resort: fetch without order
        snapshot = await getDocs(ref as any);
      }
    }

    const normalizeDate = (val: any): string | undefined => {
      if (!val) return undefined;
      if (typeof val === 'string') return val;
      // Firestore Timestamp has a toDate() method
      try {
        if (typeof val.toDate === 'function') {
          return (val.toDate() as Date).toISOString();
        }
      } catch {}
      // If value is Date
      if (val instanceof Date) return val.toISOString();
      return undefined;
    };

    const docs = (snapshot.docs as unknown) as QueryDocumentSnapshot<DocumentData>[];
    return docs.map((d) => {
      const raw: any = d.data();
      const issueDate = normalizeDate(raw.issueDate);
      const dueDate = normalizeDate(raw.dueDate);
      const createdAt = normalizeDate(raw.createdAt);
      const updatedAt = normalizeDate(raw.updatedAt);
      return {
        id: d.id,
        ...raw,
        ...(issueDate ? { issueDate } : {}),
        ...(dueDate ? { dueDate } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...(updatedAt ? { updatedAt } : {}),
      } as BankCheck;
    });
  } catch (e) {
    console.error("Error fetching checks", e);
    return [];
  }
};

export const getCheckById = async (uid: string, checkId: string): Promise<BankCheck | null> => {
  if (!uid || !checkId) return null;
  try {
    const checkDocRef = doc(_getUserCollectionRef(uid, "checks"), checkId);
    const docSnap = await getDoc(checkDocRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as BankCheck;
    }
    return null;
  } catch (e) {
    console.error("Error fetching check by ID", e);
    return null;
  }
};

export const addCheck = async (uid: string, data: Omit<BankCheck, 'id' | 'createdAt' | 'updatedAt'>): Promise<BankCheck> => {
  try {
    const now = new Date().toISOString();
    const payload: Omit<BankCheck, 'id'> = { ...data, createdAt: now, updatedAt: now };
    console.log('Adding check to Firestore:', payload);
    const refDoc = await addDoc(_getUserCollectionRef(uid, "checks"), payload as any);
    console.log('Check added successfully with ID:', refDoc.id);
    return { ...payload, id: refDoc.id } as BankCheck;
  } catch (error) {
    console.error('Error adding check to Firestore:', error);
    throw error;
  }
};

export const updateCheck = async (uid: string, data: BankCheck): Promise<BankCheck> => {
  const docRef = doc(_getUserCollectionRef(uid, "checks"), data.id);
  const payload = { ...data, updatedAt: new Date().toISOString() };
  await updateDoc(docRef, payload as any);
  return payload as BankCheck;
};

export const deleteCheck = async (uid: string, id: string): Promise<void> => {
  const docRef = doc(_getUserCollectionRef(uid, "checks"), id);
  await deleteDoc(docRef);
};

// Quotation Functions
export const getQuotations = async (uid: string): Promise<Quotation[]> => {
  console.log(`getQuotations called with uid: ${uid}`);
  if (!uid) {
    console.error("getQuotations: User ID (uid) is missing.");
    return [];
  }
  try {
    const q = query(_getUserCollectionRef(uid, "quotations"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data() as Omit<Quotation, 'id'>
    }));
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return [];
  }
};

export const getQuotationById = async (uid: string, quotationId: string): Promise<Quotation | undefined> => {
  const quotationDocRef = doc(_getUserCollectionRef(uid, "quotations"), quotationId);
  const docSnap = await getDoc(quotationDocRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() as Omit<Quotation, 'id'> };
  }
  return undefined;
};

export const generateQuotationNumber = async (uid: string): Promise<string> => {
  const q = query(
    _getUserCollectionRef(uid, "quotations"),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const querySnapshot = await getDocs(q);
  let lastNumber = 0;
  if (!querySnapshot.empty) {
    const lastQuotation = querySnapshot.docs[0].data() as Quotation;
    const match = lastQuotation.quotationNumber.match(/\d+$/);
    if (match) {
      lastNumber = parseInt(match[0], 10);
    }
  }
  const newNumber = lastNumber + 1;
  return `QT${String(newNumber).padStart(4, '0')}`;
};

export const addQuotation = async (uid: string, quotationData: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt' | 'quotationNumber'>): Promise<Quotation> => {
  const now = formatISO(new Date());
  const quotationNumber = await generateQuotationNumber(uid);
  const newQuotationData = {
    ...quotationData,
    quotationNumber,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "quotations"), newQuotationData);
  return { ...newQuotationData, id: docRef.id } as Quotation;
};

export const updateQuotation = async (uid: string, updatedQuotation: Quotation): Promise<Quotation> => {
  const now = formatISO(new Date());
  const quotationDocRef = doc(_getUserCollectionRef(uid, "quotations"), updatedQuotation.id);
  const finalQuotation = { ...updatedQuotation, updatedAt: now };
  await updateDoc(quotationDocRef, finalQuotation);
  return finalQuotation;
};

export const deleteQuotation = async (uid: string, quotationId: string): Promise<void> => {
  const quotationDocRef = doc(_getUserCollectionRef(uid, "quotations"), quotationId);
  await deleteDoc(quotationDocRef);
};

// Costs CRUD
export const getCosts = async (userId: string): Promise<Cost[]> => {
  try {
    const costsRef = collection(db, "users", userId, "costs");
    const q = query(costsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() } as Cost));
  } catch (error) {
    console.error("Error getting costs: ", error);
    throw error;
  }
};

export const addCost = async (userId: string, costData: Omit<Cost, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Cost> => {
  try {
    const costsRef = collection(db, "users", userId, "costs");
    const now = new Date();
    const newCostRef = doc(costsRef);
    const newCost: Omit<Cost, 'id'> = {
      ...costData,
      userId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await setDoc(newCostRef, newCost);
    return { id: newCostRef.id, ...newCost };
  } catch (error) {
    console.error("Error adding cost: ", error);
    throw error;
  }
};

export const updateCost = async (userId: string, cost: Cost): Promise<Cost> => {
  try {
    const costRef = doc(db, "users", userId, "costs", cost.id);
    const updatedCost = {
      ...cost,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(costRef, updatedCost);
    return updatedCost;
  } catch (error) {
    console.error("Error updating cost: ", error);
    throw error;
  }
};

export const deleteCost = async (userId: string, costId: string): Promise<void> => {
  try {
    const costRef = doc(db, "users", userId, "costs", costId);
    await deleteDoc(costRef);
  } catch (error) {
    console.error("Error deleting cost: ", error);
    throw error;
  }
};

// Order Functions
export const getOrders = async (uid: string): Promise<Order[]> => {
  console.log(`getOrders called with uid: ${uid}`);
  if (!uid) {
    console.error("getOrders: User ID (uid) is missing.");
    return [];
  }
  try {
    const q = query(_getUserCollectionRef(uid, "orders"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data() as Omit<Order, 'id'>
    }));
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
};

export const getOrderById = async (uid: string, orderId: string): Promise<Order | undefined> => {
  const orderDocRef = doc(_getUserCollectionRef(uid, "orders"), orderId);
  const docSnap = await getDoc(orderDocRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() as Omit<Order, 'id'> };
  }
  return undefined;
};

export const addOrder = async (uid: string, orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> => {
  const now = formatISO(new Date());
  const newOrderData = {
    ...orderData,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "orders"), newOrderData);
  return { ...newOrderData, id: docRef.id } as Order;
};

export const updateOrder = async (uid: string, updatedOrder: Order): Promise<Order> => {
  const now = formatISO(new Date());
  const orderDocRef = doc(_getUserCollectionRef(uid, "orders"), updatedOrder.id);
  const finalOrder = { ...updatedOrder, updatedAt: now };
  await updateDoc(orderDocRef, finalOrder);
  return finalOrder;
};

export const deleteOrder = async (uid: string, orderId: string): Promise<void> => {
  const orderDocRef = doc(_getUserCollectionRef(uid, "orders"), orderId);
  await deleteDoc(orderDocRef);
};

// -------------------- Analytics Daily Rebuild --------------------
export const rebuildAnalyticsDaily = async (
  uid: string,
  fromISO?: string,
  toISO?: string
): Promise<number> => {
  if (!uid) return 0;
  try {
    // Hareketleri filtreyle çek
    let movements: StockTransaction[] = [];
    try {
      // getStockMovements mevcutsa filtreli kullan
      const anyThis: any = exports as any;
      if (typeof anyThis.getStockMovements === 'function') {
        movements = await (anyThis.getStockMovements as any)(uid, { from: fromISO, to: toISO });
      } else {
        // Doğrudan sorgu
        const parts: any[] = [];
        if (fromISO) parts.push(where('date', '>=', fromISO));
        if (toISO) parts.push(where('date', '<=', toISO));
        parts.push(orderBy('date', 'asc'));
        const qref = query(_getUserCollectionRef(uid, 'stockMovements'), ...parts);
        const snap = await getDocs(qref);
        movements = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
      }
    } catch (e) {
      console.error('rebuildAnalyticsDaily: movements fetch error', e);
      return 0;
    }

    // Günlük agregasyonları oluştur
    const daily = buildDailyFifoAggregates(movements);
    const colRef = _getUserCollectionRef(uid, 'analyticsDaily');
    let count = 0;
    for (const key of Object.keys(daily)) {
      const row = daily[key];
      const docId = `${row.dateKey}_${row.productId}_${row.currency || 'TRY'}`;
      await setDoc(doc(colRef, docId), row, { merge: true } as any);
      count++;
    }
    return count;
  } catch (e) {
    console.error('rebuildAnalyticsDaily error', e);
    return 0;
  }
};
