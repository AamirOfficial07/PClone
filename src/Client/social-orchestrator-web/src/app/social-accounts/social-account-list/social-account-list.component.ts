import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { SocialAccountApiService } from '../social-account-api.service';
import { SocialAccountSummary, SocialNetworkType } from '../../core/models/social-account';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-social-account-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="social-accounts-container">
      <div class="d-flex justify-between items-center mb-4">
        <div>
          <h1 class="page-title">Connected social accounts</h1>
          <p class="page-subtitle">Connect and manage accounts for this workspace</p>
        </div>

        <div class="actions">
          <button
            type="button"
            class="btn btn--primary"
            (click)="onConnectFacebook()"
            [disabled]="connecting"
          >
            <span *ngIf="!connecting">Connect Facebook</span>
            <span *ngIf="connecting">Redirecting...</span>
          </button>
        </div>
      </div>

      <div *ngIf="accounts$ | async as accounts; else loading">
        <div *ngIf="accounts.length === 0" class="empty-state">
          <h3>No social accounts connected</h3>
          <p>Connect your first Facebook account to start publishing from this workspace.</p>
          <button
            type="button"
            class="btn btn--primary mt-4"
            (click)="onConnectFacebook()"
            [disabled]="connecting"
          >
            Connect Facebook
          </button>
        </div>

        <div *ngIf="accounts.length > 0" class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Network</th>
                <th>Name</th>
                <th>Username</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let account of accounts">
                <td>
                  <span class="badge badge--network">{{ getNetworkLabel(account.networkType) }}</span>
                </td>
                <td>{{ account.name }}</td>
                <td>{{ account.username || '—' }}</td>
                <td>
                  <span
                    class="badge"
                    [ngClass]="{
                      'badge--success': account.isActive && !account.requiresReauthorization,
                      'badge--warning': account.requiresReauthorization,
                      'badge--muted': !account.isActive
                    }"
                  >
                    {{ getStatusLabel(account) }}
                  </span>
                </td>
                <td class="text-right">
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    (click)="onDisconnect(account)"
                  >
                    Disconnect
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading social accounts...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .social-accounts-container {
      padding: 1rem;
    }

    .page-title {
      margin-bottom: 0.25rem;
    }

    .page-subtitle {
      color: var(--color-text-secondary);
    }

    .actions {
      display: flex;
      gap: 0.75rem;
    }

    .table-wrapper {
      margin-top: 1.5rem;
      background: white;
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-gray-200);
      overflow: hidden;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    .table th,
    .table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--color-gray-100);
    }

    .table th {
      text-align: left;
      font-weight: 600;
      background-color: var(--color-gray-50);
    }

    .table tr:last-child td {
      border-bottom: none;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .badge--network {
      background-color: var(--color-gray-100);
      color: var(--color-gray-800);
    }

    .badge--success {
      background-color: #dcfce7;
      color: #166534;
    }

    .badge--warning {
      background-color: #fef3c7;
      color: #92400e;
    }

    .badge--muted {
      background-color: var(--color-gray-100);
      color: var(--color-gray-600);
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1.5rem;
      border-radius: var(--radius-lg);
      border: 1px dashed var(--color-gray-300);
      background-color: #fff;
      margin-top: 1.5rem;
    }

    .loading-state {
      text-align: center;
      padding: 3rem;
      color: var(--color-text-secondary);
    }

    .text-right {
      text-align: right;
    }
  `]
})
export class SocialAccountListComponent implements OnInit {
  workspaceId!: string;
  accounts$!: Observable<SocialAccountSummary[]>;
  connecting = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: SocialAccountApiService,
    private readonly notifications: NotificationService
  ) { }

  ngOnInit(): void {
    this.workspaceId = this.route.snapshot.paramMap.get('workspaceId') ?? '';
    this.refresh();
  }

  refresh(): void {
    if (!this.workspaceId) {
      return;
    }
    this.accounts$ = this.api.getSocialAccounts(this.workspaceId);
  }

  onConnectFacebook(): void {
    if (!this.workspaceId) {
      return;
    }

    this.connecting = true;
    this.api.getFacebookAuthorizeUrl(this.workspaceId).subscribe({
      next: response => {
        window.location.href = response.authorizationUrl;
      },
      error: err => {
        console.error(err);
        this.notifications.showError(err.error?.error || 'Failed to initiate Facebook connection');
        this.connecting = false;
      }
    });
  }

  onDisconnect(account: SocialAccountSummary): void {
    if (!this.workspaceId) {
      return;
    }

    this.api.disconnectSocialAccount(this.workspaceId, account.id).subscribe({
      next: () => {
        this.notifications.showSuccess('Social account disconnected');
        this.refresh();
      },
      error: err => {
        console.error(err);
        this.notifications.showError(err.error?.error || 'Failed to disconnect social account');
      }
    });
  }

  getNetworkLabel(networkType: SocialNetworkType): string {
    switch (networkType) {
      case SocialNetworkType.Facebook:
        return 'Facebook';
      case SocialNetworkType.Instagram:
        return 'Instagram';
      case SocialNetworkType.Twitter:
        return 'X / Twitter';
      case SocialNetworkType.LinkedIn:
        return 'LinkedIn';
      default:
        return 'Unknown';
    }
  }

  getStatusLabel(account: SocialAccountSummary): string {
    if (!account.isActive) {
      return 'Disconnected';
    }

    if (account.requiresReauthorization) {
      return 'Reauthorization required';
    }

    return 'Active';
  }
}