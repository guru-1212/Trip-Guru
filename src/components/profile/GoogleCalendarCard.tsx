'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store';
import { updateProfileLocal } from '@/features/auth/authSlice';
import { linkGoogleWithCalendarScope } from '@/firebase/auth';
import { APP_CALENDAR_NAME } from '@/services/googleCalendarService';
import { Button } from '@/components/ui/button';

/** Connects the account to Google Calendar so water / diet reminders can be synced. */
export function GoogleCalendarCard() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [linking, setLinking] = useState(false);
  const linked = !!user?.googleCalendarLinked;

  const handleLink = async () => {
    setLinking(true);
    try {
      const { accessToken } = await linkGoogleWithCalendarScope();
      // Keep the Redux copy in step so the badge flips without a reload.
      dispatch(updateProfileLocal({ googleCalendarLinked: true, googleAccessToken: accessToken }));
      toast.success('Google Calendar linked');
    } catch (err) {
      console.error(err);
      toast.error('Failed to link Google Calendar');
    } finally {
      setLinking(false);
    }
  };

  return (
    <section className="ft-card ft-card-padded">
      <div className="flex items-center gap-2 mb-1">
        <Calendar className="h-4 w-4 text-primary" />
        <h2 className="ft-title font-semibold">Integrations</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Water and meal reminders can be mirrored into your Google Calendar.
      </p>
      <div className="flex items-center justify-between gap-4 bg-muted/30 p-4 rounded-2xl">
        <div className="space-y-0.5 min-w-0">
          <p className="text-sm font-bold">Google Calendar</p>
          <p className="text-[10px] font-medium text-muted-foreground leading-snug">
            {linked
              ? `Connected to your "${APP_CALENDAR_NAME}" calendar.`
              : 'Sync your reminders to a dedicated calendar.'}
          </p>
        </div>
        <Button
          variant={linked ? 'secondary' : 'default'}
          size="sm"
          className="rounded-xl font-bold px-4"
          disabled={linking}
          onClick={handleLink}
        >
          {linking ? 'Connecting…' : linked ? 'Re-sync' : 'Connect'}
        </Button>
      </div>
    </section>
  );
}
