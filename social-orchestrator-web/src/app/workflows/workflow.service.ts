import { Injectable } from '@angular/core';
import { Workflow, WorkflowStatus } from '../core/models/workflow';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private workflows: Workflow[] = [
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

  create(input: { name: string; description: string; status: WorkflowStatus }): Workflow {
    const trimmedName = input.name.trim();
    const trimmedDescription = input.description.trim();

    const baseId =
      trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'workflow';

    let candidateId = baseId;
    let suffix = 1;

    while (this.workflows.some((workflow) => workflow.id === candidateId)) {
      candidateId = `${baseId}-${suffix++}`;
    }

    const now = new Date().toISOString();

    const workflow: Workflow = {
      id: candidateId,
      name: trimmedName,
      description: trimmedDescription,
      status: input.status,
      createdAt: now
    };

    this.workflows = [...this.workflows, workflow];

    return workflow;
  }

  update(
    id: string,
    changes: { name: string; description: string; status: WorkflowStatus }
  ): Workflow | undefined {
    const index = this.workflows.findIndex((workflow) => workflow.id === id);

    if (index === -1) {
      return undefined;
    }

    const current = this.workflows[index];

    const updated: Workflow = {
      ...current,
      name: changes.name.trim(),
      description: changes.description.trim(),
      status: changes.status
    };

    this.workflows = [
      ...this.workflows.slice(0, index),
      updated,
      ...this.workflows.slice(index + 1)
    ];

    return updated;
  }
}