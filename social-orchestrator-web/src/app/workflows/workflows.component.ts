import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Workflow } from '../core/models/workflow';
import { NotificationService } from '../core/services/notification.service';
import { WorkflowService } from './workflow.service';

@Component({
  selector: 'app-workflows',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="workflows">
      <h1>Workflows</h1>
      <p class="workflows__subtitle">
        Define and manage your social orchestration workflows here.
      </p>

      <div class="workflows__actions">
        <a routerLink="/workflows/new" class="btn btn--primary">
          + New workflow
        </a>
      </div>

      <ng-container *ngIf="workflows$ | async as workflows">
        <div *ngIf="workflows.length === 0" class="workflows__empty card">
          <p>No workflows yet.</p>
          <p class="workflows__hint">
            You’ll be able to create multi-step automations that coordinate content,
            channels, and timing.
          </p>
        </div>

        <div *ngIf="workflows.length > 0" class="workflows__list">
          <article
            *ngFor="let workflow of workflows"
            class="workflows__item card"
            [routerLink]="['/workflows', workflow.id]"
          >
            <header class="workflows__item-header">
              <div>
                <h2>{{ workflow.name }}</h2>
                <p class="workflows__description">
                  {{ workflow.description }}
                </p>
              </div>

              <div class="workflows__item-meta">
                <span
                  class="workflows__status tag"
                  [class.workflows__status--active]="workflow.status === 'active'"
                  [class.workflows__status--paused]="workflow.status === 'paused'"
                  [class.workflows__status--draft]="workflow.status === 'draft'"
                >
                  {{ workflow.status }}
                </span>
                <div class="workflows__item-actions">
                  <button
                    type="button"
                    class="btn btn--secondary workflows__edit"
                    [routerLink]="['/workflows', workflow.id, 'edit']"
                    (click)="$event.stopPropagation()"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="btn btn--secondary workflows__delete"
                    (click)="onDelete(workflow.id, $event)"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </header>

            <p class="workflows__meta">
              Created {{ workflow.createdAt | date: 'mediumDate' }}
              <span *ngIf="workflow.lastRunAt">
                · Last run {{ workflow.lastRunAt | date: 'short' }}
              </span>
            </p>
          </article>
        </div>
      </ng-container>
    </section>
  `,
  styles: [
    `
      .workflows {
        padding: 1.5rem 0;
      }

      .workflows h1 {
        margin: 0 0 0.5rem;
        font-size: 1.75rem;
      }

      .workflows__subtitle {
        margin: 0 0 1rem;
        color: #4b5563;
      }

      .workflows__actions {
        margin: 0 0 1rem;
      }

      .workflows__empty {
        padding: 1rem;
      }

      .workflows__empty p {
        margin: 0;
      }

      .workflows__hint {
        margin-top: 0.5rem;
        font-size: 0.9rem;
        color: #6b7280;
      }

      .workflows__list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .workflows__item {
        padding: 0.9rem 1rem;
        cursor: pointer;
        transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
      }

      .workflows__item:hover {
        border-color: #6366f1;
        box-shadow: 0 4px 8px rgba(79, 70, 229, 0.08);
        transform: translateY(-1px);
      }

      .workflows__item-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.25rem;
      }

      .workflows__item-header h2 {
        margin: 0 0 0.25rem;
        font-size: 1.05rem;
      }

      .workflows__description {
        margin: 0;
        font-size: 0.95rem;
        color: #4b5563;
      }

      .workflows__item-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.4rem;
      }

      .workflows__item-actions {
        display: flex;
        gap: 0.25rem;
      }

      .workflows__meta {
        margin: 0;
        font-size: 0.8rem;
        color: #6b7280;
      }

      .workflows__status--active {
        color: #065f46;
        background-color: #ecfdf3;
        border-color: #bbf7d0;
      }

      .workflows__status--paused {
        color: #92400e;
        background-color: #fffbeb;
        border-color: #fed7aa;
      }

      .workflows__status--draft {
        color: #1f2937;
        background-color: #f9fafb;
        border-color: #e5e7eb;
      }

      .workflows__edit,
      .workflows__delete {
        font-size: 0.75rem;
        padding: 0.25rem 0.6rem;
      }
    `
  ]
})
export class WorkflowsComponent {
  readonly workflows$: Observable<Workflow[]>;

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly notificationService: NotificationService
  ) {
    this.workflows$ = this.workflowService.getAll();
  }

  onDelete(id: string, event: Event): void {
    event.stopPropagation();

    const confirmed = window.confirm('Are you sure you want to delete this workflow?');

    if (!confirmed) {
      return;
    }

    const deleted = this.workflowService.delete(id);

    if (deleted) {
      this.notificationService.showSuccess('Workflow deleted.');
    }
  }
}