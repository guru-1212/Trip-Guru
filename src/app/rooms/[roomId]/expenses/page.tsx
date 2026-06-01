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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { deleteRoomExpenseThunk } from '@/features/roomExpenses/roomExpensesThunks';
import { useAppDispatch } from '@/store';
import { RoomExpense } from '@/types/roomExpense';

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
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RoomExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<RoomExpense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const getName = (key: string) =>
    members.find((m) => m.id === key || m.userId === key)?.name ?? key;

  const canManage = (expense: RoomExpense) => !!uid && expense.createdBy === uid;

  const handleAddClick = () => {
    setEditingExpense(null);
    setFormOpen(true);
  };

  const handleEdit = (expense: RoomExpense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await dispatch(deleteRoomExpenseThunk(expenseToDelete.id)).unwrap();
      setExpenseToDelete(null);
    } catch (e) {
      setDeleteError(
        typeof e === 'string' ? e : (e as Error).message ?? 'Failed to delete expense'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Expenses</h2>
        {cycle && uid && (
          <Dialog
            open={formOpen}
            onOpenChange={(open) => {
              setFormOpen(open);
              if (!open) setEditingExpense(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={handleAddClick}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingExpense ? 'Edit expense' : 'New expense'}
                </DialogTitle>
              </DialogHeader>
              <RoomExpenseForm
                roomId={roomId}
                cycleId={cycle.id}
                members={members}
                createdBy={uid}
                initialData={editingExpense ?? undefined}
                onSuccess={() => {
                  setFormOpen(false);
                  setEditingExpense(null);
                }}
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
              <div className="text-right flex flex-col items-end gap-1">
                <p className="font-black">
                  {room?.currency ?? 'INR'} {e.amount.toLocaleString()}
                </p>
                {canManage(e) && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(e)}
                      title="Edit expense"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-danger"
                      onClick={() => {
                        setDeleteError('');
                        setExpenseToDelete(e);
                      }}
                      title="Delete expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
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

      <Dialog
        open={!!expenseToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setExpenseToDelete(null);
            setDeleteError('');
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete expense?</DialogTitle>
            <DialogDescription>
              {expenseToDelete
                ? `This will permanently remove "${expenseToDelete.title}" (${room?.currency ?? 'INR'} ${expenseToDelete.amount.toLocaleString()}). This cannot be undone.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-danger text-sm">{deleteError}</p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setExpenseToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
