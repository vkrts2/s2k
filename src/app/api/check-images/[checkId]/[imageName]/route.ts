import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: { checkId: string, imageName: string } }) {
  // Sadece runtime'da çalış, build zamanında değil
  if (!process.env.VERCEL_URL && !process.env.VERCEL_ENV) {
    return NextResponse.json({ error: 'Service not available' }, { status: 503 });
  }

  try {
    const { checkId, imageName } = params;
    
    // URL'den gelen imageName'i decode et
    const decodedImageName = decodeURIComponent(imageName);
    
    // Çek ID'sinden kullanıcı ID'sini almak için Firestore'dan çek bilgilerini sorgulayalım
    const { getFirestore, doc, getDoc, collection, getDocs } = await import('firebase/firestore');
    const { app: clientApp } = await import('@/lib/firebase');
    
    // Firestore'dan çek belgesini al
    const db = getFirestore(clientApp);
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    
    let checkSnap = null;
    let foundUid = null;
    
    // Her kullanıcının çek koleksiyonunu kontrol et
    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;
      const checkRef = doc(db, `users/${uid}/checks`, checkId);
      const tempCheckSnap = await getDoc(checkRef);
      
      if (tempCheckSnap.exists()) {
        checkSnap = tempCheckSnap;
        foundUid = uid;
        break;
      }
    }
    
    // Çek bulunamadıysa hata döndür
    if (!checkSnap || !foundUid) {
      return NextResponse.json({ error: 'Çek bulunamadı' }, { status: 404 });
    }
    
    // Bulunan kullanıcı ID'sini kullan
    const uid = foundUid;
    
    // Dosya yolunu oluştur
    const filePath = `${uid}/checks/${decodedImageName}`;
    
    // Firebase Admin'i dinamik olarak import et
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getStorage } = await import('firebase-admin/storage');
    
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 });
    }

    let app;
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      let cleanPrivateKey = privateKey.replace(/\\n/g, '\n');
      if (cleanPrivateKey.startsWith('"') && cleanPrivateKey.endsWith('"')) {
        cleanPrivateKey = cleanPrivateKey.slice(1, -1);
      }
      
      app = initializeApp({
        credential: cert({ 
          projectId, 
          clientEmail, 
          privateKey: cleanPrivateKey 
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }

    const bucket = getStorage(app).bucket();
    const fileRef = bucket.file(filePath);
    
    // Dosyanın var olup olmadığını kontrol et
    const [exists] = await fileRef.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 });
    }
    
    // Dosyanın içeriğini al
    const [fileContent] = await fileRef.download();
    
    // Dosya türünü belirle
    const [metadata] = await fileRef.getMetadata();
    const contentType = metadata.contentType || 'application/octet-stream';
    
    // Dosyayı doğrudan yanıt olarak gönder
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (e: any) {
    console.error('check-images error', e);
    return NextResponse.json({ error: 'Görsel yüklenirken hata oluştu' }, { status: 500 });
  }
}