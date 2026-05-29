'use client';

import { useParams } from 'next/navigation';
import { FileDown, Sheet } from 'lucide-react';
import { TripPageShell } from '@/components/trips/TripPageShell';
import { BudgetGauge } from '@/components/analytics/BudgetGauge';
import { CategoryPieChart } from '@/components/analytics/CategoryPieChart';
import { DailyBarChart } from '@/components/analytics/DailyBarChart';
import { MemberContribution } from '@/components/analytics/MemberContribution';
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
  const { allExpenses, totalSpent } = useExpenses();

  if (!trip) return null;

  const handleExportPDF = () => {
    exportTripExpensesPDF(trip, allExpenses, members);
  };

  const handleExportExcel = () => {
    exportTripExpensesExcel(trip, allExpenses, members);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleExportPDF}>
          <FileDown className="h-4 w-4 mr-2" /> Export PDF
        </Button>
        <Button variant="outline" onClick={handleExportExcel}>
          <Sheet className="h-4 w-4 mr-2" /> Export Excel
        </Button>
      </div>

      <BudgetGauge
        expected={trip.expectedBudget}
        spent={totalSpent}
        currency={trip.currency}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryPieChart expenses={allExpenses} />
        <DailyBarChart expenses={allExpenses} />
      </div>

      <MemberContribution expenses={allExpenses} members={members} />
    </div>
  );
}
