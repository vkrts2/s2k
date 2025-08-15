// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getStorage, Storage, Bucket } from 'firebase-admin/storage';

let cachedAdminApp: App | null = null;
let cachedStorage: Storage | null = null;

export function getAdminApp(): App {
  // Build zamanında Firebase Admin'e erişim olmayabilir
  if (typeof window !== 'undefined') {
    throw new Error('Firebase Admin should not be used on client side');
  }

  // Build zamanında environment variable'lar olmayabilir
  if (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production') {
    throw new Error('Firebase Admin not available during build');
  }

  if (cachedAdminApp) return cachedAdminApp;

  // Mevcut uygulamaları kontrol et
  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedAdminApp = existingApps[0];
    return cachedAdminApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    const errorMsg = 'Firebase Admin credentials missing';
    console.error(errorMsg, {
      projectId: !!projectId,
      clientEmail: !!clientEmail,
      privateKey: !!privateKey,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });
    throw new Error(errorMsg);
  }

  // Private key'i düzelt
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    // Eğer private key quotes ile sarılmışsa temizle
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
  }

  try {
    cachedAdminApp = initializeApp({
      credential: cert({ 
        projectId, 
        clientEmail, 
        privateKey 
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    console.log('Firebase Admin initialized successfully');
    return cachedAdminApp;
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
    throw new Error(`Firebase Admin initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getAdminStorage(): Storage {
  if (cachedStorage) return cachedStorage;
  const app = getAdminApp();
  cachedStorage = getStorage(app);
  return cachedStorage;
}

export function getAdminBucket(): Bucket {
  return getAdminStorage().bucket();
}