'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Dumbbell, UserRound, ClipboardList, Activity, Camera, CheckSquare, BarChart3 } from 'lucide-react';

const links = [
  { href: '/gym', label: 'Dashboard', icon: Dumbbell },
  { href: '/gym/profile', label: 'Profile', icon: UserRound },
  { href: '/gym/workouts', label: 'Workouts', icon: ClipboardList },
  { href: '/gym/exercises', label: 'Exercises', icon: Activity },
  { href: '/gym/progress', label: 'Progress', icon: BarChart3 },
  { href: '/gym/photos', label: 'Photos', icon: Camera },
  { href: '/gym/checklist', label: 'Checklist', icon: CheckSquare },
  { href: '/gym/analytics', label: 'Analytics', icon: BarChart3 },
];

export function GymNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold border transition-colors',
              active ? 'bg-primary text-white border-primary' : 'bg-background text-muted-foreground border-border hover:text-primary'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
