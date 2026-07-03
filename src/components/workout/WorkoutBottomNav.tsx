'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppMode } from '@/hooks/useAppMode';

const navItems = [
  { href: '/fittrack/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/fittrack/water', label: 'Water', icon: Droplets },
  { href: '/fittrack/diet', label: 'Diet', icon: Utensils },
  { href: '/fittrack/workout', label: 'Workout', icon: Dumbbell },
  { href: '/fittrack/history', label: 'History', icon: History },
  { href: '/fittrack/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/fittrack/exercises', label: 'Library', icon: BookOpen },
  { href: '/fittrack/progress', label: 'Progress', icon: TrendingUp },
  { href: '/fittrack/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/fittrack/checklist', label: 'Tasks', icon: CheckSquare },
  { href: '/fittrack/profile', label: 'Profile', icon: User },
];

export function WorkoutBottomNav() {
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (activeLinkRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeTab = activeLinkRef.current;

      const containerWidth = container.offsetWidth;
      const tabOffsetLeft = activeTab.offsetLeft;
      const tabWidth = activeTab.offsetWidth;

      const scrollLeft = tabOffsetLeft - containerWidth / 2 + tabWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [pathname]);

  return (
    <nav className="ft-bottom-nav">
      <div className="ft-bottom-nav-inner" ref={scrollContainerRef}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              ref={active ? activeLinkRef : null}
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
