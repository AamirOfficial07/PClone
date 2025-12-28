import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { Connection, ConnectionPlatform } from '../core/models/connection';
import { NotificationService } from '../core/services/notification.service';
import { ConnectionsService } from './connections.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="settings">
      <h1>Settings</h1>
      <p class="settings__subtitle">
        Configure how Social Orchestrator connects to your social channels and behaves by default.
      </p>

      <div class="settings__tabs">
        <button
          type="button"
          class="settings__tab"
          [class.settings__tab--active]="activeTab === 'connections'"
          (click)="activeTab = 'connections'"
        >
          Connections
        </button>
        <button
          type="button"
          class="settings__tab"
          [class.settings__tab--active]="activeTab === 'defaults'"
          (click)="activeTab = 'defaults'"
        >
          Defaults
        </button>
      </div>

      <ng-container *ngIf="activeTab === 'connections'">
        <section class="settings__section">
          <header class="settings__section-header">
            <h2>Connections</h2>
            <p>Manage which social platforms are connected.</p>
          </header>

          <form
            [formGroup]="connectionForm"
            (ngSubmit)="onAddConnection()"
            class="settings__form card"
          >
            <div class="settings__form-row">
              <label class="settings__field">
                <span class="settings__label">Platform</span>
                <select formControlName="platform" class="settings__select">
                  <option value="twitter">Twitter / X</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label class="settings__field settings__field--grow">
                <span class="settings__label">Handle / account</span>
                <input
                  type="text"
                  formControlName="handle"
                  class="settings__input"
                  placeholder="@handle or page name"
                />
              </label>

              <label class="settings__field settings__field--grow">
                <span class="settings__label">Label</span>
                <input
                  type="text"
                  formControlName="label"
                  class="settings__input"
                  placeholder="How should we refer to this connection?"
                />
              </label>

              <div class="settings__actions">
                <button
                  type="submit"
                  class="btn btn--primary"
                  [disabled]="connectionForm.invalid"
                >
                  Connect
                </button>
              </div>
            </div>

            <div class="settings__errors">
              <span
                class="settings__error"
                *ngIf="connectionForm.controls.handle.touched && connectionForm.controls.handle.errors?.['required']"
              >
                Handle is required.
              </span>
              <span
                class="settings__error"
                *ngIf="connectionForm.controls.label.touched && connectionForm.controls.label.errors?.['required']"
              >
                Label is required.
              </span>
            </div>
          </form>

          <ng-container *ngIf="connections$ | async as connections">
            <div *ngIf="connections.length === 0" class="settings__empty card">
              <p>No connections yet.</p>
              <p class="settings__hint">
                Connect at least one social account to start orchestrating workflows.
              </p>
            </div>

            <ul *ngIf="connections.length > 0" class="settings__connections">
              <li *ngFor="let connection of connections" class="settings__connection card">
                <div class="settings__connection-main">
                  <div class="settings__avatar">
                    {{ getPlatformShort(connection.platform) }}
                  </div>
                  <div class="settings__connection-text">
                    <div class="settings__connection-header">
                      <h3>{{ connection.label }}</h3>
                      <span
                        class="tag"
                        [class.settings__status--connected]="connection.status === 'connected'"
                        [class.settings__status--disconnected]="connection.status === 'disconnected'"
                        [class.settings__status--error]="connection.status === 'error'"
                      >
                        {{ connection.status }}
                      </span>
                    </div>
                    <p class="settings__connection-handle">
                      {{ describePlatform(connection.platform) }} · {{ connection.handle }}
                    </p>
                    <p class="settings__connection-meta">
                      Connected {{ connection.createdAt | date: 'mediumDate' }}
                      <span *ngIf="connection.lastSyncAt">
                        · Last sync {{ connection.lastSyncAt | date: 'short' }}
                      </span>
                    </p>
                  </div>
                </div>

                <div class="settings__connection-actions">
                  <button
                    type="button"
                    class="btn btn--secondary"
                    (click)="onDisconnect(connection.id)"
                    [disabled]="connection.status !== 'connected'"
                  >
                    Disconnect
                  </button>
                </div>
              </li>
            </ul>
          </ng-container>
        </section>
      </ng-container>

      <ng-container *ngIf="activeTab === 'defaults'">
        <section class="settings__section">
          <header class="settings__section-header">
            <h2>Defaults</h2>
            <p>Control default posting windows, time zones, and safety limits.</p>
          </header>

          <div class="settings__placeholder card">
            <p>
              Defaults will let you define global rules (like quiet hours, time zones,
              and rate limits) that apply across workflows.
            </p>
          </div>
        </section>
      </ng-container>
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

      .settings__tabs {
        display: inline-flex;
        border-radius: 999px;
        padding: 0.2rem;
        background-color: #e5e7eb;
        margin-bottom: 1rem;
      }

      .settings__tab {
        border: none;
        background: transparent;
        padding: 0.3rem 0.9rem;
        border-radius: 999px;
        font-size: 0.9rem;
        cursor: pointer;
        color: #4b5563;
      }

      .settings__tab--active {
        background-color: #ffffff;
        color: #111827;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
      }

      .settings__section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .settings__section-header h2 {
        margin: 0 0 0.1rem;
        font-size: 1.2rem;
      }

      .settings__section-header p {
        margin: 0;
        font-size: 0.9rem;
        color: #6b7280;
      }

      .settings__form {
        padding: 0.75rem 0.9rem;
      }

      .settings__form-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: flex-end;
      }

      .settings__field {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .settings__field--grow {
        flex: 1 1 180px;
      }

      .settings__label {
        font-size: 0.85rem;
        color: #374151;
      }

      .settings__input,
      .settings__select {
        border-radius: 0.5rem;
        border: 1px solid #d1d5db;
        padding: 0.4rem 0.6rem;
        font-size: 0.9rem;
        font-family: inherit;
      }

      .settings__input:focus,
      .settings__select:focus {
        outline: none;
        border-color: #4f46e5;
        box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.4);
      }

      .settings__actions {
        display: flex;
        align-items: flex-end;
        margin-left: auto;
      }

      .settings__errors {
        margin-top: 0.35rem;
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .settings__error {
        font-size: 0.8rem;
        color: #b91c1c;
      }

      .settings__empty {
        padding: 1rem;
      }

      .settings__empty p {
        margin: 0;
      }

      .settings__hint {
        margin-top: 0.5rem;
        font-size: 0.9rem;
        color: #6b7280;
      }

      .settings__connections {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .settings__connection {
        padding: 0.75rem 0.9rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .settings__connection-main {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .settings__avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 999px;
        background: #111827;
        color: #f9fafb;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        font-weight: 500;
      }

      .settings__connection-text {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .settings__connection-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .settings__connection-header h3 {
        margin: 0;
        font-size: 1rem;
      }

      .settings__connection-handle {
        margin: 0;
        font-size: 0.9rem;
        color: #4b5563;
      }

      .settings__connection-meta {
        margin: 0;
        font-size: 0.8rem;
        color: #6b7280;
      }

      .settings__connection-actions {
        display: flex;
        align-items: center;
      }

      .settings__connection-actions .btn {
        font-size: 0.8rem;
        padding: 0.3rem 0.7rem;
      }

      .settings__status--connected {
        color: #065f46;
        background-color: #ecfdf3;
        border-color: #bbf7d0;
      }

      .settings__status--disconnected {
        color: #92400e;
        background-color: #fffbeb;
        border-color: #fed7aa;
      }

      .settings__status--error {
        color: #991b1b;
        background-color: #fee2e2;
        border-color: #fecaca;
      }

      .settings__placeholder {
        padding: 0.9rem 1rem;
      }

      .settings__placeholder p {
        margin: 0;
        font-size: 0.9rem;
        color: #4b5563;
      }

      @media (max-width: 640px) {
        .settings__connection {
          flex-direction: column;
          align-items: flex-start;
        }

        .settings__connection-actions {
          align-self: flex-end;
        }
      }
    `
  ]
})
export class SettingsComponent {
  readonly connections$: Observable<Connection[]>;
  readonly connectionForm = this.fb.group({
    platform: ['twitter' as ConnectionPlatform],
    handle: ['', Validators.required],
    label: ['', Validators.required]
  });

  activeTab: 'connections' | 'defaults' = 'connections';

  constructor(
    private readonly fb: FormBuilder,
    private readonly connectionsService: ConnectionsService,
    private readonly notificationService: NotificationService
  ) {
    this.connections$ = this.connectionsService.getAll();
  }

  onAddConnection(): void {
    if (this.connectionForm.invalid) {
      this.connectionForm.markAllAsTouched();
      return;
    }

    const value = this.connectionForm.value;

    const platform = (value.platform || 'twitter') as ConnectionPlatform;
    const handle = (value.handle || '').toString().trim();
    const label = (value.label || '').toString().trim();

    if (!handle || !label) {
      return;
    }

    this.connectionsService.connect({
      platform,
      handle,
      label
    });

    this.notificationService.showSuccess('Connection added.');

    this.connectionForm.reset({
      platform: 'twitter',
      handle: '',
      label: ''
    });
  }

  onDisconnect(id: string): void {
    const confirmed = window.confirm('Are you sure you want to disconnect this account?');

    if (!confirmed) {
      return;
    }

    const success = this.connectionsService.disconnect(id);

    if (success) {
      this.notificationService.showSuccess('Connection disconnected.');
    }
  }

  getPlatformShort(platform: ConnectionPlatform): string {
    switch (platform) {
      case 'twitter':
        return 'X';
      case 'linkedin':
        return 'Li';
      case 'instagram':
        return 'Ig';
      case 'facebook':
        return 'Fb';
      default:
        return 'So';
    }
  }

  describePlatform(platform: ConnectionPlatform): string {
    switch (platform) {
      case 'twitter':
        return 'Twitter / X';
      case 'linkedin':
        return 'LinkedIn';
      case 'instagram':
        return 'Instagram';
      case 'facebook':
        return 'Facebook';
      default:
        return 'Other';
    }
  }
}