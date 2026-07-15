'use client';

import { useEffect, useState } from 'react';
import { Layers, Plane, Home, Dumbbell, Flower2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppDispatch, useAppSelector } from '@/store';
import { updateUser } from '@/firebase/firestore';
import { updateProfileLocal } from '@/features/auth/authSlice';
import { AppMode, ALL_WORKSPACES, resolveEnabledWorkspaces } from '@/lib/appMode';

const WORKSPACE_META: Record<
  AppMode,
  { label: string; description: string; icon: typeof Plane }
> = {
  trip: {
    label: 'Trips',
    description: 'Plan trips, split travel expenses and save memories.',
    icon: Plane,
  },
  room: {
    label: 'Rooms',
    description: 'Shared household rent, bills and settlements.',
    icon: Home,
  },
  gym: {
    label: 'GYM · FitTrack',
    description: 'Workouts, muscle recovery, diet and progress.',
    icon: Dumbbell,
  },
  yoga: {
    label: 'YOGA',
    description: 'Flows, meditation and mindful sessions.',
    icon: Flower2,
  },
};

/**
 * Per-account control over which top-level workspaces (Trips / Rooms / GYM /
 * YOGA) show up in the app bar. Self-contained: reads and writes the signed-in
 * user's `enabledWorkspaces` via Redux + Firestore, so it can be dropped into
 * any profile page (trip, gym, yoga) — important because a user who hides every
 * other workspace only ever reaches their own mode's profile.
 */
export function WorkspacesSettingsCard() {
  const dispatch = useAppDispatch();
  const uid = useAppSelector((s) => s.auth.firebaseUid);
  const user = useAppSelector((s) => s.auth.user);

  const [enabledWorkspaces, setEnabledWorkspaces] = useState<AppMode[]>([...ALL_WORKSPACES]);
  const [saving, setSaving] = useState<AppMode | null>(null);

  useEffect(() => {
    setEnabledWorkspaces(resolveEnabledWorkspaces(user?.enabledWorkspaces));
  }, [user?.enabledWorkspaces]);

  const toggleWorkspace = async (id: AppMode) => {
    if (!uid || saving) return;
    const isOn = enabledWorkspaces.includes(id);
    if (isOn && enabledWorkspaces.length === 1) {
      toast.error('Keep at least one workspace enabled');
      return;
    }

    const next = isOn
      ? enabledWorkspaces.filter((w) => w !== id)
      : resolveEnabledWorkspaces([...enabledWorkspaces, id]);
    const previous = enabledWorkspaces;

    setEnabledWorkspaces(next);
    setSaving(id);
    try {
      await updateUser(uid, { enabledWorkspaces: next });
      dispatch(updateProfileLocal({ enabledWorkspaces: next }));
      toast.success(`${WORKSPACE_META[id].label} ${isOn ? 'hidden' : 'enabled'}`);
    } catch (error) {
      setEnabledWorkspaces(previous);
      console.error('Failed to update workspaces:', error);
      toast.error('Could not update workspaces');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card className="rounded-[32px] border-border/40 shadow-sm bg-white dark:bg-slate-900/50">
      <CardHeader className="px-8 pt-8">
        <CardTitle className="text-xl font-black flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" /> Workspaces
        </CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-8 space-y-3">
        <p className="text-xs text-muted-foreground font-medium pb-1">
          Choose which sections appear in your app. This affects only your account —
          it does not change anything for other users. Keep at least one enabled.
        </p>
        {ALL_WORKSPACES.map((id) => {
          const { label, description, icon: Icon } = WORKSPACE_META[id];
          const isOn = enabledWorkspaces.includes(id);
          const isLastOn = isOn && enabledWorkspaces.length === 1;
          return (
            <div
              key={id}
              className="flex items-center justify-between gap-4 bg-muted/30 p-4 rounded-2xl"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isOn ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-bold">{label}</p>
                  <p className="text-[10px] font-medium text-muted-foreground leading-snug">
                    {description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                aria-label={`${isOn ? 'Hide' : 'Show'} ${label}`}
                disabled={saving === id || isLastOn}
                onClick={() => toggleWorkspace(id)}
                className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                  isOn ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                    isOn ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
