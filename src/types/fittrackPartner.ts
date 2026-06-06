export type FitTrackInviteStatus = 'accepted' | 'pending';

export interface FitTrackPartner {
  id: string;
  ownerId: string;
  partnerId: string | null;
  partnerEmail: string;
  partnerName: string;
  inviteStatus: FitTrackInviteStatus;
  invitedBy: string;
}

export interface FitTrackInvitation {
  partner: FitTrackPartner;
  ownerName: string;
  invitedByName: string | null;
}
