'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

const linkClass =
  'inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors group w-fit';

export function PageBackNav() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => router.back()}
        className={linkClass}
      >
        <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        Back to previous page
      </button>
      <Link href="/dashboard" className={linkClass}>
        <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        Back to Dashboard
      </Link>
    </div>
  );
}
