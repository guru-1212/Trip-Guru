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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/fittrack/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/fittrack/workout', label: 'Workout', icon: Dumbbell },
  { href: '/fittrack/exercises', label: 'Exercises', icon: BookOpen },
  { href: '/fittrack/progress', label: 'Progress', icon: TrendingUp },
  { href: '/fittrack/checklist', label: 'Checklist', icon: CheckSquare },
  { href: '/fittrack/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/fittrack/profile', label: 'Profile', icon: User },
];

export function WorkoutSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-80 flex-col border-r border-border/40 min-h-screen bg-background fixed left-0 top-0 z-40">
      <div className="flex flex-col h-full py-6 px-4 gap-6">
        <div className="px-3 mb-2">
          <h1 className="wk-heading text-2xl font-black text-primary tracking-tighter">FitTrack</h1>
          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mt-1">Professional Tracker</p>
        </div>

        <nav className="space-y-1">
          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest px-3 mb-4">Training</p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-200 group',
                  active
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", active ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-5 bg-indigo-50 dark:bg-indigo-500/5 rounded-3xl border border-indigo-100 dark:border-indigo-500/10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Dumbbell className="h-5 w-5" />
             </div>
             <div>
               <p className="text-xs font-black text-primary tracking-tight leading-none mb-1">Athlete Pro</p>
               <p className="text-[10px] text-muted-foreground font-bold">Session active</p>
             </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
