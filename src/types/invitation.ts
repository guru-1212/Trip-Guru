import { Trip } from './trip';
import { TripMember } from './member';
import { User } from './user';

export interface TripInvitation {
  member: TripMember;
  trip: Trip;
  invitedBy: User | null;
}
