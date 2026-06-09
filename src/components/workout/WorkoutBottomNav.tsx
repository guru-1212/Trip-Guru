'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Dumbbell,
  BookOpen,
  TrendingUp,
  CheckSquare,
  User,
  Droplets,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/fittrack/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/fittrack/water', label: 'Water', icon: Droplets },
  { href: '/fittrack/workout', label: 'Workout', icon: Dumbbell },
  { href: '/fittrack/exercises', label: 'Library', icon: BookOpen },
  { href: '/fittrack/progress', label: 'Progress', icon: TrendingUp },
  { href: '/fittrack/checklist', label: 'Tasks', icon: CheckSquare },
  { href: '/fittrack/profile', label: 'Profile', icon: User },
];

export function WorkoutBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="ft-bottom-nav">
      <div className="ft-bottom-nav-inner">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn('ft-bottom-link', active && 'ft-bottom-link--active')}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
