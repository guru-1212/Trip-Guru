'use client';

import { Plane, Home, Dumbbell, Flower2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppMode } from '@/hooks/useAppMode';
import { AppMode, resolveEnabledWorkspaces } from '@/lib/appMode';
import { useAppSelector } from '@/store';
import { useRouter } from 'next/navigation';

export function WorkspaceModeSwitch({ className }: { className?: string }) {
  const { mode, canSwitch, switchMode } = useAppMode();
  const user = useAppSelector((s) => s.auth.user);
  const router = useRouter();

  const enabled = resolveEnabledWorkspaces(user?.enabledWorkspaces);
  const allOptions: { id: AppMode; label: string; icon: typeof Plane }[] = [
    { id: 'trip', label: 'Trips', icon: Plane },
    { id: 'room', label: 'Rooms', icon: Home },
    { id: 'gym', label: 'GYM', icon: Dumbbell },
    { id: 'yoga', label: 'YOGA', icon: Flower2 },
  ];
  const options = allOptions.filter((o) => enabled.includes(o.id));

  // Nothing to switch between when a user has hidden all but one workspace.
  if (!canSwitch || options.length <= 1) return null;

  const handleSwitch = (id: AppMode) => {
    switchMode(id);
    if (id === 'gym') {
      router.push('/fittrack/dashboard');
    } else if (id === 'yoga') {
      router.push('/yoga/dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div
      className={cn(
        'flex p-0.5 sm:p-1 rounded-lg sm:rounded-xl bg-muted/80 border border-border/50 shadow-inner max-w-full',
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
            aria-label={label}
            title={label}
            onClick={() => handleSwitch(id)}
            className={cn(
              'flex items-center justify-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-all duration-200 active:scale-95 min-w-0 flex-1 sm:flex-none',
              active
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden lg:inline truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
