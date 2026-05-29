'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, initialized } = useAuth();

  useEffect(() => {
    if (!initialized) return;
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [initialized, isAuthenticated, router]);

  return <LoadingSpinner label="Loading TripMate..." />;
}
