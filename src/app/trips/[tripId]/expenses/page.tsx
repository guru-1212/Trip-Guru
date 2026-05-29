'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { TripPageShell } from '@/components/trips/TripPageShell';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseFilters } from '@/components/expenses/ExpenseFilters';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAppSelector, useAppDispatch } from '@/store';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/hooks/useAuth';
import { deleteExpenseThunk } from '@/features/expenses/expensesThunks';
import { Receipt } from 'lucide-react';

export default function TripExpensesPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  return (
    <TripPageShell tripId={tripId}>
      <ExpensesContent tripId={tripId} />
    </TripPageShell>
  );
}

function ExpensesContent({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();
  const { uid } = useAuth();
  const trip = useAppSelector((s) => s.trips.currentTrip);
  const members = useAppSelector((s) => s.trips.members);
  const { expenses } = useExpenses();

  const isOwner = trip?.createdBy === uid;
  const canDelete = isOwner || members.some(
    (m) => m.userId === uid && (m.role === 'owner' || m.role === 'editor')
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Expenses</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add expense</DialogTitle>
            </DialogHeader>
            {uid && (
              <ExpenseForm
                tripId={tripId}
                members={members}
                createdBy={uid}
                onSuccess={() => setOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <ExpenseFilters members={members} />

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses"
          description="Add your first expense to start tracking."
          actionLabel="Add expense"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {expenses.map((e, i) => (
            <ExpenseCard
              key={e.id}
              expense={e}
              members={members}
              currency={trip?.currency ?? 'INR'}
              canDelete={canDelete}
              onDelete={(id) => dispatch(deleteExpenseThunk(id))}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
