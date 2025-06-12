// src/lib/storage.ts
import { db } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from "firebase/firestore";
import { getDoc, limit } from "firebase/firestore";
import { formatISO, parseISO, format, addDays } from 'date-fns';
import type { Customer, Sale, Payment, Currency, Supplier, Purchase, PaymentToSupplier, TodoItem, PortfolioItem, ArchivedFile, UsefulLink, StockItem, Price, Quotation, QuotationItem, ContactHistoryItem, SupplierTask } from "./types";
// import { storeFileInDB, deleteFileFromDB } from './indexedDBStorage'; // Firebase Storage kullanılacaksa bu kısım değişecek
import { useAuth } from '@/contexts/AuthContext';

// localStorage anahtarları kaldırıldı, artık Firestore koleksiyon yolları kullanılacak

// isClient ve localStorage yardımcıları kaldırıldı

// Yardımcı fonksiyon: Kullanıcıya özel koleksiyon referansı döndürür
const _getUserCollectionRef = (uid: string, collectionName: string) => {
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
    const q = query(_getUserCollectionRef(uid, "customers"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<Customer, 'id'>
    }));
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
  salesSnapshot.forEach(async (saleDoc) => {
    await deleteDoc(doc(_getUserCollectionRef(uid, "sales"), saleDoc.id));
  });

  // Müşteriye ait ödemeleri sil
  const paymentsQuery = query(_getUserCollectionRef(uid, "payments"), where("customerId", "==", customerId));
  const paymentsSnapshot = await getDocs(paymentsQuery);
  paymentsSnapshot.forEach(async (paymentDoc) => {
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

    const items: StockItem[] = querySnapshot.docs.map(doc => ({
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
    currentStock: Number(itemData.currentStock) || 0,
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
    currentStock: Number(updatedItemData.currentStock),
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
    const sales: Sale[] = querySnapshot.docs.map(doc => {
      let description = doc.data().description;
      if (!description && doc.data().stockItemId) {
        // Stok ürünü bilgisi Firestore'dan çekilmeli, ama burada senkron olarak yapamayız
        // Bu kısım UI tarafında çözülmeli veya farklı bir yaklaşımla
        description = "Stok Ürünü Satışı"; // Geçici olarak varsayılan değer
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

export const addSale = async (uid: string, saleData: Omit<Sale, 'id' | 'transactionType'>): Promise<Sale> => {
  let description = saleData.description;
  if (saleData.stockItemId && !description) {
    const stockItem = await getStockItemById(uid, saleData.stockItemId); // uid eklendi ve await
    description = stockItem ? stockItem.name : "Stok Ürünü Satışı";
  } else if (!description) {
    description = "Genel Satış";
  }

  const newSaleData = {
    ...saleData,
    transactionType: 'sale',
    description: description,
  };

  const docRef = await addDoc(_getUserCollectionRef(uid, "sales"), newSaleData);

  if (saleData.stockItemId && typeof saleData.quantitySold === 'number' && saleData.quantitySold > 0) {
    const stockItem = await getStockItemById(uid, saleData.stockItemId); // uid eklendi ve await
    if (stockItem) {
      const updatedStockItem = {
        ...stockItem,
        currentStock: stockItem.currentStock - saleData.quantitySold,
      };
      await updateStockItem(uid, updatedStockItem); // uid eklendi ve await
    }
  }

  return { ...newSaleData, id: docRef.id } as Sale;
};

export const updateSale = async (uid: string, updatedSaleData: Sale): Promise<Sale> => {
  const saleDocRef = doc(_getUserCollectionRef(uid, "sales"), updatedSaleData.id);
  const oldSaleSnapshot = await getDoc(saleDocRef); // getDoc import edildi
  const oldSale = oldSaleSnapshot.exists() ? oldSaleSnapshot.data() as Sale : undefined;

  // Eski stok etkisini geri al
  if (oldSale && oldSale.stockItemId && typeof oldSale.quantitySold === 'number' && oldSale.quantitySold > 0) {
    const oldStockItem = await getStockItemById(uid, oldSale.stockItemId); // uid eklendi ve await
    if (oldStockItem) {
      await updateStockItem(uid, { // uid eklendi ve await
        ...oldStockItem,
        currentStock: oldStockItem.currentStock + oldSale.quantitySold,
      });
    }
  }

  let description = updatedSaleData.description;
  if (updatedSaleData.stockItemId && !description) {
    const stockItem = await getStockItemById(uid, updatedSaleData.stockItemId); // uid eklendi ve await
    description = stockItem ? stockItem.name : "Stok Ürünü Satışı";
  } else if (!description) {
    description = "Genel Satış";
  }

  // Yeni stok etkisini uygula
  if (updatedSaleData.stockItemId && typeof updatedSaleData.quantitySold === 'number' && updatedSaleData.quantitySold > 0) {
    const newStockItem = await getStockItemById(uid, updatedSaleData.stockItemId); // uid eklendi ve await
    if (newStockItem) {
      await updateStockItem(uid, { // uid eklendi ve await
        ...newStockItem,
        currentStock: newStockItem.currentStock - updatedSaleData.quantitySold,
      });
    }
  }

  const { id, ...finalUpdatedSale } = { ...updatedSaleData, description: description };
  await updateDoc(saleDocRef, finalUpdatedSale);
  return { ...updatedSaleData, description: description };
};

export const deleteSale = async (uid: string, saleId: string): Promise<void> => {
  const saleDocRef = doc(_getUserCollectionRef(uid, "sales"), saleId);
  const saleToDeleteSnapshot = await getDoc(saleDocRef); // getDoc import edildi
  const saleToDelete = saleToDeleteSnapshot.exists() ? saleToDeleteSnapshot.data() as Sale : undefined;

  if (saleToDelete && saleToDelete.stockItemId && typeof saleToDelete.quantitySold === 'number' && saleToDelete.quantitySold > 0) {
    const stockItem = await getStockItemById(uid, saleToDelete.stockItemId); // uid eklendi ve await
    if (stockItem) {
      await updateStockItem(uid, { // uid eklendi ve await
        ...stockItem,
        currentStock: stockItem.currentStock + saleToDelete.quantitySold,
      });
    }
  }
  await deleteDoc(saleDocRef);
};

// Payment Functions
export const getPayments = async (uid: string, customerId?: string): Promise<Payment[]> => {
  console.log(`getPayments called with uid: ${uid}`);
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
    console.log("getPayments - querySnapshot.docs:", querySnapshot.docs);
    const payments: Payment[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<Payment, 'id'>,
      currency: doc.data().currency || 'TRY',
    }));
    return payments;
  } catch (error) {
    console.error("Error fetching payments:", error);
    return [];
  }
};

export const addPayment = async (uid: string, paymentData: Omit<Payment, 'id' | 'transactionType'>): Promise<Payment> => {
  const newPaymentData = {
    ...paymentData,
    transactionType: 'payment',
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "payments"), newPaymentData);
  return { ...newPaymentData, id: docRef.id } as Payment;
};

export const updatePayment = async (uid: string, updatedPayment: Payment): Promise<Payment> => {
  const paymentDocRef = doc(_getUserCollectionRef(uid, "payments"), updatedPayment.id);
  const { id, ...finalPayment } = updatedPayment;
  await updateDoc(paymentDocRef, finalPayment);
  return updatedPayment;
};

export const deletePayment = async (uid: string, paymentId: string): Promise<void> => {
  const paymentDocRef = doc(_getUserCollectionRef(uid, "payments"), paymentId);
  await deleteDoc(paymentDocRef);
};

// Supplier Functions
export const getSuppliers = async (uid: string): Promise<Supplier[]> => {
  const q = query(_getUserCollectionRef(uid, "suppliers"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data() as Omit<Supplier, 'id'>
  }));
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

  const purchasesQuery = query(_getUserCollectionRef(uid, "purchases"), where("supplierId", "==", supplierId));
  const purchasesSnapshot = await getDocs(purchasesQuery);
  purchasesSnapshot.forEach(async (purchaseDoc) => {
    await deleteDoc(doc(_getUserCollectionRef(uid, "purchases"), purchaseDoc.id));
  });

  const paymentsToSuppliersQuery = query(_getUserCollectionRef(uid, "paymentsToSuppliers"), where("supplierId", "==", supplierId));
  const paymentsToSuppliersSnapshot = await getDocs(paymentsToSuppliersQuery);
  paymentsToSuppliersSnapshot.forEach(async (paymentDoc) => {
    await deleteDoc(doc(_getUserCollectionRef(uid, "paymentsToSuppliers"), paymentDoc.id));
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
    console.log("getPurchases - querySnapshot.docs:", querySnapshot.docs);
    const purchases: Purchase[] = querySnapshot.docs.map(doc => {
      let description = doc.data().description;
      if (!description && doc.data().stockItemId) {
        // Stok ürünü bilgisi Firestore'dan çekilmeli
        description = "Stok Ürünü Alımı"; // Geçici varsayılan değer
      } else if (!description) {
        description = "Genel Alım";
      }
      return {
        id: doc.id,
        ...doc.data() as Omit<Purchase, 'id'>,
        currency: doc.data().currency || 'TRY',
        description: description
      };
    });
    return purchases;
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return [];
  }
};

export const addPurchase = async (uid: string, purchaseData: Omit<Purchase, 'id' | 'transactionType' | 'description'> & {description?: string}): Promise<Purchase> => {
  let description = purchaseData.description;
  if (purchaseData.stockItemId && !description) {
    const stockItem = await getStockItemById(uid, purchaseData.stockItemId);
    description = stockItem ? stockItem.name : "Stok Ürünü Alımı";
  } else if (!description) {
    description = "Genel Alım";
  }

  const newPurchaseData = {
    ...purchaseData,
    transactionType: 'purchase',
    description: description,
  };

  const docRef = await addDoc(_getUserCollectionRef(uid, "purchases"), newPurchaseData);

  if (purchaseData.stockItemId && typeof purchaseData.quantityPurchased === 'number' && purchaseData.quantityPurchased > 0) {
    const stockItem = await getStockItemById(uid, purchaseData.stockItemId);
    if (stockItem) {
      const updatedStockItem = {
        ...stockItem,
        currentStock: stockItem.currentStock + purchaseData.quantityPurchased,
      };
      await updateStockItem(uid, updatedStockItem);
    }
  }

  return { ...newPurchaseData, id: docRef.id } as Purchase;
};

export const updatePurchase = async (uid: string, updatedPurchaseData: Purchase): Promise<Purchase> => {
  const purchaseDocRef = doc(_getUserCollectionRef(uid, "purchases"), updatedPurchaseData.id);
  const oldPurchaseSnapshot = await getDoc(purchaseDocRef);
  const oldPurchase = oldPurchaseSnapshot.exists() ? oldPurchaseSnapshot.data() as Purchase : undefined;

  // Eski stok etkisini geri al
  if (oldPurchase && oldPurchase.stockItemId && typeof oldPurchase.quantityPurchased === 'number' && oldPurchase.quantityPurchased > 0) {
    const oldStockItem = await getStockItemById(uid, oldPurchase.stockItemId);
    if (oldStockItem) {
      await updateStockItem(uid, {
        ...oldStockItem,
        currentStock: oldStockItem.currentStock - oldPurchase.quantityPurchased,
      });
    }
  }

  let description = updatedPurchaseData.description;
  if (updatedPurchaseData.stockItemId && !description) {
    const stockItem = await getStockItemById(uid, updatedPurchaseData.stockItemId);
    description = stockItem ? stockItem.name : "Stok Ürünü Alımı";
  } else if (!description) {
    description = "Genel Alım";
  }

  // Yeni stok etkisini uygula
  if (updatedPurchaseData.stockItemId && typeof updatedPurchaseData.quantityPurchased === 'number' && updatedPurchaseData.quantityPurchased > 0) {
    const newStockItem = await getStockItemById(uid, updatedPurchaseData.stockItemId);
    if (newStockItem) {
      await updateStockItem(uid, {
        ...newStockItem,
        currentStock: newStockItem.currentStock + updatedPurchaseData.quantityPurchased,
      });
    }
  }

  const { id, ...updateData } = updatedPurchaseData;
  const finalUpdatedPurchase = { ...updateData, description };
  await updateDoc(purchaseDocRef, finalUpdatedPurchase);
  return { ...finalUpdatedPurchase, id } as Purchase;
};

export const deletePurchase = async (uid: string, purchaseId: string): Promise<void> => {
  const purchaseDocRef = doc(_getUserCollectionRef(uid, "purchases"), purchaseId);
  const purchaseToDeleteSnapshot = await getDoc(purchaseDocRef);
  const purchaseToDelete = purchaseToDeleteSnapshot.exists() ? purchaseToDeleteSnapshot.data() as Purchase : undefined;

  if (purchaseToDelete && purchaseToDelete.stockItemId && typeof purchaseToDelete.quantityPurchased === 'number' && purchaseToDelete.quantityPurchased > 0) {
    const stockItem = await getStockItemById(uid, purchaseToDelete.stockItemId);
    if (stockItem) {
      await updateStockItem(uid, {
        ...stockItem,
        currentStock: stockItem.currentStock - purchaseToDelete.quantityPurchased,
      });
    }
  }
  await deleteDoc(purchaseDocRef);
};

// Payment To Supplier Functions
export const getPaymentsToSuppliers = async (uid: string, supplierId?: string): Promise<PaymentToSupplier[]> => {
  console.log(`getPaymentsToSuppliers called with uid: ${uid}`);
  if (!uid) {
    console.error("getPaymentsToSuppliers: User ID (uid) is missing.");
    return [];
  }
  try {
    let paymentsToSuppliersQuery = query(_getUserCollectionRef(uid, "paymentsToSuppliers"), orderBy("date", "desc"));
    if (supplierId) {
      paymentsToSuppliersQuery = query(paymentsToSuppliersQuery, where("supplierId", "==", supplierId));
    }
    const querySnapshot = await getDocs(paymentsToSuppliersQuery);
    console.log("getPaymentsToSuppliers - querySnapshot.docs:", querySnapshot.docs);
    const paymentsToSuppliers: PaymentToSupplier[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<PaymentToSupplier, 'id'>
    }));
    return paymentsToSuppliers;
  } catch (error) {
    console.error("Error fetching payments to suppliers:", error);
    return [];
  }
};

export const addPaymentToSupplier = async (uid: string, paymentData: Omit<PaymentToSupplier, 'id' | 'transactionType'>): Promise<PaymentToSupplier> => {
  const newPaymentData = {
    ...paymentData,
    transactionType: 'paymentToSupplier',
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "paymentsToSuppliers"), newPaymentData);
  return { ...newPaymentData, id: docRef.id } as PaymentToSupplier;
};

export const updatePaymentToSupplier = async (uid: string, updatedPayment: PaymentToSupplier): Promise<PaymentToSupplier> => {
  const paymentDocRef = doc(_getUserCollectionRef(uid, "paymentsToSuppliers"), updatedPayment.id);
  const { id, ...updateData } = updatedPayment;
  await updateDoc(paymentDocRef, updateData);
  return updatedPayment;
};

export const deletePaymentToSupplier = async (uid: string, paymentId: string): Promise<void> => {
  const paymentDocRef = doc(_getUserCollectionRef(uid, "paymentsToSuppliers"), paymentId);
  await deleteDoc(paymentDocRef);
};

// Todo Functions
export const getTodos = async (uid: string): Promise<TodoItem[]> => {
  console.log(`getTodos called with uid: ${uid}`);
  const q = query(_getUserCollectionRef(uid, "todos"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  const todos: TodoItem[] = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data() as Omit<TodoItem, 'id'>
  }));
  // Tarihe göre sıralama (varsa dueDate, yoksa createdAt)
  return todos.sort((a, b) => {
    const dateA = a.dueDate ? parseISO(a.dueDate).getTime() : parseISO(a.createdAt).getTime();
    const dateB = b.dueDate ? parseISO(b.dueDate).getTime() : parseISO(b.createdAt).getTime();
    return dateB - dateA;
  });
};

