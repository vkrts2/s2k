// src/lib/indexedDBStorage.ts
"use client";

const DB_NAME = 'ermayFileStorage';
const STORE_NAME = 'files';
const DB_VERSION = 1;

interface IDBErrorEvent extends Event {
  target: IDBRequest & { error?: DOMException | null };
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('IndexedDB açılamadı'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
  });
};

export const storeFileInDB = async (fileName: string, fileBlob: Blob): Promise<void> => {
  try {
    const db = await openDB();
  return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ name: fileName, data: fileBlob });

    request.onsuccess = () => {
      resolve();
    };

      request.onerror = () => {
        reject(new Error('Dosya kaydedilemedi'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
  } catch (error) {
    console.error('Dosya kaydetme hatası:', error);
    throw error;
  }
};

export const getFileFromDB = async (fileName: string): Promise<Blob | null> => {
  try {
    const db = await openDB();
  return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
      const request = store.get(fileName);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          resolve(result.data);
      } else {
          resolve(null);
      }
    };

      request.onerror = () => {
        reject(new Error('Dosya getirilemedi'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
  } catch (error) {
    console.error('Dosya getirme hatası:', error);
    throw error;
  }
};

export const deleteFileFromDB = async (fileName: string): Promise<void> => {
  try {
    const db = await openDB();
  return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(fileName);

    request.onsuccess = () => {
      resolve();
    };

      request.onerror = () => {
        reject(new Error('Dosya silinemedi'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
  } catch (error) {
    console.error('Dosya silme hatası:', error);
    throw error;
  }
};
