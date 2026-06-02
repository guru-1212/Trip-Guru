'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Users,
  HandCoins,
  Camera,
  BarChart2,
  Map,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const tabs = [
  { label: 'Overview', segment: '', icon: LayoutDashboard },
  { label: 'Plan', segment: '/plan', icon: Map },
  { label: 'Packing', segment: '/packing', icon: ClipboardList },
  { label: 'Expenses', segment: '/expenses', icon: Wallet },
  { label: 'Members', segment: '/members', icon: Users },
  { label: 'Settlement', segment: '/settlement', icon: HandCoins },
  { label: 'Memories', segment: '/memories', icon: Camera },
  { label: 'Analytics', segment: '/analytics', icon: BarChart2 },
];

export function TripNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;

  return (
    <nav className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-muted/30 border border-border/40 mb-8">
      {tabs.map(({ label, segment, icon: Icon }) => {
        const href = `${base}${segment}`;
        const active =
          segment === ''
            ? pathname === base
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 flex-1 min-w-[120px] sm:flex-none',
              active
                ? 'text-primary bg-background shadow-sm ring-1 ring-border/10'
                : 'text-muted-foreground hover:text-primary hover:bg-background/50'
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", active ? "stroke-[2.5px]" : "stroke-[2px]")} />
            <span className="text-[10px] font-black uppercase tracking-widest truncate">{label}</span>
            {active && (
              <motion.div 
                layoutId="activeTab"
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
