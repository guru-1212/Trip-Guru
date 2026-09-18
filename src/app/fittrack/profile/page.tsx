'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { Pencil, Upload, Download, Trash2, AlertTriangle, Bell, BellOff, Moon } from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { useAuth } from '@/hooks/useAuth';
import { DAY_KEYS, SPLIT_DEFINITIONS, SPLIT_ICONS, WEEK_SCHEDULE_PRESETS } from '@/workout/constants';
import { cn } from '@/lib/utils';
import { getFavouriteSplit, getFavouriteExercise } from '@/workout/analytics';
import {
  formatWeight,
  formatDuration,
  countScheduledWorkoutDays,
  getBrowserTimezone,
  getScheduledSplitsForDay,
  weekSchedulesEqual,
} from '@/workout/utils';
import type { DayKey, FitnessGoal, SplitId, ThemePref, WeekSchedule, WeekScheduleValue } from '@/workout/types';
import { TrainingPartnersSection } from '@/components/workout/TrainingPartnersSection';
import { AccountSettingsCard } from '@/components/profile/AccountSettingsCard';
import { PushNotificationsCard } from '@/components/profile/PushNotificationsCard';
import { GoogleCalendarCard } from '@/components/profile/GoogleCalendarCard';
import { ImageCropper } from '@/components/profile/ImageCropper';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { uploadProfilePhoto } from '@/firebase/storage';
import { updateUser } from '@/firebase/users.firestore';
import { updateProfileLocal } from '@/features/auth/authSlice';
import { useAppDispatch } from '@/store';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const {
    profile,
    workouts,
    hydrated,
    updateProfile,
    updateWeeklyGoals,
    exportData,
    importData,
    clearHistory,
    clearAllPRs,
  } = useWorkoutStore();
  const { user, uid } = useAuth();
  const dispatch = useAppDispatch();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);
  const [confirmClear, setConfirmClear] = useState<'history' | 'prs' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  // The account photo (users.photoURL) is the one avatar shown app-wide; legacy
  // FitTrack profiles may still carry a base64 `avatar`, used as a fallback.
  const avatarSrc = user?.photoURL || form.avatar;

  const pushEnabled =
    user?.notifyEnabled !== false &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted';

  useEffect(() => {
    if (!editing) setForm(profile);
  }, [profile, editing]);

  const totalVolume = workouts.reduce((s, w) => s + w.totalVolume, 0);
  const totalTime = workouts.reduce((s, w) => s + w.duration, 0);
  const memberSince = workouts.length
    ? workouts.sort((a, b) => a.date.localeCompare(b.date))[0].date
    : dayjs().format('YYYY-MM-DD');

  const saveProfile = () => {
    const next = {
      ...form,
      timezone: getBrowserTimezone(),
      gymTime: form.gymRemindersEnabled && !form.gymTime ? '18:00' : form.gymTime,
    };
    setForm(next);
    updateProfile(next);
    updateWeeklyGoals({ workoutsPerWeek: countScheduledWorkoutDays(next) });
    setEditing(false);
  };

  /** Apply a preset program. While editing it only updates the form; otherwise it saves immediately. */
  const applySchedulePreset = (schedule: WeekSchedule) => {
    if (editing) {
      setForm({ ...form, weekSchedule: schedule });
      return;
    }
    const next = { ...profile, weekSchedule: schedule };
    updateProfile({ weekSchedule: schedule });
    updateWeeklyGoals({ workoutsPerWeek: countScheduledWorkoutDays(next) });
  };
  const scheduleSource = editing ? form : profile;

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = async (blob: Blob) => {
    if (!uid) return;
    setCropImage(null);
    setPhotoSaving(true);
    try {
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      const url = await uploadProfilePhoto(uid, file);
      await updateUser(uid, { photoURL: url });
      dispatch(updateProfileLocal({ photoURL: url }));
      toast.success('Photo updated');
    } catch (err) {
      console.error(err);
      toast.error('Could not upload photo');
    } finally {
      setPhotoSaving(false);
    }
  };

  if (!hydrated) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <PageTransition>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="ft-title text-2xl font-bold">Profile</h1>
          <button
            type="button"
            onClick={() => { if (editing) saveProfile(); else { setForm(profile); setEditing(true); } }}
            className="ft-btn ft-btn--secondary flex items-center gap-2 text-sm"
          >
            <Pencil className="h-4 w-4" />
            {editing ? 'Save' : 'Edit'}
          </button>
        </div>

        {/* Personal Info */}
        <section className="ft-card ft-card-padded">
          <h2 className="ft-title font-semibold mb-4">Personal Info</h2>
          <div className="flex flex-wrap items-start gap-6">
            <div className="relative">
              <div className={cn('w-20 h-20 rounded-full overflow-hidden bg-muted/30 border-2 border-border', photoSaving && 'opacity-60')}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center cursor-pointer" aria-label="Change photo">
                <Upload className="h-3.5 w-3.5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} disabled={photoSaving} />
              </label>
            </div>
            <Dialog open={!!cropImage} onOpenChange={(open) => !open && setCropImage(null)}>
              <DialogContent className="max-w-md p-0 overflow-hidden rounded-[32px] border-0 shadow-2xl">
                <DialogHeader className="p-6 pb-0">
                  <DialogTitle className="text-xl font-black text-center">Crop Profile Photo</DialogTitle>
                </DialogHeader>
                {cropImage && (
                  <ImageCropper imageSrc={cropImage} onCrop={handleCropComplete} onCancel={() => setCropImage(null)} />
                )}
              </DialogContent>
            </Dialog>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-[240px]">
              <Field label="Name" value={form.name} editing={editing} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Age" value={String(form.age)} editing={editing} type="number" onChange={(v) => setForm({ ...form, age: parseInt(v, 10) || 0 })} />
              <Field label="Gender" value={form.gender} editing={editing} onChange={(v) => setForm({ ...form, gender: v })} />
              <Field label="Height (cm)" value={String(form.height)} editing={editing} type="number" onChange={(v) => setForm({ ...form, height: parseFloat(v) || 0 })} />
              <Field label="Weight (kg)" value={String(form.weight)} editing={editing} type="number" onChange={(v) => setForm({ ...form, weight: parseFloat(v) || 0 })} />
              <div>
                <label className="text-xs text-muted-foreground">Fitness Goal</label>
                {editing ? (
                  <select
                    className="ft-input mt-1"
                    value={form.goal}
                    onChange={(e) => setForm({ ...form, goal: e.target.value as FitnessGoal })}
                  >
                    {(['Build Muscle', 'Lose Fat', 'Strength', 'Endurance', 'General'] as FitnessGoal[]).map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 font-medium">{form.goal}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Weekly Split */}
        <section className="ft-card ft-card-padded">
          <h2 className="ft-title font-semibold mb-1">Weekly Split Schedule</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {editing
              ? `Tap to toggle splits — select more than one to train them as separate sessions that day (${countScheduledWorkoutDays(form)} sessions/week).`
              : `Training days here set your dashboard weekly goal (${countScheduledWorkoutDays(profile)} sessions/week).`}
          </p>

          {/* Programs: one-tap presets (Push/Pull/Legs etc.) */}
          <div className="mb-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Programs
              </span>
              {!editing && (
                <span className="text-[11px] text-muted-foreground">Tap to apply instantly</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {WEEK_SCHEDULE_PRESETS.map((preset) => {
                const active = weekSchedulesEqual(scheduleSource.weekSchedule, preset.schedule);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={active}
                    title={preset.description}
                    onClick={() => applySchedulePreset(preset.schedule)}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-background/60 text-foreground hover:border-primary/50'
                    )}
                  >
                    <span className="text-sm font-semibold">{preset.name}</span>
                    <span className="text-[11px] text-muted-foreground">{preset.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DAY_KEYS.map((day) => {
              const selectedSplits = getScheduledSplitsForDay(form, day);
              const isRest = selectedSplits.length === 0;

              const setDaySplits = (next: SplitId[]) => {
                const nextValue: WeekScheduleValue =
                  next.length === 0 ? 'rest' : next.length === 1 ? next[0] : next;
                setForm({
                  ...form,
                  weekSchedule: { ...form.weekSchedule, [day]: nextValue },
                });
              };

              return (
                <div
                  key={day}
                  className={cn(
                    'flex flex-col gap-2.5 p-3 rounded-lg border transition-colors',
                    isRest ? 'bg-muted/10 border-border/60' : 'bg-muted/30 border-border'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{day}</span>
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                        isRest ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                      )}
                    >
                      {isRest
                        ? 'Rest'
                        : selectedSplits.length === 1
                        ? '1 session'
                        : `${selectedSplits.length} sessions`}
                    </span>
                  </div>

                  {editing ? (
                    <div className="flex flex-wrap gap-1.5">
                      {SPLIT_DEFINITIONS.map((split) => {
                        const active = selectedSplits.includes(split.id);
                        return (
                          <button
                            key={split.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              setDaySplits(
                                active
                                  ? selectedSplits.filter((s) => s !== split.id)
                                  : [...selectedSplits, split.id]
                              )
                            }
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                              active
                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                : 'border-border bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                            )}
                          >
                            <span aria-hidden>{SPLIT_ICONS[split.icon]}</span>
                            {split.name}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        aria-pressed={isRest}
                        onClick={() => setDaySplits([])}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                          isRest
                            ? 'border-slate-500 bg-slate-500 text-white shadow-sm'
                            : 'border-border bg-background/60 text-muted-foreground hover:border-slate-400 hover:text-foreground'
                        )}
                      >
                        <Moon className="h-3 w-3" aria-hidden />
                        Rest
                      </button>
                    </div>
                  ) : isRest ? (
                    <span className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
                      <Moon className="h-3.5 w-3.5" aria-hidden />
                      Rest day
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSplits.map((splitId, idx) => {
                        const split = SPLIT_DEFINITIONS.find((s) => s.id === splitId);
                        return (
                          <span
                            key={splitId}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 text-xs font-semibold"
                          >
                            {selectedSplits.length > 1 && (
                              <span className="tabular-nums opacity-70">{idx + 1}.</span>
                            )}
                            <span aria-hidden>{split ? SPLIT_ICONS[split.icon] : ''}</span>
                            {split?.name ?? splitId}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Gym Reminders */}
        <section className="ft-card ft-card-padded">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="ft-title font-semibold">Gym Reminders</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            On training days only · 2h pre-workout meal · 1h get ready · protein 20 min after workout
          </p>

          {!pushEnabled && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <BellOff className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400">Push notifications are off</p>
                <p className="text-muted-foreground mt-1">
                  Enable them in{' '}
                  <Link href="#notifications" className="text-primary underline underline-offset-2">
                    Push Notifications
                  </Link>{' '}
                  below to receive gym reminders when the app is closed.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Enable gym reminders</label>
              {editing ? (
                <select
                  className="ft-input mt-1"
                  value={form.gymRemindersEnabled ? 'On' : 'Off'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      gymRemindersEnabled: e.target.value === 'On',
                      gymTime: e.target.value === 'On' && !form.gymTime ? '18:00' : form.gymTime,
                    })
                  }
                >
                  <option value="On">On</option>
                  <option value="Off">Off</option>
                </select>
              ) : (
                <p className="mt-1 font-medium">{form.gymRemindersEnabled ? 'On' : 'Off'}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Gym time</label>
              {editing ? (
                <input
                  className="ft-input mt-1"
                  type="time"
                  value={form.gymTime ?? '18:00'}
                  disabled={!form.gymRemindersEnabled}
                  onChange={(e) => setForm({ ...form, gymTime: e.target.value || null })}
                />
              ) : (
                <p className="mt-1 font-medium">
                  {form.gymRemindersEnabled && form.gymTime
                    ? dayjs(`2000-01-01T${form.gymTime}`).format('h:mm A')
                    : 'Not set'}
                </p>
              )}
            </div>
          </div>
          {(editing ? form : profile).gymRemindersEnabled && (editing ? form : profile).gymTime && (
            <p className="text-xs text-muted-foreground mt-3">
              Timezone: {(editing ? form : profile).timezone || getBrowserTimezone()}
            </p>
          )}
        </section>

        {/* Preferences */}
        <section className="ft-card ft-card-padded">
          <h2 className="ft-title font-semibold mb-4">App Preferences</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PrefSelect
              label="Default Rest Timer"
              value={String(form.prefs.restTimer)}
              options={['30', '60', '90', '120']}
              editing={editing}
              onChange={(v) => setForm({ ...form, prefs: { ...form.prefs, restTimer: parseInt(v, 10) } })}
              suffix="s"
            />
            <PrefSelect
              label="Weight Unit"
              value={form.prefs.unit}
              options={['kg', 'lbs']}
              editing={editing}
              onChange={(v) => setForm({ ...form, prefs: { ...form.prefs, unit: v as 'kg' | 'lbs' } })}
            />
            <PrefSelect
              label="Theme"
              value={form.prefs.theme}
              options={['dark', 'light', 'system']}
              editing={editing}
              onChange={(v) => setForm({ ...form, prefs: { ...form.prefs, theme: v as ThemePref } })}
            />
            <PrefSelect
              label="Default Sets per Exercise"
              value={String(form.prefs.defaultSets)}
              options={['1', '2', '3', '4', '5', '6']}
              editing={editing}
              onChange={(v) => setForm({ ...form, prefs: { ...form.prefs, defaultSets: parseInt(v, 10) } })}
            />
            <PrefSelect
              label="Rest Timer Sound"
              value={form.prefs.sound ? 'On' : 'Off'}
              options={['On', 'Off']}
              editing={editing}
              onChange={(v) => setForm({ ...form, prefs: { ...form.prefs, sound: v === 'On' } })}
            />
          </div>
        </section>

        <TrainingPartnersSection />

        {/* Account, notifications, integrations */}
        <PushNotificationsCard />
        <GoogleCalendarCard />
        <AccountSettingsCard />

        {/* Data Management */}
        <section className="ft-card ft-card-padded">
          <h2 className="ft-title font-semibold mb-4">Data Management</h2>
          <p className="text-sm text-muted-foreground mb-4">
            All FitTrack data syncs to Firebase in real time. Sign in on any device with the same account to access your workouts.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={exportData} className="ft-btn ft-btn--secondary flex items-center gap-2 text-sm">
              <Download className="h-4 w-4" /> Export JSON
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="ft-btn ft-btn--secondary flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4" /> Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => importData(reader.result as string);
                reader.readAsText(file);
              }}
            />
            <button type="button" onClick={() => setConfirmClear('history')} className="ft-btn ft-btn--secondary flex items-center gap-2 text-sm text-red-500">
              <Trash2 className="h-4 w-4" /> Clear History
            </button>
            <button type="button" onClick={() => setConfirmClear('prs')} className="ft-btn ft-btn--secondary flex items-center gap-2 text-sm text-red-500">
              <Trash2 className="h-4 w-4" /> Clear PRs
            </button>
          </div>
        </section>

        {/* App Stats */}
        <section className="ft-card ft-card-padded">
          <h2 className="ft-title font-semibold mb-4">App Stats</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Stat label="Total Workouts" value={String(workouts.length)} />
            <Stat label="Total Volume" value={formatWeight(totalVolume, profile.prefs.unit)} />
            <Stat label="Total Training Time" value={formatDuration(totalTime)} />
            <Stat label="Member Since" value={dayjs(memberSince).format('MMM D, YYYY')} />
            <Stat label="Favourite Split" value={getFavouriteSplit(workouts)} />
            <Stat label="Favourite Exercise" value={getFavouriteExercise(workouts)} />
          </div>
        </section>

        {confirmClear && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="ft-card ft-card-padded max-w-sm w-full space-y-4">
              <div className="flex items-center gap-3 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-semibold">Confirm Delete</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {confirmClear === 'history'
                  ? 'This will permanently delete all workout history. This cannot be undone.'
                  : 'This will permanently delete all personal records. This cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button type="button" className="ft-btn ft-btn--secondary flex-1" onClick={() => setConfirmClear(null)}>Cancel</button>
                <button
                  type="button"
                  className="ft-btn ft-btn--danger flex-1"
                  onClick={() => {
                    if (confirmClear === 'history') clearHistory();
                    else clearAllPRs();
                    setConfirmClear(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function Field({
  label,
  value,
  editing,
  type = 'text',
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  type?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      {editing ? (
        <input className="ft-input mt-1" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <p className="mt-1 font-medium">{value}</p>
      )}
    </div>
  );
}

function PrefSelect({
  label,
  value,
  options,
  editing,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  options: string[];
  editing: boolean;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      {editing ? (
        <select className="ft-input mt-1" value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o} value={o}>{o}{suffix && o !== 'On' && o !== 'Off' ? suffix : ''}</option>
          ))}
        </select>
      ) : (
        <p className="mt-1 font-medium">{value}{suffix && !['On', 'Off', 'dark', 'light', 'system', 'kg', 'lbs'].includes(value) ? suffix : ''}</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold mt-1 truncate">{value}</p>
    </div>
  );
}
