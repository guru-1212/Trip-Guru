import { createRoomAuditLog } from '@/firebase/roomAuditLog.firestore';
import {
  CreateRoomAuditLogInput,
  RoomAuditAction,
  RoomAuditEntityType,
} from '@/types/roomAuditLog';

export interface RecordRoomAuditParams {
  roomId: string;
  cycleId?: string;
  action: RoomAuditAction;
  entityType: RoomAuditEntityType;
  entityId?: string;
  actorUid: string;
  actorName: string;
  summary: string;
  metadata?: CreateRoomAuditLogInput['metadata'];
}

/** Writes an append-only audit entry; failures are logged and do not block the main action. */
export async function recordRoomAuditLog(
  params: RecordRoomAuditParams
): Promise<void> {
  try {
    await createRoomAuditLog({
      roomId: params.roomId,
      cycleId: params.cycleId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      actorUid: params.actorUid,
      actorName: params.actorName,
      summary: params.summary,
      metadata: params.metadata,
    });
  } catch (err) {
    console.error('Failed to record room audit log:', err);
  }
}

export function formatExpenseAuditSummary(
  action: 'expense.created' | 'expense.updated' | 'expense.deleted',
  actorName: string,
  title: string,
  amount: number,
  currency: string
): string {
  const amountStr = `${currency} ${amount.toLocaleString()}`;
  switch (action) {
    case 'expense.created':
      return `${actorName} added expense "${title}" (${amountStr})`;
    case 'expense.updated':
      return `${actorName} updated expense "${title}" (${amountStr})`;
    case 'expense.deleted':
      return `${actorName} deleted expense "${title}" (${amountStr})`;
  }
}
