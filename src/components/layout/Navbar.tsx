'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun, User, Menu, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { WorkspaceModeSwitch } from './WorkspaceModeSwitch';

export function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const inFitTrack = pathname.startsWith('/fittrack');
  const inYoga = pathname.startsWith('/yoga');
  const profileHref = (inFitTrack || inYoga) ? `/${inFitTrack ? 'fittrack' : 'yoga'}/profile` : '/profile';

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setDark((d) => !d);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between gap-2 px-2 sm:px-4 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 font-black text-lg sm:text-xl text-primary shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-white text-sm sm:text-lg shadow-lg shadow-primary/20 transition-transform active:scale-95">T</div>
          <span className="hidden md:inline tracking-tighter">TripMate</span>
        </Link>

        <WorkspaceModeSwitch className="flex-1 min-w-0 mx-1 sm:mx-2 max-w-[11rem] sm:max-w-none" />

        <div className="flex items-center gap-1 sm:gap-2 md:gap-6 shrink-0">
          <div className="hidden md:flex relative items-center group">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search adventures..." 
              className="pl-10 pr-4 py-2 w-64 bg-muted/50 border border-transparent rounded-xl text-sm focus:outline-none focus:bg-background focus:border-primary transition-all placeholder:font-medium"
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl h-9 w-9">
              {dark ? <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700" />}
            </Button>
            
            <Link href={profileHref}>
              <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 border-l border-border/50">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold leading-none">{user?.name?.split(' ')[0] || 'User'}</span>
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                    {inFitTrack ? 'Gym' : inYoga ? 'Yogi' : 'Explorer'}
                  </span>
                </div>
                <Avatar className="h-8 w-8 sm:h-9 sm:h-9 border-2 border-primary/10 transition-transform active:scale-90 shadow-sm">
                  <AvatarImage src={user?.photoURL} alt={user?.name} />
                  <AvatarFallback className="bg-primary/5 text-primary text-[10px] sm:text-xs font-black">
                    {user?.name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </div>
            </Link>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden rounded-xl h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-[280px] sm:w-72 border-l-0">
                <div className="p-6 border-b border-border/40 flex items-center justify-between">
                  <Link href="/dashboard" className="flex items-center gap-2 font-black text-xl text-primary" onClick={() => setOpen(false)}>
                    <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white text-base shadow-lg shadow-primary/20">T</div>
                    TripMate
                  </Link>
                </div>
                <Sidebar mobile onLinkClick={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
