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

    const isTripRoute = pathname.startsWith('/trips');
    const isRoomRoute = pathname.startsWith('/rooms');
    const isGymRoute = pathname.startsWith('/fittrack');
    const isYogaRoute = pathname.startsWith('/yoga');

    if (mode === 'trip' && (isRoomRoute || isYogaRoute)) {
      router.replace('/dashboard');
      return;
    }
    if (mode === 'room' && (isTripRoute || isYogaRoute)) {
      router.replace('/dashboard');
      return;
    }
    if (mode === 'gym' && (isTripRoute || isRoomRoute || isYogaRoute)) {
      router.replace('/fittrack/dashboard');
      return;
    }
    if (mode === 'yoga' && (isTripRoute || isRoomRoute || isGymRoute)) {
      router.replace('/yoga/dashboard');
      return;
    }
  }, [mode, pathname, initialized, router]);

  return null;
}