export const addTodo = async (uid: string, payload: { text: string; dueDate?: Date; notes?: string; }): Promise<TodoItem> => {
  const now = formatISO(new Date());
  const newTodoData = {
    text: payload.text,
    completed: false,
    createdAt: now,
    dueDate: payload.dueDate ? formatISO(payload.dueDate, { representation: 'date' }) : null,
    notes: payload.notes || null,
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "todos"), newTodoData);
  return { ...newTodoData, id: docRef.id } as TodoItem;
};

export const toggleTodoCompleted = async (uid: string, todoId: string): Promise<TodoItem | undefined> => {
  const todoDocRef = doc(_getUserCollectionRef(uid, "todos"), todoId);
  const docSnap = await getDoc(todoDocRef);
  if (docSnap.exists()) {
    const currentStatus = docSnap.data().completed;
    await updateDoc(todoDocRef, { completed: !currentStatus });
    return { ...docSnap.data() as TodoItem, id: docSnap.id, completed: !currentStatus };
  }
  return undefined;
};

export const deleteTodo = async (uid: string, todoId: string): Promise<void> => {
  const todoDocRef = doc(_getUserCollectionRef(uid, "todos"), todoId);
  await deleteDoc(todoDocRef);
};

// Portfolio Functions
export const getPortfolioItems = async (uid: string): Promise<PortfolioItem[]> => {
  console.log(`getPortfolioItems called with uid: ${uid}`);
  if (!uid) {
    console.error("getPortfolioItems: User ID (uid) is missing. Returning empty array.");
    return [];
  }
  try {
    const q = query(_getUserCollectionRef(uid, "portfolioItems"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (!Array.isArray(querySnapshot.docs)) {
      console.error("getPortfolioItems: querySnapshot.docs is not an array.", querySnapshot.docs);
      return [];
    }

    return querySnapshot.docs.map(doc => ({
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
    notes: itemData.notes || null,
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "portfolioItems"), newItemData);
  return { ...newItemData, id: docRef.id } as PortfolioItem;
};

export const updatePortfolioItem = async (uid: string, updatedItem: PortfolioItem): Promise<PortfolioItem> => {
  const now = formatISO(new Date());
  const portfolioItemDocRef = doc(_getUserCollectionRef(uid, "portfolioItems"), updatedItem.id);
  const { id, ...updateData } = updatedItem;
  const finalItem = { ...updateData, updatedAt: now, notes: updateData.notes || null };
  await updateDoc(portfolioItemDocRef, finalItem);
  return { ...finalItem, id } as PortfolioItem;
};

export const deletePortfolioItem = async (uid: string, itemId: string): Promise<void> => {
  const portfolioItemDocRef = doc(_getUserCollectionRef(uid, "portfolioItems"), itemId);
  await deleteDoc(portfolioItemDocRef);
};

// Archived Files Metadata Functions (Dosyaların kendisi için Firebase Storage düşünülebilir)
export const getArchivedFilesMetadata = async (uid: string): Promise<ArchivedFile[]> => {
  console.log(`getArchivedFilesMetadata called with uid: ${uid}`);
  if (!uid) {
    console.error("getArchivedFilesMetadata: User ID (uid) is missing. Returning empty array.");
    return [];
  }
  try {
    const q = query(_getUserCollectionRef(uid, "archivedFilesMetadata"), orderBy("uploadDate", "desc"));
    const querySnapshot = await getDocs(q);

    if (!Array.isArray(querySnapshot.docs)) {
      console.error("getArchivedFilesMetadata: querySnapshot.docs is not an array.", querySnapshot.docs);
      return [];
    }

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<ArchivedFile, 'id'>
    }));
  } catch (error) {
    console.error("Error fetching archived files metadata:", error);
    return [];
  }
};

export const addArchivedFile = async (uid: string, fileMetadataInput: Omit<ArchivedFile, 'id' | 'uploadDate'>, fileBlob: Blob): Promise<ArchivedFile> => {
  // Not: Dosya içeriği (fileBlob) şu anda Firestore'a kaydedilmiyor.
  // Büyük dosyalar için Firebase Storage kullanılması önerilir.
  // Bu örnekte sadece metadata Firestore'a kaydediliyor.
  const now = formatISO(new Date());
  const newMetadata = {
    ...fileMetadataInput,
    uploadDate: now,
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "archivedFilesMetadata"), newMetadata);
  return { ...newMetadata, id: docRef.id } as ArchivedFile;
};

