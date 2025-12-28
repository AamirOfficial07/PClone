import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-workflows',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="workflows">
      <h1>Workflows</h1>
      <p class="workflows__subtitle">
        Define and manage your social orchestration workflows here.
      </p>

      <div class="workflows__empty">
        <p>No workflows yet.</p>
        <p class="workflows__hint">
          You’ll be able to create multi-step automations that coordinate content,
          channels, and timing.
        </p>
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
    `
  ]
})
export class WorkflowsComponent {}