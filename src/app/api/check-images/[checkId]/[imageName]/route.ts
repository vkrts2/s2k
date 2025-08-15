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
    
    // Kullanıcı ID'sini almak için URL'den checkId'yi kullan
    // Bu örnekte, checkId'nin kullanıcı ID'sini içerdiğini varsayıyoruz
    // Gerçek uygulamada, checkId'den kullanıcı ID'sini almak için Firestore sorgusu yapabilirsiniz
    const uid = 'public'; // Örnek olarak 'public' kullanıyoruz, gerçek uygulamada değiştirin
    
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