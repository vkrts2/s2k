import { useParams } from 'next/navigation';

export default function SaleDetailPage() {
  const params = useParams();
  const customerId = params.id as string;
  const saleId = params.saleId as string;

  return (
    // ... existing code ...
  );
} 