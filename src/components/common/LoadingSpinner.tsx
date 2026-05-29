'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
  label?: string;
}

export function LoadingSpinner({ className, size = 32, label }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-12', className)}>
      <Loader2 className="animate-spin text-primary" size={size} />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-border p-4 space-y-3">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-8 bg-muted rounded w-full" />
    </div>
  );
}
