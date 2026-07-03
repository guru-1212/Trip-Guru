import { Expense } from '@/types/expense';
import { Trip } from '@/types/trip';
import { TripMember } from '@/types/member';
import dayjs from 'dayjs';

export async function exportTripExpensesPDF(
  trip: Trip,
  expenses: Expense[],
  members: TripMember[]
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF();
  const memberMap = new Map(
    members.map((m) => [m.userId ?? m.id, m.name])
  );

  doc.setFontSize(18);
  doc.text(`TripMate — ${trip.tripName}`, 14, 20);
  doc.setFontSize(11);
  doc.text(`Destination: ${trip.destination}`, 14, 28);
  doc.text(`Currency: ${trip.currency}`, 14, 34);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  doc.text(`Total spent: ${trip.currency} ${total.toFixed(2)}`, 14, 40);

  autoTable(doc, {
    startY: 48,
    head: [['Date', 'Category', 'Paid By', 'Amount', 'Note']],
    body: expenses.map((e) => [
      dayjs(e.createdAt.toDate()).format('DD MMM YYYY'),
      e.category,
      memberMap.get(e.paidBy ?? '') ?? e.paidBy ?? 'N/A',
      `${trip.currency} ${e.amount.toFixed(2)}`,
      e.note || '—',
    ]),
  });

  doc.save(`${trip.tripName.replace(/\s+/g, '_')}_expenses.pdf`);
}
