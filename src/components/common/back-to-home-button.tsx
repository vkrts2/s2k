import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function BackToHomeButton() {
  const router = useRouter();
  return (
    <Button variant="outline" onClick={() => router.push('/')} className="mb-4 flex items-center justify-center" size="icon" title="Ana Sayfa">
      <Home className="h-5 w-5" />
    </Button>
  );
} 