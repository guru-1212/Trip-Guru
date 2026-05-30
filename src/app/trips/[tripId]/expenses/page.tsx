'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Receipt, LayoutDashboard, Calculator, History } from 'lucide-react';
import { TripPageShell } from '@/components/trips/TripPageShell';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseFilters } from '@/components/expenses/ExpenseFilters';
import { ComparisonOverview } from '@/components/expenses/ComparisonOverview';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAppSelector, useAppDispatch } from '@/store';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/hooks/useAuth';
import { deleteExpenseThunk } from '@/features/expenses/expensesThunks';
import { setFilters } from '@/features/expenses/expensesSlice';
import { Expense } from '@/types/expense';

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
  const [activeTab, setActiveTab] = useState('actual');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const dispatch = useAppDispatch();
  const { uid } = useAuth();
  const trip = useAppSelector((s) => s.trips.currentTrip);
  const members = useAppSelector((s) => s.trips.members);
  const { expenses, allExpenses } = useExpenses();

  useEffect(() => {
    if (activeTab === 'actual' || activeTab === 'planned') {
      dispatch(setFilters({ expenseType: activeTab as any }));
    }
  }, [activeTab, dispatch]);

  const isOwner = trip?.createdBy === uid;
  const canDelete = isOwner || members.some(
    (m) => m.userId === uid && (m.role === 'owner' || m.role === 'editor')
  );

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setOpen(true);
  };

  const handleConvert = (expense: Expense) => {
    setEditingExpense({ ...expense, expenseType: 'actual' });
    setOpen(true);
  };

  const handleAddClick = () => {
    setEditingExpense(null);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Expense Tracker</h2>
        <Dialog open={open} onOpenChange={(val) => {
          setOpen(val);
          if (!val) setEditingExpense(null);
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" /> Add {activeTab === 'planned' ? 'Assumption' : 'Expense'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingExpense 
                  ? (editingExpense.id ? 'Edit Expense' : 'Convert to Actual Expense') 
                  : 'Add expense'}
              </DialogTitle>
            </DialogHeader>
            {uid && (
              <ExpenseForm
                tripId={tripId}
                members={members}
                createdBy={uid}
                initialData={editingExpense || (activeTab === 'planned' ? { expenseType: 'planned' } : { expenseType: 'actual' })}
                onSuccess={() => setOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50">
          <TabsTrigger value="actual" className="py-2">
            <History className="h-4 w-4 mr-2" />
            Real
          </TabsTrigger>
          <TabsTrigger value="planned" className="py-2">
            <Calculator className="h-4 w-4 mr-2" />
            Planned
          </TabsTrigger>
          <TabsTrigger value="overview" className="py-2">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="actual" className="space-y-4 m-0">
            <ExpenseFilters members={members} />
            {expenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No real expenses"
                description="Keep track of your actual spending here."
                actionLabel="Add expense"
                onAction={handleAddClick}
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
                    onEdit={handleEdit}
                    index={i}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="planned" className="space-y-4 m-0">
            <p className="text-sm text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/20">
              💡 Use this space to plan your budget before you spend. You can later "mark as real" to track it accurately.
            </p>
            {expenses.length === 0 ? (
              <EmptyState
                icon={Calculator}
                title="No assumptions set"
                description="Start planning your trip budget by adding estimated costs."
                actionLabel="Add assumption"
                onAction={handleAddClick}
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
                    onEdit={handleEdit}
                    onConvert={handleConvert}
                    index={i}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="overview" className="m-0">
            <ComparisonOverview 
              expenses={allExpenses} 
              currency={trip?.currency ?? 'INR'} 
              tripId={tripId}
              expectedBudget={trip?.expectedBudget ?? 0}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
