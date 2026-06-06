'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { updateProfileLocal } from '@/features/auth/authSlice';
import {
  acceptFitTrackPartner,
  declineFitTrackPartner,
  getPendingFitTrackInvitesForUser,
} from '@/firebase/fittrackPartners.firestore';
import { getUser } from '@/firebase/firestore';
import type { FitTrackPartner } from '@/types/fittrackPartner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface EnrichedInvite {
  partner: FitTrackPartner;
  ownerName: string;
  invitedByName: string | null;
}

export function FitTrackInvitations() {
  const dispatch = useAppDispatch();
  const { user, uid } = useAuth();
  const [invitations, setInvitations] = useState<EnrichedInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    if (!user?.email) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const pending = await getPendingFitTrackInvitesForUser(user.email);
      const enriched = await Promise.all(
        pending.map(async (partner) => {
          const [owner, inviter] = await Promise.all([
            getUser(partner.ownerId),
            getUser(partner.invitedBy),
          ]);
          return {
            partner,
            ownerName: owner?.name ?? 'Someone',
            invitedByName: inviter?.name ?? null,
          };
        })
      );
      setInvitations(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  const handleAccept = async (invite: EnrichedInvite) => {
    if (!uid) return;
    if (
      user?.fittrackLinkedOwnerId &&
      user.fittrackLinkedOwnerId !== invite.partner.ownerId
    ) {
      toast.error('You are already linked to another training partner group');
      return;
    }

    const confirmMsg =
      'Accepting will switch you to shared workout data. Your personal FitTrack data will stay saved but won\'t be shown while linked. Continue?';
    if (!confirm(confirmMsg)) return;

    setActing(invite.partner.id);
    try {
      await acceptFitTrackPartner(invite.partner.id, uid);
      const profile = await getUser(uid);
      if (profile) {
        dispatch(updateProfileLocal({ fittrackLinkedOwnerId: invite.partner.ownerId }));
      }
      toast.success(`You are now training with ${invite.ownerName}'s shared plan`);
      await loadInvitations();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setActing(null);
    }
  };

  const handleDecline = async (memberId: string) => {
    setActing(memberId);
    try {
      await declineFitTrackPartner(memberId);
      toast.success('Invite declined');
      await loadInvitations();
    } catch (err) {
      console.error(err);
      toast.error('Failed to decline invite');
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="mb-8 flex justify-center">
        <LoadingSpinner label="Checking training partner invites..." />
      </div>
    );
  }

  if (invitations.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        Training Partner Invites
        <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold uppercase">
          {invitations.length} New
        </span>
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {invitations.map(({ partner, ownerName, invitedByName }) => (
          <motion.div
            key={partner.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="p-5 space-y-4 border-border/60">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">Shared FitTrack plan</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Train together with <span className="font-medium text-foreground">{ownerName}</span> — same workouts, weights, and history.
                  </p>
                  {invitedByName && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Invited by {invitedByName}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={acting === partner.id}
                  onClick={() => handleDecline(partner.id)}
                >
                  Decline
                </Button>
                <Button
                  className="flex-1"
                  disabled={acting === partner.id}
                  onClick={() => handleAccept({ partner, ownerName, invitedByName })}
                >
                  {acting === partner.id ? 'Joining...' : 'Accept & share data'}
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
