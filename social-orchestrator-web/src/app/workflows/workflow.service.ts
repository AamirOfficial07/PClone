import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Workflow, WorkflowStatus } from '../core/models/workflow';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  private readonly workflowsSubject = new BehaviorSubject<Workflow[]>([
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
  ]);

  readonly workflows$: Observable<Workflow[]> = this.workflowsSubject.asObservable();

  private getSnapshot(): Workflow[] {
    return this.workflowsSubject.value;
  }

  getAll(): Observable<Workflow[]> {
    return this.workflows$;
  }

  getById(id: string): Workflow | undefined {
    return this.getSnapshot().find((workflow) => workflow.id === id);
  }

  create(input: { name: string; description: string; status: WorkflowStatus }): Workflow {
    const trimmedName = input.name.trim();
    const trimmedDescription = input.description.trim();

    const baseId =
      trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'workflow';

    const current = this.getSnapshot();

    let candidateId = baseId;
    let suffix = 1;

    while (current.some((workflow) => workflow.id === candidateId)) {
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

    this.workflowsSubject.next([...current, workflow]);

    return workflow;
  }

  update(
    id: string,
    changes: { name: string; description: string; status: WorkflowStatus }
  ): Workflow | undefined {
    const current = this.getSnapshot();
    const index = current.findIndex((workflow) => workflow.id === id);

    if (index === -1) {
      return undefined;
    }

    const existing = current[index];

    const updated: Workflow = {
      ...existing,
      name: changes.name.trim(),
      description: changes.description.trim(),
      status: changes.status
    };

    const next = [...current];
    next[index] = updated;

    this.workflowsSubject.next(next);

    return updated;
  }

  delete(id: string): boolean {
    const current = this.getSnapshot();
    const next = current.filter((workflow) => workflow.id !== id);

    if (next.length === current.length) {
      return false;
    }

    this.workflowsSubject.next(next);
    return true;
  }
}