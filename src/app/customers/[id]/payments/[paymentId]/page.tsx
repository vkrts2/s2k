import { useParams } from 'next/navigation';

export default function PaymentDetailPage() {
  const params = useParams();
  const customerId = params.id as string;
  const paymentId = params.paymentId as string;

  // ... existing code ...
} 