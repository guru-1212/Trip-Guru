import { Timestamp } from 'firebase/firestore';

export type YogaDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface YogaPose {
  id: string;
  name: string;
  sanskritName?: string;
  imageUrl?: string;
  instructions: string[];
  benefits: string[];
  difficulty: YogaDifficulty;
  targetAreas: string[]; // e.g., 'hips', 'back', 'shoulders'
}

export interface YogaFlowItem {
  poseId: string;
  poseName: string;
  durationSeconds: number;
  imageUrl?: string;
}

export interface YogaFlow {
  id: string;
  name: string;
  description: string;
  difficulty: YogaDifficulty;
  estimatedMinutes: number;
  poses: YogaFlowItem[];
  imageUrl?: string;
  createdAt?: Timestamp;
}

export interface YogaSessionLog {
  id: string;
  uid: string;
  date: string; // ISO format or YYYY-MM-DD
  flowId?: string;
  flowName?: string;
  durationMinutes: number;
  completedPosesCount: number;
  notes?: string;
  createdAt: Timestamp;
}

export interface MeditationLog {
  id: string;
  uid: string;
  date: string;
  durationMinutes: number;
  type: string; // e.g., 'mindfulness', 'breathwork', 'guided'
  notes?: string;
  createdAt: Timestamp;
}

export interface PosturePhotoLog {
  id: string;
  uid: string;
  poseId: string;
  poseName: string;
  date: string;
  imageUrl: string;
  notes?: string;
  createdAt: Timestamp;
}

export interface YogaMate {
  id: string;
  ownerId: string;
  partnerId?: string;
  partnerEmail: string;
  partnerName: string;
  inviteStatus: 'pending' | 'accepted';
  invitedBy: string;
}
