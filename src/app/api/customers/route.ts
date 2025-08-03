import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    const customersRef = collection(db, 'customers');
    const snapshot = await getDocs(customersRef);
    const customers = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
    }));

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Müşteri listesi alınamadı' }, { status: 500 });
  }
} 