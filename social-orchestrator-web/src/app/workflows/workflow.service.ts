import { Injectable } from '@angular/core';
import { Workflow } from '../core/models/workflow';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private readonly workflows: Workflow[] = [
    {
      id: 'welcome-sequence',
      name: 'New follower welcome sequence',
      description: 'Sends a friendly welcome DM and highlights our top resources.',
      status: 'active',
      createdAt: '2025-01-01T10:00:00.000Z',
      lastRunAt: '2025-01-04T15:30:00.000Z'
    },
    {
      id: 'weekly-digest',
      name: 'Weekly content digest',
      description: 'Publishes a curated digest across LinkedIn and Twitter every Friday.',
      status: 'paused',
      createdAt: '2025-01-02T09:15:00.000Z',
      lastRunAt: '2025-01-03T17:45:00.000Z'
    },
    {
      id: 'launch-campaign',
      name: 'Product launch campaign',
      description: 'Coordinates a multi-week campaign for the next product launch.',
      status: 'draft',
      createdAt: '2025-01-05T12:00:00.000Z'
    }
  ];

  getAll(): Workflow[] {
    return this.workflows;
  }

  getById(id: string): Workflow | undefined {
    return this.workflows.find((workflow) => workflow.id === id);
  }
}