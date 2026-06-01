import { Timestamp } from 'firebase/firestore';

export const ROOM_AUDIT_ACTIONS = [
  'room.created',
  'expense.created',
  'expense.updated',
  'expense.deleted',
  'member.invited',
  'member.removed',
  'settlement.saved',
  'settlement.marked_paid',
  'settlement.payment_claimed',
  'settlement.payment_confirmed',
  'rent.initialized',
  'rent.paid',
  'rent.amount_updated',
  'cycle.closed',
  'bring_item.created',
  'bring_item.updated',
  'bring_item.brought',
  'bring_item.deleted',
] as const;

export type RoomAuditAction = (typeof ROOM_AUDIT_ACTIONS)[number];

export type RoomAuditEntityType =
  | 'room'
  | 'expense'
  | 'member'
  | 'settlement'
  | 'rent'
  | 'cycle'
  | 'bring_item';

export interface RoomAuditLog {
  id: string;
  roomId: string;
  cycleId?: string;
  action: RoomAuditAction;
  entityType: RoomAuditEntityType;
  entityId?: string;
  actorUid: string;
  actorName: string;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: Timestamp;
}

export type CreateRoomAuditLogInput = Omit<
  RoomAuditLog,
  'id' | 'createdAt'
>;
