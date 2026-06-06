import { Timestamp } from 'firebase/firestore';

export const TRIP_AUDIT_ACTIONS = [
  'expense.created',
  'expense.updated',
  'expense.deleted',
  'pack_item.created',
  'pack_item.updated',
  'pack_item.packed',
  'pack_item.deleted',
  'pack_item.batch_created',
  'plan.updated',
  'plan.reset',
  'member.invited',
  'member.removed',
] as const;

export type TripAuditAction = (typeof TRIP_AUDIT_ACTIONS)[number];

export type TripAuditEntityType =
  | 'expense'
  | 'pack_item'
  | 'plan'
  | 'member';

export interface TripAuditLog {
  id: string;
  tripId: string;
  action: TripAuditAction;
  entityType: TripAuditEntityType;
  entityId?: string;
  actorUid: string;
  actorName: string;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: Timestamp;
}

export type CreateTripAuditLogInput = Omit<TripAuditLog, 'id' | 'createdAt'>;
