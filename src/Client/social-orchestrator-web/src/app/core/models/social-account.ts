export enum SocialNetworkType {
  Facebook = 1,
  Instagram = 2,
  Twitter = 3,
  LinkedIn = 4
}

export interface SocialAccountSummary {
  id: string;
  networkType: SocialNetworkType;
  name: string;
  username?: string | null;
  isActive: boolean;
  requiresReauthorization: boolean;
}