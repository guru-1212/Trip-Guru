'use client';

import { useEffect, useState } from 'react';
import { Users, Link2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import {
  getAcceptedFitTrackPartners,
  getFitTrackOwnerId,
} from '@/firebase/fittrackPartners.firestore';
import { getUser } from '@/firebase/firestore';

export function FitTrackSharedBanner() {
  const { uid, user } = useAuth();
  const { isFitTrackPartner } = useWorkoutStore();
  const ownerId = uid ? getFitTrackOwnerId(uid, user) : null;

  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [partnerCount, setPartnerCount] = useState(0);

  useEffect(() => {
    if (!uid || !ownerId) return;

    if (isFitTrackPartner && user?.fittrackLinkedOwnerId) {
      getUser(user.fittrackLinkedOwnerId).then((owner) => {
        setOwnerName(owner?.name ?? 'your partner');
      });
      return;
    }

    if (uid === ownerId) {
      getAcceptedFitTrackPartners(ownerId).then((partners) => {
        setPartnerCount(partners.length);
      });
    }
  }, [uid, ownerId, isFitTrackPartner, user?.fittrackLinkedOwnerId]);

  if (isFitTrackPartner && ownerName) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        <Link2 className="h-4 w-4 text-primary shrink-0" />
        <span>
          Shared workout plan with <strong>{ownerName}</strong> — your changes sync for everyone.
        </span>
      </div>
    );
  }

  if (!isFitTrackPartner && partnerCount > 0) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
        <Users className="h-4 w-4 text-primary shrink-0" />
        <span>
          <strong>{partnerCount}</strong> training partner{partnerCount === 1 ? '' : 's'} linked to your shared plan.
        </span>
      </div>
    );
  }

  return null;
}
