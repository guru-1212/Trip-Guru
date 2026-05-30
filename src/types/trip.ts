import { Timestamp } from 'firebase/firestore';

export type TripType =
  | 'friends'
  | 'family'
  | 'office'
  | 'bike_ride'
  | 'trekking'
  | 'custom';

export type TripStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';

export interface Trip {
  tripId: string;
  tripName: string;
  tripType: TripType;
  createdBy: string;
  destination: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: TripStatus;
  expectedBudget: number;
  currency: string;
  membersCount: number;
  createdAt: Timestamp;
  category?: string;
  classification?: 'real' | 'test';
  customExpenseCategories?: string[];
}
