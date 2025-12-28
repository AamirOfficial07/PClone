import { Workflow, WorkflowStatus } from '../models/workflow';
import { Connection, ConnectionPlatform, ConnectionStatus } from '../models/connection';

/**
 * Workflow API contract
 */

export type WorkflowListResponse = Workflow[];

export interface WorkflowCreateRequest {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  createdAt: string;
  lastRunAt?: string;
}

export type WorkflowCreateResponse = Workflow;

export interface WorkflowUpdateRequest {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  createdAt: string;
  lastRunAt?: string;
}

export type WorkflowUpdateResponse = Workflow;

/**
 * Connection API contract
 */

export type ConnectionListResponse = Connection[];

export interface ConnectionCreateRequest {
  id: string;
  platform: ConnectionPlatform;
  label: string;
  handle: string;
  status: ConnectionStatus;
  createdAt: string;
  lastSyncAt?: string;
}

export type ConnectionCreateResponse = Connection;

export interface ConnectionUpdateRequest {
  id: string;
  platform: ConnectionPlatform;
  label: string;
  handle: string;
  status: ConnectionStatus;
  createdAt: string;
  lastSyncAt?: string;
}

export type ConnectionUpdateResponse = Connection;

/**
 * Health API contract
 */

export interface HealthResponse {
  ok: boolean;
  version?: string;
}