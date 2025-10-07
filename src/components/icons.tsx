// src/components/icons.tsx
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Kullanıcıya not: Lütfen yeni logonuzu projenizin public klasörüne
// 'ermay-logo.png' adıyla kaydedin.
export const AppLogo = ({ className, width = 180, height = 90 }: { className?: string, width?: number, height?: number }) => (
  <Image
    src="/ermay-logo.png" // Bu satır, logonun public klasörünün kökünde olduğunu varsayar
    alt="ERMAY Logo"
    width={width}
    height={height}
    className={cn(className)}
    style={{ objectFit: 'contain' }}
    priority
  />
);
