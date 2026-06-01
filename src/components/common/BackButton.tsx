'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className }: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Don't show back button on dashboard
  if (pathname === '/dashboard') {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "gap-1 px-2 h-9 rounded-xl font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all active:scale-95",
        className
      )}
      onClick={() => router.back()}
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="hidden xs:inline text-xs uppercase tracking-widest">Back</span>
    </Button>
  );
}
