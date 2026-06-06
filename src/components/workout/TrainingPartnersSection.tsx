'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Users, Mail, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  cancelPendingFitTrackInvite,
  getFitTrackOwnerId,
  getFitTrackPartnersForOwner,
  inviteFitTrackPartner,
  removeFitTrackPartner,
} from '@/firebase/fittrackPartners.firestore';
import { sendFitTrackInviteNotification } from '@/services/fcmService';
import type { FitTrackPartner } from '@/types/fittrackPartner';

export function TrainingPartnersSection() {
  const { uid, user } = useAuth();
  const ownerId = uid ? getFitTrackOwnerId(uid, user) : null;

  const [partners, setPartners] = useState<FitTrackPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPartners = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const list = await getFitTrackPartnersForOwner(ownerId);
      setPartners(list);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load training partners');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  const accepted = partners.filter((p) => p.inviteStatus === 'accepted');
  const pending = partners.filter((p) => p.inviteStatus === 'pending');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !ownerId || !name.trim() || !email.trim()) return;

    setSubmitting(true);
    try {
      const matchedUserId = await inviteFitTrackPartner(ownerId, uid, {
        name: name.trim(),
        email: email.trim(),
      });

      if (matchedUserId) {
        await sendFitTrackInviteNotification(matchedUserId, user?.name ?? 'Your training partner');
      }

      toast.success(
        matchedUserId
          ? 'Invite sent — your friend will see it in FitTrack'
          : 'Invite saved — they will be linked when they sign up with this Gmail'
      );
      setOpen(false);
      setName('');
      setEmail('');
      await loadPartners();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (partner: FitTrackPartner) => {
    if (!ownerId || !partner.partnerId) return;
    if (!confirm(`Remove ${partner.partnerName} from shared training?`)) return;

    setSubmitting(true);
    try {
      await removeFitTrackPartner(ownerId, partner.partnerId);
      toast.success('Training partner removed');
      await loadPartners();
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove partner');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPending = async (memberId: string) => {
    setSubmitting(true);
    try {
      await cancelPendingFitTrackInvite(memberId);
      toast.success('Invite cancelled');
      await loadPartners();
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel invite');
    } finally {
      setSubmitting(false);
    }
  };

  if (!uid || !ownerId) return null;

  return (
    <section className="ft-card ft-card-padded">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="ft-title font-semibold">Training Partners</h2>
        </div>
        <button
          type="button"
          className="ft-btn ft-btn--secondary flex items-center gap-2 text-sm"
          onClick={() => setOpen(true)}
        >
          <UserPlus className="h-4 w-4" /> Invite by Gmail
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Invite friends by Gmail to share the same workout plan, weights, and history. No separate setup needed — once they accept, you both see and edit the same data.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading partners...</p>
      ) : (
        <div className="space-y-4">
          {accepted.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Linked ({accepted.length})
              </p>
              <ul className="space-y-2">
                {accepted.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{p.partnerName}</p>
                      <p className="text-xs text-muted-foreground">{p.partnerEmail}</p>
                    </div>
                    {uid === ownerId && p.partnerId && (
                      <button
                        type="button"
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                        onClick={() => handleRemove(p)}
                        disabled={submitting}
                        aria-label={`Remove ${p.partnerName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Pending invites
              </p>
              <ul className="space-y-2">
                {pending.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-dashed border-border"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{p.partnerName}</p>
                        <p className="text-xs text-muted-foreground">{p.partnerEmail}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleCancelPending(p.id)}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {accepted.length === 0 && pending.length === 0 && (
            <p className="text-sm text-muted-foreground">No training partners yet. Invite a friend by Gmail to train together on the same plan.</p>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="ft-card ft-card-padded max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Invite training partner</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter your friend&apos;s Gmail. They will share your workout data after accepting the invite.
            </p>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <input
                  className="ft-input mt-1 w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Friend's name"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Gmail</label>
                <input
                  className="ft-input mt-1 w-full"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@gmail.com"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="ft-btn ft-btn--secondary flex-1"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ft-btn ft-btn--primary flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Sending...' : 'Send invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
