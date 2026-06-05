'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GymDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/fittrack/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-muted-foreground font-black uppercase tracking-[0.2em] animate-pulse">Redirecting to Training Hub...</p>
    </div>
  );
}
