'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RoomPageShell } from '@/components/rooms/RoomPageShell';
import { getCyclesForRoom, formatCycleLabel } from '@/firebase/firestore';
import { Cycle } from '@/types/cycle';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function RoomHistoryPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  return (
    <RoomPageShell roomId={roomId}>
      <HistoryContent roomId={roomId} />
    </RoomPageShell>
  );
}

function HistoryContent({ roomId }: { roomId: string }) {
  const [cycles, setCycles] = useState<Cycle[]>([]);

  useEffect(() => {
    getCyclesForRoom(roomId).then((data) => {
      const sorted = [...data].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      setCycles(sorted);
    });
  }, [roomId]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Cycle history</h2>
      {cycles.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-4 flex justify-between items-center">
            <span className="font-bold">{formatCycleLabel(c)}</span>
            <Badge
              variant={
                c.status === 'active'
                  ? 'default'
                  : c.status === 'closed'
                    ? 'secondary'
                    : 'outline'
              }
            >
              {c.status}
            </Badge>
          </CardContent>
        </Card>
      ))}
      {cycles.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No cycles yet.</p>
      )}
    </div>
  );
}
