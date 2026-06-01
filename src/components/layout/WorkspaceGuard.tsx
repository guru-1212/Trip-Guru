'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppMode } from '@/hooks/useAppMode';

/** Redirect away from trip/room routes when the other workspace mode is active. */
export function WorkspaceGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, initialized } = useAppMode();

  useEffect(() => {
    if (!initialized) return;

    if (mode === 'trip' && pathname.startsWith('/rooms')) {
      router.replace('/dashboard');
      return;
    }
    if (mode === 'room' && pathname.startsWith('/trips')) {
      router.replace('/dashboard');
    }
  }, [mode, pathname, initialized, router]);

  return null;
}
