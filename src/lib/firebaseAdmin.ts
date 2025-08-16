// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getStorage, Storage, Bucket } from 'firebase-admin/storage';

let cachedAdminApp: App | null = null;
let cachedStorage: Storage | null = null;

export function getAdminApp(): App {
  if (cachedAdminApp) return cachedAdminApp;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (privateKey) privateKey = privateKey.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    cachedAdminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    return cachedAdminApp;
  }

  cachedAdminApp = initializeApp({
    credential: applicationDefault(),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return cachedAdminApp;
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


