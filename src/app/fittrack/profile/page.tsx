'use client';

import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Pencil, Upload, Download, Trash2, AlertTriangle } from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { DAY_KEYS, SPLIT_DEFINITIONS } from '@/workout/constants';
import { getFavouriteSplit, getFavouriteExercise } from '@/workout/analytics';
import { formatWeight, formatDuration } from '@/workout/utils';
import type { DayKey, FitnessGoal, SplitId, ThemePref } from '@/workout/types';

export default function ProfilePage() {
  const {
    profile,
    workouts,
    hydrated,
    updateProfile,
    exportData,
    importData,
    clearHistory,
    clearAllPRs,
  } = useWorkoutStore();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);
  const [confirmClear, setConfirmClear] = useState<'history' | 'prs' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalVolume = workouts.reduce((s, w) => s + w.totalVolume, 0);
  const totalTime = workouts.reduce((s, w) => s + w.duration, 0);
  const memberSince = workouts.length
    ? workouts.sort((a, b) => a.date.localeCompare(b.date))[0].date
    : dayjs().format('YYYY-MM-DD');

  const saveProfile = () => {
    updateProfile(form);
    setEditing(false);
  };

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const avatar = reader.result as string;
      setForm((f) => ({ ...f, avatar }));
      if (!editing) updateProfile({ avatar });
    };
    reader.readAsDataURL(file);
  };

  if (!hydrated) return <div className="text-[var(--wk-muted)]">Loading...</div>;

  return (
    <PageTransition>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="wk-heading text-2xl font-bold">Profile</h1>
          <button
            type="button"
            onClick={() => { if (editing) saveProfile(); else { setForm(profile); setEditing(true); } }}
            className="wk-btn-secondary flex items-center gap-2 text-sm"
          >
            <Pencil className="h-4 w-4" />
            {editing ? 'Save' : 'Edit'}
          </button>
        </div>

        {/* Personal Info */}
        <section className="wk-card p-6">
          <h2 className="wk-heading font-semibold mb-4">Personal Info</h2>
          <div className="flex flex-wrap items-start gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--wk-surface)] border-2 border-[var(--wk-border)]">
                {form.avatar ? (
                  <img src={form.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--wk-accent)] flex items-center justify-center cursor-pointer">
                <Upload className="h-3.5 w-3.5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              </label>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-[240px]">
              <Field label="Name" value={form.name} editing={editing} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Age" value={String(form.age)} editing={editing} type="number" onChange={(v) => setForm({ ...form, age: parseInt(v, 10) || 0 })} />
              <Field label="Gender" value={form.gender} editing={editing} onChange={(v) => setForm({ ...form, gender: v })} />
              <Field label="Height (cm)" value={String(form.height)} editing={editing} type="number" onChange={(v) => setForm({ ...form, height: parseFloat(v) || 0 })} />
              <Field label="Weight (kg)" value={String(form.weight)} editing={editing} type="number" onChange={(v) => setForm({ ...form, weight: parseFloat(v) || 0 })} />
              <div>
                <label className="text-xs text-[var(--wk-muted)]">Fitness Goal</label>
                {editing ? (
                  <select
                    className="wk-input mt-1"
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
        <section className="wk-card p-6">
          <h2 className="wk-heading font-semibold mb-4">Weekly Split Schedule</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DAY_KEYS.map((day) => (
              <div key={day} className="flex items-center justify-between p-3 rounded-lg bg-[var(--wk-surface)] border border-[var(--wk-border)]">
                <span className="font-medium">{day}</span>
                {editing ? (
                  <select
                    className="wk-input w-auto text-sm py-1"
                    value={form.weekSchedule[day]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        weekSchedule: { ...form.weekSchedule, [day]: e.target.value as SplitId },
                      })
                    }
                  >
                    {SPLIT_DEFINITIONS.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    <option value="rest">Rest</option>
                  </select>
                ) : (
                  <span className="text-sm text-[var(--wk-muted)]">
                    {form.weekSchedule[day] === 'rest'
                      ? 'Rest'
                      : SPLIT_DEFINITIONS.find((s) => s.id === form.weekSchedule[day])?.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Preferences */}
        <section className="wk-card p-6">
          <h2 className="wk-heading font-semibold mb-4">App Preferences</h2>
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

        {/* Data Management */}
        <section className="wk-card p-6">
          <h2 className="wk-heading font-semibold mb-4">Data Management</h2>
          <p className="text-sm text-[var(--wk-muted)] mb-4">
            All FitTrack data syncs to Firebase in real time. Sign in on any device with the same account to access your workouts.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={exportData} className="wk-btn-secondary flex items-center gap-2 text-sm">
              <Download className="h-4 w-4" /> Export JSON
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="wk-btn-secondary flex items-center gap-2 text-sm">
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
            <button type="button" onClick={() => setConfirmClear('history')} className="wk-btn-secondary flex items-center gap-2 text-sm text-[var(--wk-danger)]">
              <Trash2 className="h-4 w-4" /> Clear History
            </button>
            <button type="button" onClick={() => setConfirmClear('prs')} className="wk-btn-secondary flex items-center gap-2 text-sm text-[var(--wk-danger)]">
              <Trash2 className="h-4 w-4" /> Clear PRs
            </button>
          </div>
        </section>

        {/* App Stats */}
        <section className="wk-card p-6">
          <h2 className="wk-heading font-semibold mb-4">App Stats</h2>
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
            <div className="wk-card p-6 max-w-sm w-full space-y-4">
              <div className="flex items-center gap-3 text-[var(--wk-danger)]">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-semibold">Confirm Delete</h3>
              </div>
              <p className="text-sm text-[var(--wk-muted)]">
                {confirmClear === 'history'
                  ? 'This will permanently delete all workout history. This cannot be undone.'
                  : 'This will permanently delete all personal records. This cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button type="button" className="wk-btn-secondary flex-1" onClick={() => setConfirmClear(null)}>Cancel</button>
                <button
                  type="button"
                  className="wk-btn-primary flex-1 !bg-[var(--wk-danger)]"
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
      <label className="text-xs text-[var(--wk-muted)]">{label}</label>
      {editing ? (
        <input className="wk-input mt-1" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
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
      <label className="text-xs text-[var(--wk-muted)]">{label}</label>
      {editing ? (
        <select className="wk-input mt-1" value={value} onChange={(e) => onChange(e.target.value)}>
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
    <div className="p-3 rounded-lg bg-[var(--wk-surface)]">
      <p className="text-xs text-[var(--wk-muted)]">{label}</p>
      <p className="font-semibold mt-1 truncate">{value}</p>
    </div>
  );
}
