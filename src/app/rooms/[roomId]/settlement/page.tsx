'use client';

import { useParams } from 'next/navigation';
import { RoomPageShell } from '@/components/rooms/RoomPageShell';
import { useRoomSettlement } from '@/hooks/useRoomSettlement';
import { useAppSelector } from '@/store';
import { RoomSettlementCard } from '@/components/rooms/RoomSettlementCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { saveRoomSettlements, upsertCarryForward } from '@/firebase/firestore';
import { HandCoins } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/hooks/useAuth';

export default function RoomSettlementPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  return (
    <RoomPageShell roomId={roomId}>
      <SettlementContent roomId={roomId} />
    </RoomPageShell>
  );
}

function SettlementContent({ roomId }: { roomId: string }) {
  const { uid } = useAuth();
  const members = useAppSelector((s) => s.rooms.members);
  const myMemberKey = members.find((m) => m.userId === uid)?.id;
  const room = useAppSelector((s) => s.rooms.currentRoom);
  const cycle = useAppSelector((s) => s.rooms.activeCycle);
  const expenses = useAppSelector((s) => s.roomExpenses.expenses);
  const { computed, carryForward, getMemberName, recompute } =
    useRoomSettlement(roomId);

  const pendingCarry = carryForward.filter((c) => c.status !== 'settled');

  const handleSave = async () => {
    await saveRoomSettlements(
      computed.map((s) => ({
        roomId,
        cycleId: cycle?.id,
        fromMemberKey: s.fromMemberKey,
        toMemberKey: s.toMemberKey,
        amount: s.amount,
        status: 'pending' as const,
        source: 'computed' as const,
        paidAt: null,
      }))
    );
    for (const s of computed) {
      const existing = pendingCarry.find(
        (c) =>
          c.fromMemberKey === s.fromMemberKey &&
          c.toMemberKey === s.toMemberKey
      );
      if (!existing && cycle) {
        await upsertCarryForward({
          roomId,
          fromMemberKey: s.fromMemberKey,
          toMemberKey: s.toMemberKey,
          amount: s.amount,
          status: 'pending',
          originCycleId: cycle.id,
        });
      }
    }
    recompute();
  };

  if (computed.length === 0 && expenses.length === 0 && pendingCarry.length === 0) {
    return (
      <EmptyState
        icon={HandCoins}
        title="All settled up"
        description="Add expenses to calculate balances."
      />
    );
  }

  return (
    <div className="space-y-6">
      {pendingCarry.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Previous month pending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingCarry.map((c) => (
              <RoomSettlementCard
                key={c.id}
                fromName={getMemberName(c.fromMemberKey)}
                toName={getMemberName(c.toMemberKey)}
                amount={c.amount}
                currency={room?.currency ?? 'INR'}
                status={c.status}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Net settlements (this cycle)</h2>
        {computed.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleSave}>
            Save balances
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {computed.map((s, i) => (
          <RoomSettlementCard
            key={`${s.fromMemberKey}-${s.toMemberKey}-${i}`}
            fromName={getMemberName(s.fromMemberKey)}
            toName={getMemberName(s.toMemberKey)}
            amount={s.amount}
            currency={room?.currency ?? 'INR'}
            status={s.status}
            canMarkPaid={
              myMemberKey === s.fromMemberKey ||
              myMemberKey === s.toMemberKey ||
              room?.createdBy === uid
            }
          />
        ))}
      </div>
    </div>
  );
}
