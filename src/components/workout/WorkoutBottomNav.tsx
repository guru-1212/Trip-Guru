'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Dumbbell,
  BookOpen,
  TrendingUp,
  CheckSquare,
  BarChart3,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/fittrack/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/fittrack/workout', label: 'Workout', icon: Dumbbell },
  { href: '/fittrack/exercises', label: 'Library', icon: BookOpen },
  { href: '/fittrack/progress', label: 'Progress', icon: TrendingUp },
  { href: '/fittrack/checklist', label: 'Tasks', icon: CheckSquare },
  { href: '/fittrack/analytics', label: 'Stats', icon: BarChart3 },
  { href: '/fittrack/profile', label: 'Profile', icon: User },
];

export function WorkoutBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-50">
      <div className="glass shadow-2xl rounded-[32px] px-3 py-3 border border-white/20 dark:border-white/10 overflow-hidden">
        <div className="flex justify-around items-center">
          {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300 min-w-[56px]',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-primary/70'
                )}
              >
                {active && (
                   <motion.div
                     layoutId="active-pill"
                     className="absolute inset-0 bg-primary/10 rounded-2xl"
                     transition={{ type: 'spring', duration: 0.6 }}
                   />
                )}
                <Icon className={cn("h-5 w-5 relative z-10", active ? "stroke-[2.5px]" : "stroke-2")} />
                <span className={cn("text-[9px] font-black uppercase tracking-tighter relative z-10", active ? "opacity-100" : "opacity-60")}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
