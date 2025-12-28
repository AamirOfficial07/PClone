export type WorkflowStatus = 'draft' | 'active' | 'paused';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  createdAt: string;
  lastRunAt?: string;
}