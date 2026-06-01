'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RoomPageShell } from '@/components/rooms/RoomPageShell';
import { RoomAuditTimeline } from '@/components/rooms/RoomAuditTimeline';
import {
  getCyclesForRoom,
  formatCycleLabel,
  getRoomAuditLogs,
} from '@/firebase/firestore';
import { Cycle } from '@/types/cycle';
import { RoomAuditLog } from '@/types/roomAuditLog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, ScrollText } from 'lucide-react';

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
  const [auditLogs, setAuditLogs] = useState<RoomAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getCyclesForRoom(roomId), getRoomAuditLogs(roomId)])
      .then(([cycleData, logs]) => {
        if (cancelled) return;
        const sorted = [...cycleData].sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        setCycles(sorted);
        setAuditLogs(logs);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">History</h2>
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activity" className="gap-2">
            <ScrollText className="h-4 w-4" />
            Activity log
          </TabsTrigger>
          <TabsTrigger value="cycles" className="gap-2">
            <History className="h-4 w-4" />
            Cycles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading activity...</p>
          ) : (
            <RoomAuditTimeline logs={auditLogs} />
          )}
        </TabsContent>

        <TabsContent value="cycles" className="mt-4 space-y-3">
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
          {!loading && cycles.length === 0 && (
            <p className="text-muted-foreground text-center py-8">No cycles yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
