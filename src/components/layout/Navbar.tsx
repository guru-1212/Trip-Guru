'use client';

import Link from 'next/link';
import { Plane, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function Navbar() {
  const { user } = useAuth();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setDark((d) => !d);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary">
          <Plane className="h-6 w-6" />
          <span className="hidden sm:inline">TripMate</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Link href="/profile">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src={user?.photoURL} alt={user?.name} />
              <AvatarFallback>
                {user?.name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}
