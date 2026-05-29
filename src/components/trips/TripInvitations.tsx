'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { fetchTripInvitations, acceptInvitation, declineInvitation } from '@/features/trips/tripsThunks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { User, Mail, Calendar, MapPin } from 'lucide-react';
import dayjs from 'dayjs';

export function TripInvitations() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { invitations, invitationsLoading } = useAppSelector((state) => state.trips);

  useEffect(() => {
    if (user?.email && user?.phone) {
      dispatch(fetchTripInvitations({ email: user.email, phone: user.phone }));
    }
  }, [dispatch, user]);

  const handleAccept = (memberId: string) => {
    dispatch(acceptInvitation(memberId));
  };

  const handleDecline = (memberId: string) => {
    dispatch(declineInvitation(memberId));
  };

  if (invitationsLoading) {
    return (
      <div className="my-6">
        <h2 className="text-2xl font-bold mb-4">Pending Invitations</h2>
        <Card>
          <CardContent className="p-6 flex items-center justify-center">
            <LoadingSpinner />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="my-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Mail className="h-6 w-6 text-primary" />
        Pending Invitations
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {invitations.map(({ member, trip, invitedBy }) => (
          <Card key={member.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{trip.tripName}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{trip.destination}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {dayjs(trip.startDate.toDate()).format('MMM D, YYYY')} -{' '}
                    {dayjs(trip.endDate.toDate()).format('MMM D, YYYY')}
                  </span>
                </div>
                {invitedBy && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Invited by {invitedBy.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
            <div className="flex gap-2 p-4 pt-0 border-t-0">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleDecline(member.id)}
              >
                Decline
              </Button>
              <Button
                className="w-full"
                onClick={() => handleAccept(member.id)}
              >
                Accept
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
