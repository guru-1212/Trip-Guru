export interface RoomMember {
  id: string;
  roomId: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'editor' | 'viewer';
  inviteStatus: 'accepted' | 'pending';
}
