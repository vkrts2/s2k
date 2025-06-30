import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

async function fixCollectionTotalAmounts(collectionName: string) {
  const snapshot = await db.collection(collectionName).get();
  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if ((data.amount !== undefined && (data.totalAmount === undefined || data.totalAmount === null))) {
      await doc.ref.update({ totalAmount: data.amount });
      updated++;
      console.log(`Güncellendi: ${collectionName}/${doc.id} -> totalAmount: ${data.amount}`);
    }
  }
  console.log(`${collectionName} koleksiyonunda ${updated} kayıt güncellendi.`);
}

async function main() {
  await fixCollectionTotalAmounts('purchases');
  await fixCollectionTotalAmounts('sales');
  console.log('Tüm işlemler tamamlandı.');
}

main().catch(console.error); 