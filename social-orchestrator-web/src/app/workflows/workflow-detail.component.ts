import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NotificationService } from '../core/services/notification.service';
import { Workflow } from '../core/models/workflow';
import { WorkflowService } from './workflow.service';

@Component({
  selector: 'app-workflow-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="workflow-detail" *ngIf="workflow; else notFound">
      <a routerLink="/workflows" class="workflow-detail__back">
        ← Back to workflows
      </a>

      <header class="workflow-detail__header">
        <div>
          <h1>{{ workflow.name }}</h1>
          <p class="workflow-detail__description">
            {{ workflow.description }}
          </p>
        </div>
        <div class="workflow-detail__actions">
          <span
            class="workflow-detail__status tag"
            [class.workflow-detail__status--active]="workflow.status === 'active'"
            [class.workflow-detail__status--paused]="workflow.status === 'paused'"
            [class.workflow-detail__status--draft]="workflow.status === 'draft'"
          >
            {{ workflow.status }}
          </span>
          <div class="workflow-detail__buttons">
            <a
              class="btn btn--secondary"
              [routerLink]="['/workflows', workflow.id, 'edit']"
            >
              Edit
            </a>
            <button
              type="button"
              class="btn btn--secondary"
              (click)="onDelete()"
            >
              Delete
            </button>
          </div>
        </div>
      </header>

      <section class="workflow-detail__meta">
        <div>
          <h2>Metadata</h2>
          <p>
            Created
            <strong>{{ workflow.createdAt | date: 'medium' }}</strong>
          </p>
          <p *ngIf="workflow.lastRunAt">
            Last run
            <strong>{{ workflow.lastRunAt | date: 'medium' }}</strong>
          </p>
          <p *ngIf="!workflow.lastRunAt">
            This workflow has not run yet.
          </p>
        </div>
      </section>
    </section>

    <ng-template #notFound>
      <section class="workflow-detail">
        <a routerLink="/workflows" class="workflow-detail__back">
          ← Back to workflows
        </a>
        <p>We couldn’t find that workflow.</p>
      </section>
    </ng-template>
  `,
  styles: [
    `
      .workflow-detail {
        padding: 1.5rem 0;
      }

      .workflow-detail__back {
        display: inline-flex;
        align-items: center;
        margin-bottom: 0.75rem;
        font-size: 0.85rem;
        color: #4b5563;
      }

      .workflow-detail__back:hover {
        text-decoration: underline;
      }

      .workflow-detail__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .workflow-detail__header h1 {
        margin: 0 0 0.25rem;
        font-size: 1.7rem;
      }

      .workflow-detail__description {
        margin: 0;
        color: #4b5563;
      }

      .workflow-detail__actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
      }

      .workflow-detail__buttons {
        display: flex;
        gap: 0.4rem;
      }

      .workflow-detail__buttons .btn {
        font-size: 0.8rem;
        padding: 0.3rem 0.7rem;
      }

      .workflow-detail__status--active {
        color: #065f46;
        background-color: #ecfdf3;
        border-color: #bbf7d0;
      }

      .workflow-detail__status--paused {
        color: #92400e;
        background-color: #fffbeb;
        border-color: #fed7aa;
      }

      .workflow-detail__status--draft {
        color: #1f2937;
        background-color: #f9fafb;
        border-color: #e5e7eb;
      }

      .workflow-detail__meta h2 {
        margin: 0 0 0.5rem;
        font-size: 1.1rem;
      }

      .workflow-detail__meta p {
        margin: 0 0 0.25rem;
        font-size: 0.9rem;
        color: #4b5563;
      }
    `
  ]
})
export class WorkflowDetailComponent {
  workflow?: Workflow | null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly workflowService: WorkflowService,
    private readonly notificationService: NotificationService
  ) {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.workflow = null;
      return;
    }

    const workflow = this.workflowService.getById(id);

    if (!workflow) {
      this.workflow = null;
      return;
    }

    this.workflow = workflow;
  }

  onDelete(): void {
    if (!this.workflow) {
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this workflow?');

    if (!confirmed) {
      return;
    }

    const deleted = this.workflowService.delete(this.workflow.id);

    if (deleted) {
      this.notificationService.showSuccess('Workflow deleted.');
      this.router.navigate(['/workflows']);
    }
  }
}