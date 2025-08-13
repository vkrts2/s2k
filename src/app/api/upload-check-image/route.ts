import { NextRequest, NextResponse } from 'next/server';
import { adminBucket } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 20;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uid = (formData.get('uid') as string | null) || 'public';
    if (!file) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = encodeURIComponent(file.name);
    const filename = `${uid}/checks/${Date.now()}_${safeName}`;

    const fileRef = adminBucket.file(filename);
    await fileRef.save(buffer, {
      contentType: file.type || 'application/octet-stream',
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


