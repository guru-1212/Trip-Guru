'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, User, Home, Dumbbell, Flower2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppMode } from '@/hooks/useAppMode';

export function BottomNav() {
  const pathname = usePathname();
  const { isRoomMode, isYogaMode } = useAppMode();

  const links = isYogaMode
    ? [
        { href: '/yoga/dashboard', label: 'Home', icon: LayoutDashboard },
        { href: '/yoga/flows', label: 'Zen', icon: Flower2 },
        { href: '/yoga/progress', label: 'Body', icon: PlusCircle }, // Reusing PlusCircle as a placeholder for "Track Progress" or similar
        { href: '/profile', label: 'Me', icon: User },
      ]
    : isRoomMode
    ? [
        { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
        { href: '/rooms/new', label: 'Room', icon: Home },
        { href: '/fittrack/dashboard', label: 'Gym', icon: Dumbbell },
        { href: '/profile', label: 'Me', icon: User },
      ]
    : [
        { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
        { href: '/trips/new', label: 'Trip', icon: PlusCircle },
        { href: '/fittrack/dashboard', label: 'Gym', icon: Dumbbell },
        { href: '/profile', label: 'Me', icon: User },
      ];

  return (
    <nav className="lg:hidden fixed bottom-6 left-6 right-6 z-40 border border-border/40 bg-background/80 backdrop-blur-xl rounded-[24px] shadow-2xl overflow-hidden">
      <div className="flex justify-around items-center h-16">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300',
                active ? 'text-primary scale-110' : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all",
                active ? "bg-primary/10 shadow-sm" : ""
              )}>
                <Icon className={cn("h-5 w-5", active ? "stroke-[3px]" : "stroke-[2px]")} />
              </div>
              <span className={cn("text-[10px] font-black uppercase tracking-tighter transition-all", active ? "opacity-100" : "opacity-0 h-0 overflow-hidden")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
