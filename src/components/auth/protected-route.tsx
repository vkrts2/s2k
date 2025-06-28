'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const unprotectedRoutes = ['/login', '/register'];

  useEffect(() => {
    // If not loading, no user, and current path is a protected route, redirect to login
    if (!loading && !user && !unprotectedRoutes.includes(pathname)) {
      router.push('/login');
    }
    // If user is logged in and on a login/register page, redirect to home
    if (!loading && user && unprotectedRoutes.includes(pathname)) {
      router.push('/');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If there's no user and the current path is a protected route, don't render children (rely on redirect)
  if (!user && !unprotectedRoutes.includes(pathname)) {
    return null;
  }

  // Otherwise, render children (either user is logged in, or it's an unprotected route)
  return <>{children}</>;
} 