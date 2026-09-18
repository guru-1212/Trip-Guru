'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Dumbbell, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

/**
 * Top bar for the FitTrack shell: brand, theme toggle and the account avatar.
 * Navigation lives in WorkoutSidebar (desktop) and WorkoutBottomNav (mobile).
 */
export function FitTrackNavbar() {
  const { user } = useAuth();
  const { profile, updateProfile } = useWorkoutStore();
  const [dark, setDark] = useState(false);

  // The context applies `profile.prefs.theme` to <html>; mirror the result so
  // the icon is right for the "system" preference too.
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, [profile.prefs.theme]);

  const toggleTheme = () => {
    updateProfile({ prefs: { theme: dark ? 'light' : 'dark' } }, { silent: true });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between gap-2 px-3 sm:px-4 lg:px-8">
        <Link
          href="/fittrack/dashboard"
          className="flex items-center gap-2 font-black text-lg sm:text-xl text-primary shrink-0"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-transform active:scale-95">
            <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="tracking-tighter">FitTrack</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-xl h-9 w-9"
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {dark ? (
              <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            ) : (
              <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700" />
            )}
          </Button>

          <Link href="/fittrack/profile" className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 border-l border-border/50">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold leading-none">{user?.name?.split(' ')[0] || 'User'}</span>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                Gym
              </span>
            </div>
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-primary/10 transition-transform active:scale-90 shadow-sm">
              <AvatarImage src={user?.photoURL} alt={user?.name} />
              <AvatarFallback className="bg-primary/5 text-primary text-[10px] sm:text-xs font-black">
                {user?.name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}
