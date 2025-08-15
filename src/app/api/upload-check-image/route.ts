import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 20;

export async function POST(req: NextRequest) {
  // Build zamanında bu route çalışmamalı
  if (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available during build' }, { status: 503 });
  }

  try {
    // Environment variable'ları kontrol et
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error('Firebase Admin credentials missing during runtime');
      return NextResponse.json({ 
        error: 'Firebase Admin not configured properly' 
      }, { status: 500 });
    }

    // Auth'u dinamik olarak import et
    const { getServerSession } = await import('@/lib/auth');
    const session = await getServerSession();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const uid = session.user.id;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const dataUrl = formData.get('dataUrl') as string | null;
    const mime = (formData.get('mime') as string | null) || (file ? file.type : 'application/octet-stream');
    let buffer: Buffer;
    let filename: string;

    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      const safeName = encodeURIComponent(file.name);
      filename = `${uid}/checks/${Date.now()}_${safeName}`;
    } else if (dataUrl) {
      const base64 = dataUrl.split(',')[1] || '';
      buffer = Buffer.from(base64, 'base64');
      filename = `${uid}/checks/${Date.now()}.upload`;
    } else {
      return NextResponse.json({ error: 'file or dataUrl required' }, { status: 400 });
    }

    // Firebase Admin'i dinamik olarak import et
    const { getAdminBucket } = await import('@/lib/firebaseAdmin');
    const bucket = getAdminBucket();
    const fileRef = bucket.file(filename);
    await fileRef.save(buffer, {
      contentType: mime || 'application/octet-stream',
      resumable: false,
      metadata: { cacheControl: 'public, max-age=31536000' },
    });

    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '2100-01-01',
    });

    return NextResponse.json({ url });
  } catch (e: any) {
    console.error('upload-check-image error', e);
    return NextResponse.json({ error: 'upload failed' }, { status: 500 });
  }
}