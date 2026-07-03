'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { FileDown, Sheet } from 'lucide-react';
import { TripPageShell } from '@/components/trips/TripPageShell';
import { BudgetGauge } from '@/components/analytics/BudgetGauge';

const chartLoading = () => (
  <div className="h-64 rounded-2xl bg-muted/40 animate-pulse" />
);
const CategoryPieChart = dynamic(
  () => import('@/components/analytics/CategoryPieChart').then((m) => m.CategoryPieChart),
  { ssr: false, loading: chartLoading }
);
const DailyBarChart = dynamic(
  () => import('@/components/analytics/DailyBarChart').then((m) => m.DailyBarChart),
  { ssr: false, loading: chartLoading }
);
const MemberContribution = dynamic(
  () => import('@/components/analytics/MemberContribution').then((m) => m.MemberContribution),
  { ssr: false, loading: chartLoading }
);
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/store';
import { useExpenses } from '@/hooks/useExpenses';
import { exportTripExpensesPDF } from '@/lib/exportPDF';
import { exportTripExpensesExcel } from '@/lib/exportExcel';

export default function TripAnalyticsPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  return (
    <TripPageShell tripId={tripId}>
      <AnalyticsContent tripId={tripId} />
    </TripPageShell>
  );
}

function AnalyticsContent({ tripId }: { tripId: string }) {
  const trip = useAppSelector((s) => s.trips.currentTrip);
  const members = useAppSelector((s) => s.trips.members);
  const { allExpenses, totalSpent, totalPlanned } = useExpenses();
  const [viewType, setViewType] = useState<'actual' | 'planned'>('actual');

  if (!trip) return null;

  const expensesToDisplay = allExpenses.filter(e => (e.expenseType || 'actual') === viewType);

  const handleExportPDF = () => {
    exportTripExpensesPDF(trip, allExpenses, members).catch((err) =>
      console.error('PDF export failed:', err)
    );
  };

  const handleExportExcel = () => {
    exportTripExpensesExcel(trip, allExpenses, members).catch((err) =>
      console.error('Excel export failed:', err)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-2" /> Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Sheet className="h-4 w-4 mr-2" /> Export Excel
          </Button>
        </div>

        <div className="bg-muted p-1 rounded-lg flex gap-1">
          <Button 
            variant={viewType === 'actual' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 text-xs"
            onClick={() => setViewType('actual')}
          >
            Real Expenses
          </Button>
          <Button 
            variant={viewType === 'planned' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 text-xs"
            onClick={() => setViewType('planned')}
          >
            Planned (Draft)
          </Button>
        </div>
      </div>

      <BudgetGauge
        expected={trip.expectedBudget}
        spent={totalSpent}
        planned={totalPlanned}
        currency={trip.currency}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryPieChart expenses={expensesToDisplay} />
        <DailyBarChart expenses={expensesToDisplay} />
      </div>

      <MemberContribution expenses={expensesToDisplay} members={members} />
    </div>
  );
}
