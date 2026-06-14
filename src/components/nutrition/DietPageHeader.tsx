'use client';

import { ChevronLeft, ChevronRight, Database, Plus, Sparkles, Utensils, Settings2, Calendar, Save, Share } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDateLabel } from '@/lib/nutrition/nutritionUtils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { linkGoogleWithCalendarScope } from '@/firebase/auth';
import { createCalendarEvent, updateCalendarEvent, generateDailyRRule } from '@/services/googleCalendarService';
import { saveNutritionSettings } from '@/firebase/nutrition.firestore';
import toast from 'react-hot-toast';

interface DietPageHeaderProps {
  dateKey: string;
  timezone: string;
  isToday: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onLogMeal: () => void;
  onAIImport?: () => void;
  onShare?: () => void;
  className?: string;
  settings?: any;
}

export function DietPageHeader({
  dateKey,
  timezone,
  isToday,
  onPrevDay,
  onNextDay,
  onLogMeal,
  onAIImport,
  onShare,
  className,
  settings,
}: DietPageHeaderProps) {
  const { uid, user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [syncToCalendar, setSyncToCalendar] = useState(!!settings?.googleCalendarEventId);
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      let calendarEventId = settings?.googleCalendarEventId;

      if (syncToCalendar) {
        let accessToken = user?.googleAccessToken;
        if (!user?.googleCalendarLinked || !accessToken) {
          const result = await linkGoogleWithCalendarScope();
          accessToken = result.accessToken;
        }

        if (accessToken) {
          const startDate = new Date();
          startDate.setHours(9, 0, 0, 0); // Default 9 AM reminder
          const endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + 30);

          const eventDetails = {
            summary: 'Diet: Log your meals',
            description: 'Daily reminder to log your food and track macros in Trip-Guru.',
            start: {
              dateTime: startDate.toISOString(),
              timeZone: timezone,
            },
            end: {
              dateTime: endDate.toISOString(),
              timeZone: timezone,
            },
            recurrence: [generateDailyRRule()],
          };

          const calendarId = user?.googleCalendarId || 'primary';
          if (calendarEventId) {
            await updateCalendarEvent(accessToken, calendarId, calendarEventId, eventDetails);
          } else {
            calendarEventId = await createCalendarEvent(accessToken, eventDetails, calendarId);
          }
        }
      }

      await saveNutritionSettings(uid, {
        googleCalendarEventId: syncToCalendar ? calendarEventId : null as any,
      });
      toast.success('Diet settings updated');
      setIsSettingsOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-2">
        <Utensils className="h-6 w-6 text-primary shrink-0" aria-hidden="true" />
        <div>
          <h1 className="ft-title-lg">Diet Tracker</h1>
          <div className="flex items-center gap-1 mt-0.5">
            <button
              type="button"
              onClick={onPrevDay}
              className="p-1 rounded-lg hover:bg-muted"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground min-w-[140px] text-center font-medium">
              {formatDateLabel(dateKey, timezone)}
            </span>
            <button
              type="button"
              onClick={onNextDay}
              disabled={isToday}
              className="p-1 rounded-lg hover:bg-muted disabled:opacity-30"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="flex gap-2 w-full sm:w-auto shrink-0">
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="ft-btn ft-btn--secondary flex items-center justify-center p-2"
              title="Diet Settings"
            >
              <Settings2 className="h-5 w-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Diet Reminder Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <Label htmlFor="sync-diet-calendar" className="text-sm font-semibold">Sync to Google Calendar</Label>
                    <p className="text-xs text-muted-foreground">Get a daily reminder to log your meals</p>
                  </div>
                </div>
                <Switch
                  id="sync-diet-calendar"
                  checked={syncToCalendar}
                  onCheckedChange={setSyncToCalendar}
                  disabled={saving}
                />
              </div>
              <Button onClick={handleSaveSettings} disabled={saving} className="w-full gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Link
          href="/fittrack/food-database"
          className="ft-btn ft-btn--secondary flex items-center justify-center gap-2 w-auto sm:flex-none"
          title="Food Database"
        >
          <Database className="h-4 w-4" />
          <span className="hidden sm:inline">Database</span>
        </Link>
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="ft-btn ft-btn--secondary flex items-center justify-center gap-2 w-auto sm:flex-none"
            title="Share Diet Log"
          >
            <Share className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}
        {onAIImport && (
          <button
            type="button"
            onClick={onAIImport}
            className="ft-btn ft-btn--secondary flex items-center justify-center gap-2 w-auto sm:flex-none border-primary/20"
            title="AI Import Diet"
            aria-label="AI Import Diet"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">AI Import</span>
          </button>
        )}
        <button
          type="button"
          onClick={onLogMeal}
          className="ft-btn ft-btn--primary flex items-center justify-center gap-2 flex-1 sm:flex-none shadow-lg shadow-primary/10"
        >
          <Plus className="h-4 w-4" />
          <span>Log meal</span>
        </button>
      </div>
    </header>
  );
}
