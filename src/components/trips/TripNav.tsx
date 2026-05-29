'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Users,
  HandCoins,
  Camera,
  BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Overview', segment: '', icon: LayoutDashboard },
  { label: 'Expenses', segment: '/expenses', icon: Wallet },
  { label: 'Members', segment: '/members', icon: Users },
  { label: 'Settlement', segment: '/settlement', icon: HandCoins },
  { label: 'Memories', segment: '/memories', icon: Camera },
  { label: 'Analytics', segment: '/analytics', icon: BarChart2 },
];

export function TripNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-2 mb-6">
      {tabs.map(({ label, segment, icon: Icon }) => {
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
              'flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-colors',
              active
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
