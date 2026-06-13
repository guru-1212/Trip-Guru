'use client';

import { useState } from 'react';
import { Plus, Trash2, RotateCcw, Save, X, Calendar } from 'lucide-react';
import type { WaterScheduleSlot } from '@/types/water';
import { getDefaultSchedule } from '@/lib/water/waterUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { linkGoogleWithCalendarScope } from '@/firebase/auth';
import { createCalendarEvent, updateCalendarEvent, generateDailyRRule } from '@/services/googleCalendarService';

interface WaterScheduleEditorProps {
  currentSchedule: WaterScheduleSlot[];
  onSave: (schedule: WaterScheduleSlot[]) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function WaterScheduleEditor({
  currentSchedule,
  onSave,
  onCancel,
  isSaving,
}: WaterScheduleEditorProps) {
  const { user } = useAuth();
  const [slots, setSlots] = useState<WaterScheduleSlot[]>(
    currentSchedule.length > 0 ? [...currentSchedule] : getDefaultSchedule()
  );
  const [syncToCalendar, setSyncToCalendar] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const addSlot = () => {
    const lastTime = slots.length > 0 ? slots[slots.length - 1].time : '08:00';
    const [h, m] = lastTime.split(':').map(Number);
    const newMinutes = (h * 60 + m + 60) % (24 * 60);
    const newTime = `${Math.floor(newMinutes / 60)
      .toString()
      .padStart(2, '0')}:${(newMinutes % 60).toString().padStart(2, '0')}`;

    setSlots([
      ...slots,
      {
        time: newTime,
        amountGym: 300,
        amountRest: 250,
        label: 'New reminder',
        note: '',
      },
    ]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, updates: Partial<WaterScheduleSlot>) => {
    setSlots(slots.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const handleSave = async () => {
    setSyncing(true);
    try {
      const updatedSlots = [...slots];
      
      if (syncToCalendar) {
        let accessToken = user?.googleAccessToken;
        if (!user?.googleCalendarLinked || !accessToken) {
          const result = await linkGoogleWithCalendarScope();
          accessToken = result.accessToken;
        }

        if (accessToken) {
          for (let i = 0; i < updatedSlots.length; i++) {
            const slot = updatedSlots[i];
            const [hours, minutes] = slot.time.split(':').map(Number);
            
            const startDate = new Date();
            startDate.setHours(hours, minutes, 0, 0);
            
            const endDate = new Date(startDate);
            endDate.setMinutes(endDate.getMinutes() + 15);

            const eventDetails = {
              summary: `Water: ${slot.label}`,
              description: `Reminder to drink water. Goal: ${slot.amountGym}ml (Gym) / ${slot.amountRest}ml (Rest). ${slot.note ? `\nNote: ${slot.note}` : ''}`,
              start: {
                dateTime: startDate.toISOString(),
                timeZone: 'Asia/Kolkata',
              },
              end: {
                dateTime: endDate.toISOString(),
                timeZone: 'Asia/Kolkata',
              },
              recurrence: [generateDailyRRule()],
            };

            try {
              const calendarId = user?.googleCalendarId || 'primary';
              if (slot.googleCalendarEventId) {
                await updateCalendarEvent(accessToken, calendarId, slot.googleCalendarEventId, eventDetails);
              } else {
                const eventId = await createCalendarEvent(accessToken, eventDetails, calendarId);
                updatedSlots[i] = { ...slot, googleCalendarEventId: eventId };
              }
            } catch (err) {
              console.error(`Failed to sync slot ${slot.label} to calendar:`, err);
            }
          }
        }
      }

      const sorted = updatedSlots.sort((a, b) => a.time.localeCompare(b.time));
      await onSave(sorted);
    } finally {
      setSyncing(false);
    }
  };

  const restoreDefaults = () => {
    if (confirm('Are you sure you want to restore the default schedule?')) {
      setSlots(getDefaultSchedule());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Custom Hydration Schedule</h3>
          <p className="text-sm text-muted-foreground">
            Set your preferred times and amounts in 24h format (India/Kolkata timezone).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={restoreDefaults}
          disabled={isSaving || syncing}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Defaults
        </Button>
      </div>

      <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-[hsl(var(--water))]" />
          <div>
            <Label htmlFor="sync-water-calendar" className="text-sm font-semibold">Sync to Google Calendar</Label>
            <p className="text-xs text-muted-foreground">Create daily recurring reminders in your calendar</p>
          </div>
        </div>
        <Switch
          id="sync-water-calendar"
          checked={syncToCalendar}
          onCheckedChange={setSyncToCalendar}
          disabled={isSaving || syncing}
        />
      </div>

      <div className="grid gap-4 max-h-[50vh] overflow-y-auto pr-2 pb-4">
        {slots.map((slot, index) => (
          <Card key={index} className="p-4 relative group">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeSlot(index)}
              disabled={isSaving || syncing}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Time (24h)</Label>
                <Input
                  type="time"
                  value={slot.time}
                  onChange={(e) => updateSlot(index, { time: e.target.value })}
                  disabled={isSaving || syncing}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Label</Label>
                <Input
                  type="text"
                  value={slot.label}
                  placeholder="e.g. Morning kickstart"
                  onChange={(e) => updateSlot(index, { label: e.target.value })}
                  disabled={isSaving || syncing}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Note (Optional)</Label>
                <Input
                  type="text"
                  value={slot.note}
                  placeholder="e.g. Rehydrate after sleep"
                  onChange={(e) => updateSlot(index, { note: e.target.value })}
                  disabled={isSaving || syncing}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Gym Day Amount (ml)</Label>
                <Input
                  type="number"
                  value={slot.amountGym}
                  onChange={(e) => updateSlot(index, { amountGym: parseInt(e.target.value) || 0 })}
                  disabled={isSaving || syncing}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Rest Day Amount (ml)</Label>
                <Input
                  type="number"
                  value={slot.amountRest}
                  onChange={(e) => updateSlot(index, { amountRest: parseInt(e.target.value) || 0 })}
                  disabled={isSaving || syncing}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={addSlot}
          disabled={isSaving || syncing}
        >
          <Plus className="h-4 w-4" />
          Add Reminder
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={isSaving || syncing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || syncing} className="gap-2 bg-[hsl(var(--water))] hover:bg-[hsl(var(--water))]/90 text-white">
            <Save className="h-4 w-4" />
            {isSaving || syncing ? 'Saving...' : 'Save Schedule'}
          </Button>
        </div>
      </div>
    </div>
  );
}
