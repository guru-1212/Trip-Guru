'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Dumbbell,
  BookOpen,
  TrendingUp,
  CheckSquare,
  BarChart3,
  User,
  Droplets,
  Utensils,
  History,
  CalendarDays,
  Scale,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppMode } from '@/hooks/useAppMode';

const navItems = [
  { href: '/fittrack/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/fittrack/water', label: 'Water', icon: Droplets },
  { href: '/fittrack/diet', label: 'Diet', icon: Utensils },
  { href: '/fittrack/workout', label: 'Workout', icon: Dumbbell },
  { href: '/fittrack/history', label: 'History', icon: History },
  { href: '/fittrack/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/fittrack/exercises', label: 'Exercises', icon: BookOpen },
  { href: '/fittrack/progress', label: 'Progress', icon: TrendingUp },
  { href: '/fittrack/progress-photos', label: 'Photos', icon: Camera },
  { href: '/fittrack/weight', label: 'Weight', icon: Scale },
  { href: '/fittrack/checklist', label: 'Checklist', icon: CheckSquare },
  { href: '/fittrack/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/fittrack/profile', label: 'Profile', icon: User },
];

export function WorkoutSidebar() {
  const pathname = usePathname();

  return (
    <aside className="ft-sidebar">
      <div className="flex flex-col h-full py-6 px-4 gap-6">
        <div className="px-2">
          <h1 className="ft-title text-primary">FitTrack</h1>
          <p className="ft-subtitle text-xs mt-0.5">Workout Tracker</p>
        </div>

        <nav className="flex-1 space-y-0.5">
          <p className="text-xs font-semibold text-muted-foreground px-2 mb-3">Menu</p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn('ft-nav-link', active && 'ft-nav-link--active')}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Dumbbell className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Stay consistent</p>
              <p className="text-xs text-muted-foreground">Log every session</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
