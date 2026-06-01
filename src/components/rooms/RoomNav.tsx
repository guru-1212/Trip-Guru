'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Receipt, 
  HandCoins, 
  CreditCard, 
  Users, 
  History,
  Package,
} from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { href: '', label: 'Overview', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/bring', label: 'To bring', icon: Package },
  { href: '/settlement', label: 'Settlement', icon: HandCoins },
  { href: '/rent', label: 'Rent', icon: CreditCard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/history', label: 'History', icon: History },
];

export function RoomNav({ roomId }: { roomId: string }) {
  const pathname = usePathname();
  const base = `/rooms/${roomId}`;

  return (
    <nav className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-2 p-1.5 rounded-2xl bg-muted/30 border border-border/40">
      {tabs.map(({ href, label, icon: Icon }) => {
        const fullHref = `${base}${href}`;
        const active =
          href === ''
            ? pathname === base
            : pathname.startsWith(fullHref);
        
        return (
          <Link
            key={fullHref}
            href={fullHref}
            className={cn(
              'relative flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 flex-1 min-w-[100px] text-center sm:text-left',
              active
                ? 'text-primary bg-background shadow-sm ring-1 ring-border/10'
                : 'text-muted-foreground hover:text-primary hover:bg-background/50'
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", active ? "stroke-[2.5px]" : "stroke-[2px]")} />
            <span className="text-[10px] font-black uppercase tracking-widest truncate">{label}</span>
            {active && (
              <motion.div 
                layoutId="activeRoomTab"
                className="absolute inset-0 bg-primary/5 rounded-xl z-[-1]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
