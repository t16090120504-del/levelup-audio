export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface Favorite {
  seriesId: string;
  createdAt: string;
}

export interface ListeningProgress {
  episodeId: string;
  positionSeconds: number;
  completed: boolean;
  lastPlayedAt: string;
}

export interface UserSubscription {
  isActive: boolean;
  productId?: string;
  expiresAt?: string;
  isTrial?: boolean;
}
