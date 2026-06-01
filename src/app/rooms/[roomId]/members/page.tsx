'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { RoomPageShell } from '@/components/rooms/RoomPageShell';
import { useAppSelector } from '@/store';
import { addMemberToRoom } from '@/firebase/firestore';
import { recordRoomAuditLog } from '@/services/roomAuditLogService';
import { useAuth } from '@/hooks/useAuth';
import { useAppSelector } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

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
  const { uid } = useAuth();
  const actorName = useAppSelector((s) => s.auth.user?.name ?? 'Someone');
  const members = useAppSelector((s) => s.rooms.members);
  const cycle = useAppSelector((s) => s.rooms.activeCycle);
  const [draft, setDraft] = useState({ name: '', email: '', phone: '' });
  const [adding, setAdding] = useState(false);

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
      setDraft({ name: '', email: '', phone: '' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-3">
        {members.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="font-bold">{m.name}</p>
                <p className="text-sm text-muted-foreground">{m.email}</p>
              </div>
              <Badge variant={m.inviteStatus === 'accepted' ? 'default' : 'secondary'}>
                {m.inviteStatus}
              </Badge>
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
