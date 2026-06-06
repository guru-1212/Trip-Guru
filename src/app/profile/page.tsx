'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/firebase/auth';
import {
  updateUser,
  getPendingInvitesForUser,
  acceptTripInvite,
  getTrip,
} from '@/firebase/firestore';
import { uploadProfilePhoto } from '@/firebase/storage';
import { updateProfileLocal } from '@/features/auth/authSlice';
import { useAppDispatch } from '@/store';
import { TripMember } from '@/types/member';
import { PrimaryUseCase, AppMode } from '@/types/user';
import { setAppMode } from '@/features/appMode/appModeSlice';
import { writeStoredMode } from '@/lib/appMode';
import { LogOut, Bell, Camera, User as UserIcon, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { ImageCropper } from '@/components/profile/ImageCropper';
import {
  getPushSetupStatus,
  isPushConfigured,
  requestFCMToken,
  type PushSetupStatus,
} from '@/services/fcmService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <ProfileContent />
      </AppShell>
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, uid } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifySaving, setNotifySaving] = useState(false);
  const [primaryUseCase, setPrimaryUseCase] = useState<PrimaryUseCase>('trips');
  const [pendingInvites, setPendingInvites] = useState<TripMember[]>([]);
  const [inviteTripNames, setInviteTripNames] = useState<Record<string, string>>({});
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [displayPhotoUrl, setDisplayPhotoUrl] = useState<string | undefined>();
  const [pushStatus, setPushStatus] = useState<PushSetupStatus | null>(null);
  const [pushConfigured, setPushConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const configured = await isPushConfigured();
      if (!cancelled) setPushConfigured(configured);
      if (uid) {
        const status = await getPushSetupStatus(uid, user?.fcmToken);
        if (!cancelled) setPushStatus(status);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, user?.fcmToken]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
      setDisplayPhotoUrl(user.photoURL);
      setNotifyEnabled(user.notifyEnabled ?? false);
      setPrimaryUseCase(user.primaryUseCase ?? 'trips');
    }
  }, [user]);

  const loadInvites = async () => {
    if (!user?.email) return;
    const invites = await getPendingInvitesForUser(user.email, user.phone);
    setPendingInvites(invites);

    const tripPromises = invites.map((inv) => getTrip(inv.tripId));
    const trips = await Promise.all(tripPromises);

    const names: Record<string, string> = {};
    invites.forEach((inv, index) => {
      names[inv.id] = trips[index]?.tripName ?? 'Trip';
    });
    setInviteTripNames(names);
  };

  useEffect(() => {
    loadInvites();
  }, [user]);

  const handleAcceptInvite = async (memberId: string) => {
    if (!uid) return;
    setAcceptingId(memberId);
    try {
      await acceptTripInvite(memberId, uid);
      await loadInvites();
    } finally {
      setAcceptingId(null);
    }
  };

  const handleSave = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      let activeMode: AppMode | undefined;
      if (primaryUseCase === 'trips') activeMode = 'trip';
      else if (primaryUseCase === 'roommate') activeMode = 'room';

      const payload = {
        name,
        phone,
        notifyEnabled,
        primaryUseCase,
        ...(activeMode ? { activeMode } : {}),
      };

      await updateUser(uid, payload);
      dispatch(updateProfileLocal(payload));

      if (activeMode) {
        dispatch(setAppMode(activeMode));
        writeStoredMode(uid, activeMode);
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setIsCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; 
  };

  const handleCropComplete = async (blob: Blob) => {
    if (!uid) return;
    setIsCropOpen(false);
    setSaving(true);
    try {
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      const url = await uploadProfilePhoto(uid, file);
      await updateUser(uid, { photoURL: url });
      dispatch(updateProfileLocal({ photoURL: url }));
      setDisplayPhotoUrl(url);
    } finally {
      setSaving(false);
      setCropImage(null);
    }
  };

  const handleToggleNotify = async (enabled: boolean) => {
    if (!uid || notifySaving) return;

    const previousEnabled = user?.notifyEnabled ?? false;
    const previousToken = user?.fcmToken ?? '';
    setNotifySaving(true);

    try {
      if (!enabled) {
        setNotifyEnabled(false);
        await updateUser(uid, { notifyEnabled: false });
        dispatch(updateProfileLocal({ notifyEnabled: false }));
        const status = await getPushSetupStatus(uid, previousToken);
        setPushStatus(status);
        // alert('Push notifications disabled.');
        return;
      }

      setNotifyEnabled(true);
      const result = await requestFCMToken(uid);

      if (!result.token) {
        setNotifyEnabled(previousEnabled);
        // alert(result.message);
        return;
      }

      dispatch(
        updateProfileLocal({
          notifyEnabled: true,
          fcmToken: result.token,
        })
      );
      const status = await getPushSetupStatus(uid, result.token);
      setPushStatus(status);
      // alert(result.message);
    } catch (error) {
      setNotifyEnabled(previousEnabled);
      console.error('Failed to update notification settings:', error);
      // alert(
      //   `Failed to save notification settings: ${
      //     error instanceof Error ? error.message : 'Unknown error'
      //   }`
      // );
    } finally {
      setNotifySaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 md:space-y-12">
      <div className="space-y-4 text-center sm:text-left">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors group"
        >
          <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </Link>
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Account</h1>
          <p className="text-muted-foreground font-medium">Manage your personal "Travel OS" settings.</p>
        </div>
      </div>

      <Card className="rounded-[32px] overflow-hidden border-border/40 shadow-xl shadow-slate-200/20 dark:shadow-none bg-white dark:bg-slate-900/50">
        <CardContent className="p-10 flex flex-col items-center text-center gap-6">
          <div className="relative group">
            <Avatar className="h-32 w-32 border-4 border-background shadow-2xl ring-1 ring-border/10">
              <AvatarImage src={displayPhotoUrl} className="object-cover" />
              <AvatarFallback className="bg-primary/5 text-primary text-4xl font-black">
                {user?.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Label 
              htmlFor="photo" 
              className="absolute bottom-1 right-1 w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all"
            >
              <Camera className="h-5 w-5" />
            </Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{user?.name}</h2>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCropOpen} onOpenChange={setIsCropOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[32px] border-0 shadow-2xl">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-black text-center">Crop Profile Photo</DialogTitle>
          </DialogHeader>
          {cropImage && (
            <ImageCropper 
              imageSrc={cropImage} 
              onCrop={handleCropComplete} 
              onCancel={() => setIsCropOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      <Card className="rounded-[32px] border-border/40 shadow-sm bg-white dark:bg-slate-900/50">
        <CardHeader className="px-8 pt-8 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-black">Personal Info</CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl h-12 font-bold" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl h-12 font-bold" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto rounded-xl px-8 h-12 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border-border/40 shadow-sm bg-white dark:bg-slate-900/50">
        <CardHeader className="px-8 pt-8">
          <CardTitle className="text-xl font-black">Primary use</CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8 space-y-2">
          <p className="text-xs text-muted-foreground font-medium pb-2">
            Choose &quot;Both&quot; to show the Trips / Rooms switch in the app bar.
            Existing accounts without this field default to trips-only until you change it here.
          </p>
          {(
            [
              ['trips', 'Travel & Trips'],
              ['roommate', 'Roommate Expenses'],
              ['both', 'Both'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPrimaryUseCase(value)}
              className={`w-full p-3 rounded-xl border text-left text-sm font-bold transition-colors ${
                primaryUseCase === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {label}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border-border/40 shadow-sm bg-white dark:bg-slate-900/50">
        <CardHeader className="px-8 pt-8 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <label className="flex items-center gap-4 cursor-pointer group bg-muted/30 p-4 rounded-2xl hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={notifyEnabled}
              disabled={notifySaving}
              onChange={(e) => handleToggleNotify(e.target.checked)}
              className="h-5 w-5 rounded-lg border-primary accent-primary cursor-pointer disabled:opacity-50"
            />
            <div className="space-y-0.5">
              <p className="text-sm font-bold">Enable Push Notifications</p>
              <p className="text-[10px] font-medium text-muted-foreground leading-none">
                Get alerts when roommates add or change expenses, settlements, bring-list items, rent, and trip expenses — even when the app is closed.
              </p>
            </div>
          </label>
          {pushConfigured === false && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 font-medium rounded-xl bg-amber-500/10 p-3">
              Push is not configured on this install. Add your Web Push key from Firebase
              (Cloud Messaging → Web Push certificates) to{' '}
              <code className="text-[10px]">NEXT_PUBLIC_FIREBASE_VAPID_KEY</code> in{' '}
              <code className="text-[10px]">.env.local</code>, run{' '}
              <code className="text-[10px]">npm run build</code>, and redeploy the PWA.
            </p>
          )}
          {pushStatus && (
            <ul className="mt-3 text-xs text-muted-foreground space-y-1 rounded-xl bg-muted/30 p-3">
              <li>
                VAPID key:{' '}
                {pushStatus.configured ? (
                  <span className="text-emerald-600 font-semibold">OK</span>
                ) : (
                  <span className="text-amber-600 font-semibold">Missing</span>
                )}
              </li>
              <li>
                Browser permission:{' '}
                <span className="font-semibold capitalize">{pushStatus.permission}</span>
              </li>
              <li>
                Device registered:{' '}
                {pushStatus.hasToken ? (
                  <span className="text-emerald-600 font-semibold">Yes</span>
                ) : (
                  <span className="text-amber-600 font-semibold">No — toggle on above</span>
                )}
              </li>
              {!pushStatus.messagingSupported && (
                <li className="text-amber-600">
                  Push not supported in this browser. On iPhone, install TripMate to the Home
                  Screen first (iOS 16.4+).
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="pt-4 flex flex-col gap-4">
        <Button variant="ghost" className="w-full rounded-2xl font-black text-xs uppercase tracking-widest h-12 hover:bg-destructive/5 hover:text-destructive transition-all" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out from device
        </Button>
      </div>
    </div>
  );
}
