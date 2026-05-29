'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      router.replace('/login');
    }
  }, [initialized, isAuthenticated, router]);

  if (!initialized) {
    return <LoadingSpinner label="Loading TripMate..." />;
  }

  if (!isAuthenticated) {
    return <LoadingSpinner label="Redirecting..." />;
  }

  return <>{children}</>;
}
