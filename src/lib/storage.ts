// src/lib/storage.ts
import { db } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, setDoc, getDoc, limit, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
// Server build için firebase-admin sadece server dosyalarında import edilmeli.
// Storage katmanı API route üzerinden çağrıldığı için burada ayrıca admin importuna gerek yok.
import { formatISO, parseISO, format, addDays } from 'date-fns';
import type { Customer, Sale, Payment, Currency, Supplier, Purchase, PaymentToSupplier, TodoItem, PortfolioItem, ArchivedFile, UsefulLink, StockItem, Price, Quotation, QuotationItem, ContactHistoryItem, SupplierTask, Cost, Order, OrderItem } from "./types";
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
  const newSaleData = {
    ...saleData,
    transactionType: 'sale',
    description: description,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(_getUserCollectionRef(uid, "sales"), newSaleData);

  return { ...newSaleData, id: docRef.id } as Sale;
};

export const updateSale = async (uid: string, updatedSaleData: Sale): Promise<Sale> => {
  const saleDocRef = doc(_getUserCollectionRef(uid, "sales"), updatedSaleData.id);

  const dataToUpdate: Partial<Sale> = {
    amount: updatedSaleData.amount,
    date: updatedSaleData.date,
    currency: updatedSaleData.currency,
    description: updatedSaleData.description,
    stockItemId: updatedSaleData.stockItemId,
    quantity: updatedSaleData.quantity,
    unitPrice: updatedSaleData.unitPrice,
    updatedAt: new Date().toISOString(),
  };

  await updateDoc(saleDocRef, dataToUpdate);
  
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

    // Silme işlemini gerçekleştir
    await deleteDoc(saleDocRef);
    
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
    // Sunucuda yükle: base64 data URL ile geldiyse burada admin ile yükleyelim
    try {
      const dataUrl: string = (paymentData as any).checkImageData;
      const mime: string = (paymentData as any).checkImageMimeType || 'application/octet-stream';
      const base64 = dataUrl.split(',')[1];
      const buffer = Buffer.from(base64, 'base64');
      const filename = `${uid}/checks/${Date.now()}.upload`;
      const file = adminBucket.file(filename);
      await file.save(buffer, { contentType: mime, resumable: false, metadata: { cacheControl: 'public, max-age=31536000' } });
      const [url] = await file.getSignedUrl({ action: 'read', expires: '2100-01-01' });
      newPaymentData.checkImageUrl = url;
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
  const newPurchaseData = {
    ...purchaseData,
    transactionType: 'purchase',
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "purchases"), newPurchaseData);
  return { ...newPurchaseData, id: docRef.id } as Purchase;
};

export const updatePurchase = async (uid: string, updatedPurchaseData: Purchase): Promise<Purchase> => {
  const now = formatISO(new Date());
  const purchaseDocRef = doc(_getUserCollectionRef(uid, "purchases"), updatedPurchaseData.id);
  const { id, ...restOfUpdatedData } = updatedPurchaseData;
  const dataForFirestore: any = {
    ...restOfUpdatedData,
    updatedAt: now,
  };
  await updateDoc(purchaseDocRef, dataForFirestore);
  return { ...dataForFirestore, id: updatedPurchaseData.id } as Purchase;
};

export const deletePurchase = async (uid: string, purchaseId: string): Promise<void> => {
  const purchaseDocRef = doc(_getUserCollectionRef(uid, "purchases"), purchaseId);
  await deleteDoc(purchaseDocRef);
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
    const q = query(_getUserCollectionRef(uid, "checks"), orderBy("dueDate", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as BankCheck));
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
