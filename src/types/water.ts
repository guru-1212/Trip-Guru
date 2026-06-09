export interface WaterScheduleSlot {
  /** 24h format, e.g. "08:00" */
  time: string;
  amountGym: number;
  amountRest: number;
  label: string;
  note: string;
}

export interface WaterSettings {
  dailyGoalRest: number;
  dailyGoalGym: number;
  notificationsEnabled: boolean;
  /** User explicitly turned off water reminders on the water page */
  waterRemindersOptOut?: boolean;
  /** IANA timezone, e.g. "Asia/Kolkata" */
  timezone: string;
  schedule: WaterScheduleSlot[];
  /** Prevents duplicate streak milestone pushes */
  lastStreakMilestone?: number;
}

export interface WaterIntakeEntry {
  id: string;
  /** ISO time string or HH:mm in local timezone */
  time: string;
  amount: number;
  note?: string;
}

export interface WaterLogDoc {
  intakes: WaterIntakeEntry[];
  totalMl: number;
  goalMl: number;
  completed: boolean;
}

export type WaterReminderType =
  | 'scheduled'
  | 'behind_pace'
  | 'post_gym'
  | 'goal_complete'
  | 'streak_milestone';

export type WaterReminderStatus = 'pending' | 'sent' | 'cancelled';

export interface WaterReminderPayload {
  title: string;
  body: string;
  url: string;
}

export interface WaterReminderDoc {
  type: WaterReminderType;
  sendAt: unknown;
  status: WaterReminderStatus;
  localDate: string;
  payload?: WaterReminderPayload;
}

export type PaceStatus = 'ahead' | 'on_track' | 'behind';

export type ScheduleSlotState = 'done' | 'next' | 'upcoming';

export interface ScheduleSlotWithState extends WaterScheduleSlot {
  state: ScheduleSlotState;
  amount: number;
}

export interface NextReminderInfo {
  slot: ScheduleSlotWithState | null;
  minutesUntil: number | null;
}

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const DEFAULT_DAILY_GOAL_REST = 3000;
export const DEFAULT_DAILY_GOAL_GYM = 3500;

export const STREAK_MILESTONES = [3, 7, 14, 30] as const;
