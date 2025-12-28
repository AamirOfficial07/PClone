import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Workflow } from '../core/models/workflow';
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
        <a routerLink="/workflows/new" class="workflows__create">
          + New workflow
        </a>
      </div>

      <div *ngIf="workflows.length === 0" class="workflows__empty">
        <p>No workflows yet.</p>
        <p class="workflows__hint">
          You’ll be able to create multi-step automations that coordinate content,
          channels, and timing.
        </p>
      </div>

      <div *ngIf="workflows.length > 0" class="workflows__list">
        <article
          *ngFor="let workflow of workflows"
          class="workflows__item"
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
              <span class="workflows__status" [class]="'workflows__status--' + workflow.status">
                {{ workflow.status }}
              </span>
              <button
                type="button"
                class="workflows__edit"
                [routerLink]="['/workflows', workflow.id, 'edit']"
                (click)="$event.stopPropagation()"
              >
                Edit
              </button>
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

      .workflows__create {
        display: inline-flex;
        align-items: center;
        padding: 0.4rem 0.9rem;
        border-radius: 999px;
        background: #4f46e5;
        color: #f9fafb;
        font-size: 0.9rem;
        border: none;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
      }

      .workflows__create:hover {
        background: #4338ca;
      }

      .workflows__empty {
        padding: 1rem;
        border-radius: 0.5rem;
        background-color: #f9fafb;
        border: 1px dashed #d1d5db;
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
        border-radius: 0.5rem;
        background-color: #ffffff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
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
        gap: 0.3rem;
      }

      .workflows__meta {
        margin: 0;
        font-size: 0.8rem;
        color: #6b7280;
      }

      .workflows__status {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 70px;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border: 1px solid transparent;
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

      .workflows__edit {
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        border: 1px solid #d1d5db;
        background-color: #ffffff;
        font-size: 0.75rem;
        color: #374151;
        cursor: pointer;
      }

      .workflows__edit:hover {
        border-color: #4f46e5;
        color: #111827;
      }
    `
  ]
})
export class WorkflowsComponent {
  get workflows(): Workflow[] {
    return this.workflowService.getAll();
  }

  constructor(private readonly workflowService: WorkflowService) {}
}