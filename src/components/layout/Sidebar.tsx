'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/trips/new', label: 'New Trip', icon: PlusCircle },
  { href: '/profile', label: 'Profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-56 flex-col border-r border-border min-h-[calc(100vh-3.5rem)] p-4 gap-1">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname === href || pathname.startsWith(href + '/')
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </aside>
  );
}
