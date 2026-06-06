import { createTripAuditLog } from '@/firebase/tripAuditLog.firestore';
import {
  CreateTripAuditLogInput,
  TripAuditAction,
  TripAuditEntityType,
} from '@/types/tripAuditLog';

export interface RecordTripAuditParams {
  tripId: string;
  action: TripAuditAction;
  entityType: TripAuditEntityType;
  entityId?: string;
  actorUid: string;
  actorName: string;
  summary: string;
  metadata?: CreateTripAuditLogInput['metadata'];
}

/** Writes an append-only audit entry; failures are logged and do not block the main action. */
export async function recordTripAuditLog(
  params: RecordTripAuditParams
): Promise<void> {
  try {
    await createTripAuditLog({
      tripId: params.tripId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      actorUid: params.actorUid,
      actorName: params.actorName,
      summary: params.summary,
      metadata: params.metadata,
    });
  } catch (err) {
    console.error('Failed to record trip audit log:', err);
  }
}

export function formatTripExpenseAuditSummary(
  action: 'expense.created' | 'expense.updated' | 'expense.deleted',
  actorName: string,
  category: string,
  amount: number,
  currency: string
): string {
  const amountStr = `${currency} ${amount.toLocaleString()}`;
  switch (action) {
    case 'expense.created':
      return `${actorName} added expense "${category}" (${amountStr})`;
    case 'expense.updated':
      return `${actorName} updated expense "${category}" (${amountStr})`;
    case 'expense.deleted':
      return `${actorName} deleted expense "${category}" (${amountStr})`;
  }
}
