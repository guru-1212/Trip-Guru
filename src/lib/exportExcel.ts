import { Expense } from '@/types/expense';
import { Trip } from '@/types/trip';
import { TripMember } from '@/types/member';
import dayjs from 'dayjs';

export async function exportTripExpensesExcel(
  trip: Trip,
  expenses: Expense[],
  members: TripMember[]
): Promise<void> {
  const XLSX = await import('xlsx');
  const memberMap = new Map(
    members.map((m) => [m.userId ?? m.id, m.name])
  );

  const rows = expenses.map((e) => ({
    Date: dayjs(e.createdAt.toDate()).format('YYYY-MM-DD'),
    Category: e.category,
    'Paid By': memberMap.get(e.paidBy ?? '') ?? e.paidBy ?? 'N/A',
    Amount: e.amount,
    'Split Type': e.splitType,
    Note: e.note,
  }));

  const summary = [
    { Metric: 'Trip', Value: trip.tripName },
    { Metric: 'Destination', Value: trip.destination },
    { Metric: 'Total Spent', Value: expenses.reduce((s, e) => s + e.amount, 0) },
    { Metric: 'Currency', Value: trip.currency },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Expenses');
  XLSX.writeFile(wb, `${trip.tripName.replace(/\s+/g, '_')}_expenses.xlsx`);
}
