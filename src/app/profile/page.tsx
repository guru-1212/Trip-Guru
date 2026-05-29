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
import { LogOut, Bell } from 'lucide-react';
import Link from 'next/link';

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
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<TripMember[]>([]);
  const [inviteTripNames, setInviteTripNames] = useState<Record<string, string>>({});
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
      setNotifyEnabled(user.notifyEnabled ?? true);
    }
  }, [user]);

  const loadInvites = async () => {
    if (!user?.email) return;
    const invites = await getPendingInvitesForUser(user.email, user.phone);
    setPendingInvites(invites);
    const names: Record<string, string> = {};
    for (const inv of invites) {
      const trip = await getTrip(inv.tripId);
      names[inv.id] = trip?.tripName ?? 'Trip';
    }
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
      await updateUser(uid, { name, phone, notifyEnabled });
      dispatch(updateProfileLocal({ name, phone, notifyEnabled }));
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    const url = await uploadProfilePhoto(uid, file);
    await updateUser(uid, { photoURL: url });
    dispatch(updateProfileLocal({ photoURL: url }));
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user?.photoURL} />
            <AvatarFallback className="text-2xl">
              {user?.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <Label htmlFor="photo" className="cursor-pointer text-primary text-sm">
              Change photo
            </Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhoto}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyEnabled}
              onChange={(e) => setNotifyEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm">Enable push notifications</span>
          </label>
        </CardContent>
      </Card>

      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending trip invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-2 p-3 rounded-md border flex-wrap"
              >
                <span className="text-sm font-medium">
                  {inviteTripNames[inv.id] ?? 'Trip invite'}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={acceptingId === inv.id}
                    onClick={() => handleAcceptInvite(inv.id)}
                  >
                    {acceptingId === inv.id ? 'Accepting...' : 'Accept'}
                  </Button>
                  <Link href={`/trips/${inv.tripId}`}>
                    <Badge className="cursor-pointer h-9 flex items-center px-3">
                      View
                    </Badge>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Button variant="destructive" className="w-full" onClick={handleSignOut}>
        <LogOut className="h-4 w-4 mr-2" /> Sign out
      </Button>
    </div>
  );
}
