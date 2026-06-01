'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { RoomPageShell } from '@/components/rooms/RoomPageShell';
import { RoomExpenseForm } from '@/components/rooms/RoomExpenseForm';
import { useAppSelector } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import dayjs from 'dayjs';
import { deleteRoomExpenseThunk } from '@/features/roomExpenses/roomExpensesThunks';
import { useAppDispatch } from '@/store';

export default function RoomExpensesPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  return (
    <RoomPageShell roomId={roomId}>
      <ExpensesContent roomId={roomId} />
    </RoomPageShell>
  );
}

function ExpensesContent({ roomId }: { roomId: string }) {
  const { uid } = useAuth();
  const dispatch = useAppDispatch();
  const members = useAppSelector((s) => s.rooms.members);
  const cycle = useAppSelector((s) => s.rooms.activeCycle);
  const expenses = useAppSelector((s) => s.roomExpenses.expenses);
  const room = useAppSelector((s) => s.rooms.currentRoom);
  const [open, setOpen] = useState(false);

  const getName = (key: string) =>
    members.find((m) => m.id === key || m.userId === key)?.name ?? key;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Expenses</h2>
        {cycle && uid && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New expense</DialogTitle>
              </DialogHeader>
              <RoomExpenseForm
                roomId={roomId}
                cycleId={cycle.id}
                members={members}
                createdBy={uid}
                onSuccess={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {expenses.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-4 flex justify-between items-start gap-4">
              <div>
                <p className="font-bold">{e.title}</p>
                <p className="text-sm text-muted-foreground">
                  {e.category} · Paid by {getName(e.paidBy)} ·{' '}
                  {e.expenseDate
                    ? dayjs(e.expenseDate.toDate()).format('D MMM YYYY')
                    : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="font-black">
                  {room?.currency ?? 'INR'} {e.amount.toLocaleString()}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  onClick={() => dispatch(deleteRoomExpenseThunk(e.id))}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {expenses.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No expenses this cycle yet.
          </p>
        )}
      </div>
    </div>
  );
}
