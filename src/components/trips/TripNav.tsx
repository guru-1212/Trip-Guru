'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Overview', segment: '' },
  { label: 'Expenses', segment: '/expenses' },
  { label: 'Members', segment: '/members' },
  { label: 'Settlement', segment: '/settlement' },
  { label: 'Memories', segment: '/memories' },
  { label: 'Analytics', segment: '/analytics' },
];

export function TripNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto pb-2 border-b border-border mb-6">
      {tabs.map(({ label, segment }) => {
        const href = `${base}${segment}`;
        const active =
          segment === ''
            ? pathname === base
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-colors',
              active
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
