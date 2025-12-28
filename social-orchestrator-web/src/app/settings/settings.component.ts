import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="settings">
      <h1>Settings</h1>
      <p class="settings__subtitle">
        Configure how Social Orchestrator connects to your social channels and behaves by default.
      </p>

      <div class="settings__grid">
        <div class="settings__card">
          <h2>Connections</h2>
          <p>Manage which platforms are connected (Twitter/X, LinkedIn, etc.).</p>
        </div>

        <div class="settings__card">
          <h2>Defaults</h2>
          <p>Control default posting windows, time zones, and safety limits.</p>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .settings {
        padding: 1.5rem 0;
      }

      .settings h1 {
        margin: 0 0 0.5rem;
        font-size: 1.75rem;
      }

      .settings__subtitle {
        margin: 0 0 1rem;
        color: #4b5563;
      }

      .settings__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
      }

      .settings__card {
        padding: 1rem;
        border-radius: 0.5rem;
        background-color: #ffffff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      }

      .settings__card h2 {
        margin: 0 0 0.25rem;
        font-size: 1.1rem;
      }

      .settings__card p {
        margin: 0;
        font-size: 0.9rem;
        color: #6b7280;
      }
    `
  ]
})
export class SettingsComponent {}