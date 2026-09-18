'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, UserCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store';
import { updateProfileLocal } from '@/features/auth/authSlice';
import { signOut } from '@/firebase/auth';
import { updateUser } from '@/firebase/users.firestore';

/**
 * The Firebase account behind FitTrack: the display name / phone that training
 * partners see when they invite you, plus sign-out.
 */
export function AccountSettingsCard() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, uid } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setPhone(user.phone ?? '');
    }
  }, [user]);

  const dirty = !!user && (name !== (user.name ?? '') || phone !== (user.phone ?? ''));

  const handleSave = async () => {
    if (!uid || !name.trim()) {
      toast.error('Enter a display name');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), phone: phone.trim() };
      await updateUser(uid, payload);
      dispatch(updateProfileLocal(payload));
      toast.success('Account updated');
    } catch (err) {
      console.error(err);
      toast.error('Could not update account');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <section className="ft-card ft-card-padded">
      <div className="flex items-center gap-2 mb-1">
        <UserCircle2 className="h-4 w-4 text-primary" />
        <h2 className="ft-title font-semibold">Account</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Signed in as <span className="font-medium text-foreground">{user?.email}</span>. This name
        and phone are what training partners see.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="account-name" className="text-xs text-muted-foreground">
            Display name
          </label>
          <input
            id="account-name"
            className="ft-input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="account-phone" className="text-xs text-muted-foreground">
            Phone
          </label>
          <input
            id="account-phone"
            className="ft-input mt-1"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="ft-btn ft-btn--primary text-sm disabled:opacity-40 disabled:pointer-events-none"
        >
          {saving ? 'Saving…' : 'Save account'}
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="ft-btn ft-btn--secondary flex items-center gap-2 text-sm text-red-500"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </section>
  );
}
