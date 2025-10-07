import { NextRequest, NextResponse } from 'next/server';
import { getAdminBucket } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 20;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const dataUrl = formData.get('dataUrl') as string | null;
    const mime = (formData.get('mime') as string | null) || (file ? file.type : 'application/octet-stream');
    const uid = (formData.get('uid') as string | null) || 'public';
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

    const fileRef = getAdminBucket().file(filename);
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


