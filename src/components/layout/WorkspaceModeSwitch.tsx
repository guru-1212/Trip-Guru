'use client';

import { Plane, Home, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppMode } from '@/hooks/useAppMode';
import { AppMode } from '@/lib/appMode';
import { useRouter } from 'next/navigation';

export function WorkspaceModeSwitch({ className }: { className?: string }) {
  const { mode, canSwitch, switchMode } = useAppMode();
  const router = useRouter();

  if (!canSwitch) return null;

  const options: { id: AppMode; label: string; icon: typeof Plane }[] = [
    { id: 'trip', label: 'Trips', icon: Plane },
    { id: 'room', label: 'Rooms', icon: Home },
    { id: 'gym', label: 'GYM', icon: Dumbbell },
  ];

  const handleSwitch = (id: AppMode) => {
    switchMode(id);
    if (id === 'gym') {
      router.push('/fittrack/dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div
      className={cn(
        'flex p-1 rounded-xl bg-muted/80 border border-border/50 shadow-inner',
        className
      )}
      role="tablist"
      aria-label="Switch between workspaces"
    >
      {options.map(({ id, label, icon: Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => handleSwitch(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all duration-300 active:scale-95',
              active
                ? 'bg-primary text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
