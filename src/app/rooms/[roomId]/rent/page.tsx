'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RoomPageShell } from '@/components/rooms/RoomPageShell';
import { useAppSelector } from '@/store';
import {
  getRentPayments,
  initRentPayments,
  markRentPaid,
  setRentPaymentAmount,
} from '@/firebase/firestore';
import { RentPayment } from '@/types/roomSettlement';
import { getMemberKey } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function RoomRentPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  return (
    <RoomPageShell roomId={roomId}>
      <RentContent roomId={roomId} />
    </RoomPageShell>
  );
}

function RentContent({ roomId }: { roomId: string }) {
  const room = useAppSelector((s) => s.rooms.currentRoom);
  const cycle = useAppSelector((s) => s.rooms.activeCycle);
  const members = useAppSelector((s) =>
    s.rooms.members.filter((m) => m.inviteStatus === 'accepted')
  );
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [totalRent, setTotalRent] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!cycle) return;
    setLoading(true);
    const data = await getRentPayments(roomId, cycle.id);
    setPayments(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [roomId, cycle?.id]);

  const setupRent = async () => {
    if (!cycle || !totalRent) return;
    const total = parseFloat(totalRent);
    const perMember = total / members.length;
    await initRentPayments(
      roomId,
      cycle.id,
      members.map((m) => ({
        memberKey: getMemberKey(m),
        amount: Math.round(perMember * 100) / 100,
      }))
    );
    await load();
  };

  const paid = payments.filter((p) => p.status === 'paid');
  const pending = payments.filter((p) => p.status === 'pending');
  const totalAmount = payments.reduce((s, p) => s + p.amount, 0);
  const paidAmount = paid.reduce((s, p) => s + p.amount, 0);

  const getName = (key: string) =>
    members.find((m) => getMemberKey(m) === key)?.name ?? key;

  return (
    <div className="space-y-6">
      {payments.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Initialize monthly rent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Total rent ({room?.currency ?? 'INR'})</Label>
              <Input
                type="number"
                placeholder="28000"
                value={totalRent}
                onChange={(e) => setTotalRent(e.target.value)}
              />
            </div>
            <Button onClick={setupRent} disabled={!totalRent || members.length === 0}>
              Split equally among {members.length} members
            </Button>
          </CardContent>
        </Card>
      )}

      {payments.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-bold text-muted-foreground">Total</p>
                <p className="text-xl font-black">
                  {room?.currency} {totalAmount.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-bold text-muted-foreground">Paid</p>
                <p className="text-xl font-black text-green-600">
                  {room?.currency} {paidAmount.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-bold text-muted-foreground">Pending</p>
                <p className="text-xl font-black text-amber-600">
                  {room?.currency}{' '}
                  {(totalAmount - paidAmount).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {payments.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold">{getName(p.memberKey)}</p>
                    <p className="text-sm text-muted-foreground">
                      {room?.currency} {p.amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={p.status === 'paid' ? 'default' : 'secondary'}
                    >
                      {p.status}
                    </Badge>
                    {p.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          await markRentPaid(p.id);
                          await load();
                        }}
                      >
                        Mark paid
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Adjust member share</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.map((m) => {
                const key = getMemberKey(m);
                const payment = payments.find((p) => p.memberKey === key);
                return (
                  <div key={key} className="flex gap-2 items-center">
                    <span className="text-sm font-bold w-24">{m.name}</span>
                    <Input
                      type="number"
                      className="max-w-[120px]"
                      defaultValue={payment?.amount ?? 0}
                      onBlur={async (e) => {
                        if (!cycle) return;
                        const amt = parseFloat(e.target.value);
                        await setRentPaymentAmount(roomId, cycle.id, key, amt);
                        await load();
                      }}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}

      {!loading && payments.length === 0 && members.length === 0 && (
        <p className="text-muted-foreground">Add members to track rent.</p>
      )}
    </div>
  );
}
