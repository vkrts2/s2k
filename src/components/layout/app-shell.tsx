// src/components/layout/app-shell.tsx
"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";

// Kenar çubuğu ve header bileşenleri kaldırıldı,
// navigasyon ana sayfadaki kartlar ve AuthGuard ile yönetiliyor.

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen w-full flex-col bg-background print:bg-white print:text-black">
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
