export type MemberRole = 'owner' | 'editor' | 'viewer';
export type InviteStatus = 'accepted' | 'pending';

export interface TripMember {
  id: string;
  tripId: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  role: MemberRole;
  inviteStatus: InviteStatus;
  birthday?: string; // YYYY-MM-DD
  googleCalendarBirthdayEventId?: string;
}
