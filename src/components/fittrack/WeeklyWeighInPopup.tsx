'use client';

import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Scale } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import {
  displayWeight,
  formatWeight,
  inputToKg,
  getWeekStart,
  getTrackingWeekStart,
  getTrackingWeekEnd,
} from '@/workout/utils';

/** Session flag so the Saturday weigh-in prompt fires at most once per fresh open. */
const SESSION_KEY = 'ft_weekly_weighin_shown';

/**
 * Saturday-only weigh-in reminder, scoped to the FitTrack (workout) section.
 * Shows once per browser session on Saturdays, unless a weigh-in already exists
 * for the current tracking week. Reuses the store's `addBodyStat` to persist.
 */
export function WeeklyWeighInPopup() {
  const { bodyStats, profile, addBodyStat, hydrated } = useWorkoutStore();
  const [open, setOpen] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const evaluatedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || evaluatedRef.current) return;
    if (typeof window === 'undefined') return;
    evaluatedRef.current = true;

    // Only on Saturdays (dayjs: Sun=0 ... Sat=6).
    if (dayjs().day() !== 6) return;

    // Once per browser session ("fresh open").
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Skip if the user already logged weight for this tracking week.
    const weekStart = getTrackingWeekStart();
    const weekEnd = getTrackingWeekEnd();
    const loggedThisWeek = bodyStats.some((s) => {
      const d = dayjs(s.date);
      return (
        (d.isSame(weekStart) || d.isAfter(weekStart)) &&
        (d.isSame(weekEnd) || d.isBefore(weekEnd))
      );
    });
    if (loggedThisWeek) return;

    sessionStorage.setItem(SESSION_KEY, '1');
    setOpen(true);
  }, [hydrated, bodyStats]);

  const unit = profile.prefs.unit;
  const lastStat = bodyStats[0];

  const handleSave = () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 0) return;
    // Key on the week start (Monday) so there's one weigh-in per week.
    // addBodyStat persists to Firestore and shows its own success toast.
    addBodyStat({ date: getWeekStart(), weight: inputToKg(val, unit) });
    setWeightInput('');
    setOpen(false);
  };

  const isValid = weightInput !== '' && parseFloat(weightInput) > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Scale className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Weekly weigh-in</DialogTitle>
          <DialogDescription className="text-center">
            It&apos;s Saturday — log your weight to keep your progress on track.
            {lastStat && (
              <>
                {' '}Last recorded:{' '}
                <span className="font-semibold text-foreground">
                  {formatWeight(lastStat.weight, unit)}
                </span>
                .
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder={
              lastStat ? String(displayWeight(lastStat.weight, unit)) : `Weight`
            }
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-lg font-bold outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            {unit}
          </span>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Later
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Save weight
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
