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
            <h2>{{ workflow.name }}</h2>
            <span class="workflows__status" [class]="'workflows__status--' + workflow.status">
              {{ workflow.status }}
            </span>
          </header>
          <p class="workflows__description">
            {{ workflow.description }}
          </p>
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
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.25rem;
      }

      .workflows__item-header h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      .workflows__description {
        margin: 0.25rem 0 0.3rem;
        font-size: 0.95rem;
        color: #4b5563;
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
    `
  ]
})
export class WorkflowsComponent {
  readonly workflows: Workflow[];

  constructor(private readonly workflowService: WorkflowService) {
    this.workflows = this.workflowService.getAll();
  }
}