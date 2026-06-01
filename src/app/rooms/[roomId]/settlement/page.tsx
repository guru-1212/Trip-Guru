'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { RoomPageShell } from '@/components/rooms/RoomPageShell';
import { useRoomSettlement } from '@/hooks/useRoomSettlement';
import { useAppSelector } from '@/store';
import { RoomSettlementCard } from '@/components/rooms/RoomSettlementCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  claimRoomSettlementPayment,
  confirmRoomSettlementPayment,
  upsertCarryForward,
} from '@/firebase/firestore';
import { recordRoomAuditLog } from '@/services/roomAuditLogService';
import { isSettlementOpen } from '@/lib/mergeRoomSettlements';
import { getMyMemberKey } from '@/lib/utils';
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
  const actorName = useAppSelector((s) => s.auth.user?.name ?? 'Someone');
  const members = useAppSelector((s) => s.rooms.members);
  const myMemberKey = getMyMemberKey(uid, members);
  const room = useAppSelector((s) => s.rooms.currentRoom);
  const cycle = useAppSelector((s) => s.rooms.activeCycle);
  const expenses = useAppSelector((s) => s.roomExpenses.expenses);
  const {
    displaySettlements,
    carryForward,
    getMemberName,
    recompute,
    refreshSettlements,
  } = useRoomSettlement(roomId);

  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingCarry = carryForward.filter((c) => c.status !== 'settled');
  const currency = room?.currency ?? 'INR';

  const openSettlements = displaySettlements.filter((s) =>
    isSettlementOpen(s.status)
  );
  const settledSettlements = displaySettlements.filter(
    (s) => s.status === 'paid'
  );

  const myPayments = openSettlements.filter(
    (s) => s.fromMemberKey === myMemberKey
  );
  const awaitingMyConfirm = openSettlements.filter(
    (s) =>
      s.toMemberKey === myMemberKey && s.status === 'awaiting_confirmation'
  );
  const othersOpen = openSettlements.filter(
    (s) =>
      s.fromMemberKey !== myMemberKey &&
      s.toMemberKey !== myMemberKey
  );

  const owedToMePending = openSettlements.filter(
    (s) => s.toMemberKey === myMemberKey && s.status === 'pending'
  );

  const handleClaim = async (settlementId: string, toName: string, amount: number) => {
    if (!uid || settlementId.startsWith('computed_')) return;
    setBusyId(settlementId);
    try {
      await claimRoomSettlementPayment(settlementId);
      await recordRoomAuditLog({
        roomId,
        cycleId: cycle?.id,
        action: 'settlement.payment_claimed',
        entityType: 'settlement',
        entityId: settlementId,
        actorUid: uid,
        actorName,
        summary: `${actorName} marked payment of ${currency} ${amount.toLocaleString()} to ${toName}`,
        metadata: { amount },
      });
      await refreshSettlements();
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirm = async (
    settlementId: string,
    fromName: string,
    amount: number
  ) => {
    if (!uid) return;
    setBusyId(settlementId);
    try {
      await confirmRoomSettlementPayment(settlementId);
      await recordRoomAuditLog({
        roomId,
        cycleId: cycle?.id,
        action: 'settlement.payment_confirmed',
        entityType: 'settlement',
        entityId: settlementId,
        actorUid: uid,
        actorName,
        summary: `${actorName} confirmed ${fromName} paid ${currency} ${amount.toLocaleString()}`,
        metadata: { amount },
      });
      await refreshSettlements();
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveCarryForward = async () => {
    for (const s of displaySettlements.filter((x) => x.status === 'pending')) {
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
    if (uid && displaySettlements.length > 0) {
      await recordRoomAuditLog({
        roomId,
        cycleId: cycle?.id,
        action: 'settlement.saved',
        entityType: 'settlement',
        actorUid: uid,
        actorName,
        summary: `${actorName} saved carry-forward balances for this cycle`,
      });
    }
    recompute();
    await refreshSettlements();
  };

  if (
    displaySettlements.length === 0 &&
    expenses.length === 0 &&
    pendingCarry.length === 0
  ) {
    return (
      <EmptyState
        icon={HandCoins}
        title="All settled up"
        description="Add expenses to calculate who owes whom."
      />
    );
  }

  return (
    <div className="space-y-6">
      {myPayments.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your payments</h2>
          <p className="text-sm text-muted-foreground">
            Pay your share, then tap &quot;I&apos;ve paid&quot;. It closes only after they confirm.
          </p>
          {myPayments.map((s) => (
            <RoomSettlementCard
              key={s.id}
              fromName={getMemberName(s.fromMemberKey)}
              toName={getMemberName(s.toMemberKey)}
              amount={s.amount}
              currency={currency}
              status={s.status}
              viewAs="debtor"
              onClaimPaid={
                s.isPersisted && s.status === 'pending'
                  ? () =>
                      handleClaim(
                        s.id,
                        getMemberName(s.toMemberKey),
                        s.amount
                      )
                  : undefined
              }
              claiming={busyId === s.id}
            />
          ))}
        </section>
      )}

      {owedToMePending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Owed to you</h2>
          {owedToMePending.map((s) => (
            <RoomSettlementCard
              key={s.id}
              fromName={getMemberName(s.fromMemberKey)}
              toName={getMemberName(s.toMemberKey)}
              amount={s.amount}
              currency={currency}
              status={s.status}
              viewAs="creditor"
            />
          ))}
        </section>
      )}

      {awaitingMyConfirm.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Confirm payments received</h2>
          <p className="text-sm text-muted-foreground">
            Someone marked that they paid you. Confirm only after you receive the money.
          </p>
          {awaitingMyConfirm.map((s) => (
            <RoomSettlementCard
              key={s.id}
              fromName={getMemberName(s.fromMemberKey)}
              toName={getMemberName(s.toMemberKey)}
              amount={s.amount}
              currency={currency}
              status={s.status}
              viewAs="creditor"
              onConfirmReceived={() =>
                handleConfirm(
                  s.id,
                  getMemberName(s.fromMemberKey),
                  s.amount
                )
              }
              confirming={busyId === s.id}
            />
          ))}
        </section>
      )}

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
                currency={currency}
                status={c.status}
                viewAs="other"
              />
            ))}
          </CardContent>
        </Card>
      )}

      {othersOpen.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Other balances</h2>
          {othersOpen.map((s) => (
            <RoomSettlementCard
              key={s.id}
              fromName={getMemberName(s.fromMemberKey)}
              toName={getMemberName(s.toMemberKey)}
              amount={s.amount}
              currency={currency}
              status={s.status}
              viewAs="other"
            />
          ))}
        </section>
      )}

      {settledSettlements.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Settled this cycle
          </h2>
          {settledSettlements.map((s) => (
            <RoomSettlementCard
              key={s.id}
              fromName={getMemberName(s.fromMemberKey)}
              toName={getMemberName(s.toMemberKey)}
              amount={s.amount}
              currency={currency}
              status={s.status}
              viewAs="other"
            />
          ))}
        </section>
      )}

      {displaySettlements.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleSaveCarryForward}>
            Save to carry forward
          </Button>
        </div>
      )}
    </div>
  );
}
