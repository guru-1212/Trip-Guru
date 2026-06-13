'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { RoomPageShell } from '@/components/rooms/RoomPageShell';
import { useAppSelector } from '@/store';
import { addMemberToRoom, findUserByEmailOrPhone } from '@/firebase/firestore';
import { recordRoomAuditLog } from '@/services/roomAuditLogService';
import { sendRoomInviteNotification } from '@/services/fcmService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Cake, Calendar, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { createCalendarEvent, generateYearlyRRule } from '@/services/googleCalendarService';
import { linkGoogleWithCalendarScope } from '@/firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/firebase/config';

export default function RoomMembersPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  return (
    <RoomPageShell roomId={roomId}>
      <MembersContent roomId={roomId} />
    </RoomPageShell>
  );
}

function MembersContent({ roomId }: { roomId: string }) {
  const { uid, user } = useAuth();
  const actorName = useAppSelector((s) => s.auth.user?.name ?? 'Someone');
  const room = useAppSelector((s) => s.rooms.currentRoom);
  const members = useAppSelector((s) => s.rooms.members);
  const cycle = useAppSelector((s) => s.rooms.activeCycle);
  const [draft, setDraft] = useState({ name: '', email: '', phone: '' });
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!draft.name || !draft.email || !uid) return;
    setAdding(true);
    try {
      const memberId = await addMemberToRoom(roomId, draft);
      await recordRoomAuditLog({
        roomId,
        cycleId: cycle?.id,
        action: 'member.invited',
        entityType: 'member',
        entityId: memberId,
        actorUid: uid,
        actorName,
        summary: `${actorName} invited ${draft.name} (${draft.email})`,
        metadata: { memberName: draft.name, email: draft.email },
      });

      const matchedUserId = await findUserByEmailOrPhone(draft.email, draft.phone);
      if (matchedUserId && room) {
        await sendRoomInviteNotification(matchedUserId, roomId, room.name);
      }

      setDraft({ name: '', email: '', phone: '' });
    } finally {
      setAdding(false);
    }
  };

  const handleSyncBirthday = async (member: any, birthday: string) => {
    if (!uid || !user) return;
    setSyncingId(member.id);
    try {
      let accessToken = user.googleAccessToken;
      if (!user.googleCalendarLinked || !accessToken) {
        const result = await linkGoogleWithCalendarScope();
        accessToken = result.accessToken;
      }

      if (accessToken) {
        const [year, month, day] = birthday.split('-').map(Number);
        const startDate = new Date();
        startDate.setFullYear(new Date().getFullYear(), month - 1, day);
        startDate.setHours(9, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + 30);

        const eventDetails = {
          summary: `🎂 Birthday: ${member.name}`,
          description: `Annual birthday reminder for your roommate ${member.name} (from Trip-Guru).`,
          start: {
            dateTime: startDate.toISOString(),
          },
          end: {
            dateTime: endDate.toISOString(),
          },
          recurrence: [generateYearlyRRule()],
        };

        const eventId = await createCalendarEvent(accessToken, eventDetails, user.googleCalendarId || 'primary');
        
        await updateDoc(doc(getFirebaseDb(), 'roomMembers', member.id), {
          birthday,
          googleCalendarBirthdayEventId: eventId,
        });

        toast.success(`Synced birthday for ${member.name}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync birthday');
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-3">
        {members.map((m: any) => (
          <Card key={m.id}>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">{m.name}</p>
                  <p className="text-sm text-muted-foreground">{m.email}</p>
                </div>
                <Badge variant={m.inviteStatus === 'accepted' ? 'default' : 'secondary'}>
                  {m.inviteStatus}
                </Badge>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t">
                <Cake className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    defaultValue={m.birthday}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== m.birthday) {
                        handleSyncBirthday(m, e.target.value);
                      }
                    }}
                    disabled={syncingId === m.id}
                  />
                </div>
                {m.googleCalendarBirthdayEventId && (
                  <Calendar className="h-4 w-4 text-[hsl(var(--success))]" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-bold text-sm">Invite roommate</p>
          <Input
            placeholder="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Input
            placeholder="Email"
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          />
          <Input
            placeholder="Phone"
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          />
          <Button onClick={handleAdd} disabled={adding}>
            <Plus className="h-4 w-4 mr-1" />
            {adding ? 'Adding...' : 'Add member'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
