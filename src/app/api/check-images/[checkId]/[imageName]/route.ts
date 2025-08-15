import { NextRequest, NextResponse } from 'next/server';
import { getAdminBucket } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 20;

export async function GET(req: NextRequest, { params }: { params: { checkId: string, imageName: string } }) {
  try {
    const { checkId, imageName } = params;
    
    // URL'den gelen imageName'i decode et
    const decodedImageName = decodeURIComponent(imageName);
    
    // Çek ID'sinden kullanıcı ID'sini almak için Firestore'dan çek bilgilerini sorgulayalım
    const { getCheckById } = await import('@/lib/storage');
    const { getFirestore, doc, getDoc } = await import('firebase/firestore');
    const { app } = await import('@/lib/firebase');
    
    // Firestore'dan çek belgesini al
    const db = getFirestore(app);
    // Tüm kullanıcıların koleksiyonlarını kontrol etmemiz gerekiyor
    // Önce kullanıcı koleksiyonlarını alalım
    const { collection, getDocs } = await import('firebase/firestore');
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
    
    // Firebase Storage'dan dosyayı al
    const fileRef = getAdminBucket().file(filePath);
    
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