export type ConnectionPlatform = 'twitter' | 'linkedin' | 'instagram' | 'facebook' | 'other';

export type ConnectionStatus = 'connected' | 'disconnected' | 'error';

export interface Connection {
  id: string;
  platform: ConnectionPlatform;
  label: string;
  handle: string;
  status: ConnectionStatus;
  createdAt: string;
  lastSyncAt?: string;
}