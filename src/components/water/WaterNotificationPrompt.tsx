'use client';

import Link from 'next/link';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWaterNotifications } from '@/hooks/useWaterNotifications';
import { cn } from '@/lib/utils';

interface WaterNotificationPromptProps {
  className?: string;
}

export function WaterNotificationPrompt({ className }: WaterNotificationPromptProps) {
  const {
    enabled,
    waterNotificationsEnabled,
    permission,
    loading,
    isBlocked,
    isGranted,
    promptEnable,
    startPermissionOnPointerDown,
    disableNotifications,
  } = useWaterNotifications();

  if (enabled) {
    return (
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[hsl(var(--pace-ahead)/0.3)] bg-[hsl(var(--pace-ahead)/0.08)] px-4 py-3',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[hsl(var(--pace-ahead))]" aria-hidden="true" />
          <span className="text-sm font-medium">Hydration reminders are on</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void disableNotifications()}
          aria-label="Turn off hydration reminders"
        >
          Turn off
        </Button>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 rounded-xl border border-[hsl(var(--pace-behind)/0.3)] bg-[hsl(var(--pace-behind)/0.08)] px-4 py-3',
          className
        )}
        role="alert"
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 shrink-0 text-[hsl(var(--pace-behind))]" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium">Notifications blocked</p>
            <p className="text-muted-foreground mt-1">
              Enable notifications in your browser settings, or use the{' '}
              <Link href="/profile" className="underline text-primary font-medium">
                App Profile
              </Link>{' '}
              page to set them up.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onPointerDown={startPermissionOnPointerDown}
          onClick={() => void promptEnable()}
          disabled={loading}
          aria-label="Retry notification permission"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/50 bg-card px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <BellOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-medium">Get hydration reminders</p>
          <p className="text-muted-foreground">
            {isGranted && !waterNotificationsEnabled
              ? 'Tap to schedule your daily water reminders'
              : '11 daily reminders + pace alerts'}
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={loading}
        onPointerDown={startPermissionOnPointerDown}
        onClick={() => void promptEnable()}
        aria-label="Enable hydration reminders"
        className="bg-[hsl(var(--water))] hover:bg-[hsl(var(--water)/0.9)] text-white shrink-0"
      >
        Enable reminders
      </Button>
    </div>
  );
}
