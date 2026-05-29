'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/trips/new', label: 'New', icon: PlusCircle },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div className="flex justify-around py-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-1 text-xs',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
