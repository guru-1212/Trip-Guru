'use client';

import { useParams } from 'next/navigation';
import { Trash2, Users, UserPlus } from 'lucide-react';
import { TripPageShell } from '@/components/trips/TripPageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAppSelector } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { removeTripMember, addMemberToTrip } from '@/firebase/firestore';
import { sendTripInviteNotification } from '@/services/fcmService';
import { EmptyState } from '@/components/common/EmptyState';
import { useState } from 'react';

export default function TripMembersPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  return (
    <TripPageShell tripId={tripId}>
      <MembersContent tripId={tripId} />
    </TripPageShell>
  );
}

function MembersContent({ tripId }: { tripId: string }) {
  const { uid } = useAuth();
  const trip = useAppSelector((s) => s.trips.currentTrip);
  const members = useAppSelector((s) => s.trips.members);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [recalculate, setRecalculate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isOwner = trip?.createdBy === uid;
  const accepted = members.filter((m) => m.inviteStatus === 'accepted');
  const pending = members.filter((m) => m.inviteStatus === 'pending');

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this member? Any "Equal Split" expenses will be redistributed among remaining members.')) return;
    setSubmitting(true);
    try {
      await removeTripMember(memberId);
    } catch (err) {
      console.error(err);
      alert('Failed to remove member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const matchedUserId = await addMemberToTrip(
        tripId,
        { name, email, phone },
        recalculate
      );

      if (matchedUserId && trip) {
        await sendTripInviteNotification(matchedUserId, tripId, trip.tripName);
      }

      setOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setRecalculate(false);
    } catch (err) {
      console.error(err);
      alert('Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Trip members</h2>
        {isOwner && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" /> Add member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add new member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddMember} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    placeholder="10 digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="flex items-start gap-2 pt-2">
                  <input
                    id="recalc"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                    checked={recalculate}
                    onChange={(e) => setRecalculate(e.target.checked)}
                  />
                  <Label htmlFor="recalc" className="text-sm font-normal leading-tight">
                    Include this member in past "Equal Split" expenses automatically.
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add to trip'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members"
          description="Members will appear here once added."
        />
      ) : (
        <>
          <section>
            <h2 className="text-lg font-semibold mb-3">Active members</h2>
            <div className="space-y-2">
              {accepted.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{m.name[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {m.email || m.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {m.role}
                      </Badge>
                      {isOwner && m.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(m.id)}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {pending.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Pending invites</h2>
              <div className="space-y-2">
                {pending.map((m) => (
                  <Card key={m.id} className="border-warning/50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {m.email || m.phone}
                        </p>
                      </div>
                      <Badge variant="warning">Pending</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