export const deleteArchivedFile = async (uid: string, fileId: string): Promise<void> => {
  const fileDocRef = doc(_getUserCollectionRef(uid, "archivedFilesMetadata"), fileId);
  await deleteDoc(fileDocRef);
  // Not: Eğer dosya Firebase Storage'da ise, buradan ayrıca silinmelidir.
};

// Useful Links Functions
export const getUsefulLinks = async (uid: string): Promise<UsefulLink[]> => {
  console.log(`getUsefulLinks called with uid: ${uid}`);
  if (!uid) {
    console.error("getUsefulLinks: User ID (uid) is missing. Returning empty array.");
    return [];
  }
  try {
    const q = query(_getUserCollectionRef(uid, "usefulLinks"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (!Array.isArray(querySnapshot.docs)) {
      console.error("getUsefulLinks: querySnapshot.docs is not an array.", querySnapshot.docs);
      return [];
    }

    return querySnapshot.docs.map(doc => ({
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

// Quotation Functions
export const getQuotations = async (uid: string): Promise<Quotation[]> => {
  if (!uid) {
    console.error("getQuotations: User ID (uid) is missing.");
    return [];
  }
  try {
    const q = query(_getUserCollectionRef(uid, "quotations"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (!Array.isArray(querySnapshot.docs)) {
      console.error("getQuotations: querySnapshot.docs is not an array.", querySnapshot.docs);
      return [];
    }

    return querySnapshot.docs.map(doc => {
      const data = doc.data() as Omit<Quotation, 'id'>;
      return {
        id: doc.id,
        ...data,
        // date alanını ISO string formatında tutmaya devam et
        date: data.date || formatISO(new Date()), // Firestore'dan gelen stringi kullan, yoksa varsayılan ISO string
        validUntilDate: data.validUntilDate || formatISO(addDays(new Date(), 30)), // Firestore'dan gelen stringi kullan, yoksa varsayılan ISO string
        // items dizisindeki her bir item'ın total değerini hesaplama
        items: data.items?.map((item: any) => ({
          ...item,
          total: (item.quantity || 0) * (item.unitPrice || 0) // quantity ve unitPrice null/undefined ise 0 kabul et
        })) || []
      };
    });
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
  const today = new Date();
  const year = today.getFullYear();
  const q = query(_getUserCollectionRef(uid, "quotations"), 
                  where("date", ">=", formatISO(new Date(year, 0, 1), { representation: 'date' })),
                  where("date", "<=", formatISO(new Date(year, 11, 31), { representation: 'date' })),
                  orderBy("createdAt", "desc"), // En yeni teklif numarasını bulmak için
                  limit(1) // Sadece 1 sonuç al
                );
  const querySnapshot = await getDocs(q);
  let latestNumber = 0;
  if (!querySnapshot.empty) {
    const latestQuotation = querySnapshot.docs[0].data() as Quotation;
    const match = latestQuotation.quotationNumber.match(/TEKLIF-(\d{4})-(\d{3})/);
    if (match && parseInt(match[1]) === year) {
      latestNumber = parseInt(match[2]);
    }
  }
  const nextNumber = latestNumber + 1;
  return `TEKLIF-${year}-${String(nextNumber).padStart(3, '0')}`;
};

export const addQuotation = async (uid: string, quotationData: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt' | 'quotationNumber'>): Promise<Quotation> => {
  const now = formatISO(new Date());
  const quotationNumber = await generateQuotationNumber(uid);
  const newQuotationData = {
    ...quotationData,
    quotationNumber: quotationNumber,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(_getUserCollectionRef(uid, "quotations"), newQuotationData);
  return { ...newQuotationData, id: docRef.id } as Quotation;
};

export const updateQuotation = async (uid: string, updatedQuotation: Quotation): Promise<Quotation> => {
  const now = formatISO(new Date());
  const quotationDocRef = doc(_getUserCollectionRef(uid, "quotations"), updatedQuotation.id);
  const { id, ...updateData } = updatedQuotation;
  const finalQuotation = { ...updateData, updatedAt: now };
  await updateDoc(quotationDocRef, finalQuotation);
  return { ...finalQuotation, id } as Quotation;
};

export const deleteQuotation = async (uid: string, quotationId: string): Promise<void> => {
  const quotationDocRef = doc(_getUserCollectionRef(uid, "quotations"), quotationId);
  await deleteDoc(quotationDocRef);
};

// Contact History Functions
export const addContactHistory = async (uid: string, contactHistoryData: Omit<ContactHistoryItem, 'id'>): Promise<ContactHistoryItem> => {
  const docRef = await addDoc(_getUserCollectionRef(uid, "contactHistory"), contactHistoryData);
  return { ...contactHistoryData, id: docRef.id } as ContactHistoryItem;
};

export const updateContactHistory = async (uid: string, contactHistoryData: ContactHistoryItem): Promise<ContactHistoryItem> => {
  const contactHistoryDocRef = doc(_getUserCollectionRef(uid, "contactHistory"), contactHistoryData.id);
  await updateDoc(contactHistoryDocRef, contactHistoryData);
  return contactHistoryData;
};

export const deleteContactHistory = async (uid: string, contactHistoryId: string): Promise<void> => {
  const contactHistoryDocRef = doc(_getUserCollectionRef(uid, "contactHistory"), contactHistoryId);
  await deleteDoc(contactHistoryDocRef);
};

// Task Functions
export const addTask = async (uid: string, taskData: Omit<SupplierTask, 'id'>): Promise<SupplierTask> => {
  const docRef = await addDoc(_getUserCollectionRef(uid, "tasks"), taskData);
  return { ...taskData, id: docRef.id } as SupplierTask;
};

export const updateTask = async (uid: string, taskData: SupplierTask): Promise<SupplierTask> => {
  const taskDocRef = doc(_getUserCollectionRef(uid, "tasks"), taskData.id);
  await updateDoc(taskDocRef, taskData);
  return taskData;
};

export const deleteTask = async (uid: string, taskId: string): Promise<void> => {
  const taskDocRef = doc(_getUserCollectionRef(uid, "tasks"), taskId);
  await deleteDoc(taskDocRef);
};
