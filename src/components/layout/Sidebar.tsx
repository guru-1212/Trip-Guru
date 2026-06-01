'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  PlusCircle, 
  User, 
  Map, 
  Receipt, 
  Settings, 
  Globe,
  Users,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppMode } from '@/hooks/useAppMode';
import { WorkspaceModeSwitch } from './WorkspaceModeSwitch';

const tripLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/trips/new', label: 'New Trip', icon: PlusCircle },
  { href: '/profile', label: 'Profile', icon: User },
];

const roomLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/rooms/new', label: 'New Room', icon: Home },
  { href: '/profile', label: 'Profile', icon: User },
];

const secondaryLinks = [
  { href: '#', label: 'Explore', icon: Globe },
  { href: '#', label: 'Expenses', icon: Receipt },
  { href: '#', label: 'Community', icon: Users },
  { href: '#', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  mobile?: boolean;
  onLinkClick?: () => void;
}

export function Sidebar({ mobile, onLinkClick }: SidebarProps) {
  const pathname = usePathname();
  const { isTripMode, isRoomMode } = useAppMode();
  const links = isRoomMode ? roomLinks : tripLinks;

  const content = (
    <div className="flex flex-col h-full py-4 px-4 gap-6">
      <WorkspaceModeSwitch className="w-full justify-center sm:hidden" />

      <div className="space-y-1">
        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest px-3 mb-4">
          {isRoomMode ? 'Home' : 'Main Menu'}
        </p>
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={onLinkClick}
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
      </div>

      {isTripMode && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest px-3 mb-4">Travel OS</p>
          {secondaryLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              onClick={onLinkClick}
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all duration-200 group"
            >
              <Icon className="h-5 w-5 transition-transform group-hover:scale-110 group-hover:text-primary" />
              {label}
              <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-black opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">Soon</span>
            </Link>
          ))}
        </div>
      )}

      {!mobile && isTripMode && (
        <div className="mt-auto p-5 bg-indigo-50 dark:bg-indigo-500/5 rounded-3xl border border-indigo-100 dark:border-indigo-500/10">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Map className="h-5 w-5" />
             </div>
             <div>
               <p className="text-xs font-black text-primary tracking-tight leading-none mb-1">Traveler Plus</p>
               <p className="text-[10px] text-muted-foreground font-bold">Pro account active</p>
             </div>
          </div>
          <Button variant="outline" size="sm" className="w-full text-[10px] font-black uppercase tracking-widest h-9 rounded-xl border-primary/20 hover:bg-primary hover:text-white transition-all">Upgrade Plan</Button>
        </div>
      )}

      {!mobile && isRoomMode && (
        <div className="mt-auto p-5 bg-emerald-50 dark:bg-emerald-500/5 rounded-3xl border border-emerald-100 dark:border-emerald-500/10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Home className="h-5 w-5" />
             </div>
             <div>
               <p className="text-xs font-black text-primary tracking-tight leading-none mb-1">Shared home</p>
               <p className="text-[10px] text-muted-foreground font-bold">Track rent &amp; expenses</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );

  if (mobile) return content;

  return (
    <aside className="hidden lg:flex w-80 flex-col border-r border-border/40 min-h-[calc(100vh-4rem)] bg-background">
      {content}
    </aside>
  );
}
