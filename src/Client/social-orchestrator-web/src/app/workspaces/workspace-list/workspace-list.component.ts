import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkspaceService } from '../workspace.service';
import { WorkspaceSummary, WorkspaceRole } from '../../core/models/workspace';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-workspace-list',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="workspace-list-container">
      <div class="d-flex justify-between items-center mb-4">
        <div>
          <h1 class="page-title">Your Workspaces</h1>
          <p class="page-subtitle">Manage your social accounts and teams</p>
        </div>
        <a routerLink="/workspaces/create" class="btn btn--primary">
          <span>+</span> Create Workspace
        </a>
      </div>

      <div class="grid-container" *ngIf="workspaces$ | async as workspaces; else loading">
        <div *ngIf="workspaces.length === 0" class="empty-state">
          <div class="empty-state-content">
            <h3>No workspaces yet</h3>
            <p>Create your first workspace to get started.</p>
            <a routerLink="/workspaces/create" class="btn btn--primary mt-4">Create Workspace</a>
          </div>
        </div>

        <div class="card card--hover workspace-card" *ngFor="let workspace of workspaces">
          <div class="card-body">
            <div class="workspace-header">
              <div class="workspace-avatar">
                {{ workspace.name.charAt(0).toUpperCase() }}
              </div>
              <div class="workspace-info">
                <h3>{{ workspace.name }}</h3>
                <span class="workspace-slug">{{ workspace.slug }}</span>
              </div>
              <span class="tag role-tag" [ngClass]="getRoleClass(workspace.role)">
                {{ getRoleLabel(workspace.role) }}
              </span>
            </div>
            
            <div class="workspace-meta">
              <div class="meta-item">
                <span class="meta-label">Timezone</span>
                <span class="meta-value">{{ workspace.timeZone }}</span>
              </div>
            </div>
            
            <div class="workspace-actions mt-4">
              <button class="btn btn--secondary btn--block">Open Workspace</button>
            </div>
          </div>
        </div>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading workspaces...</p>
        </div>
      </ng-template>
    </div>
  `,
    styles: [`
    .page-title { margin-bottom: 0.25rem; }
    .page-subtitle { color: var(--color-text-secondary); }
    
    .grid-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .workspace-card .card-body {
      padding: 1.5rem;
    }

    .workspace-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .workspace-avatar {
      width: 3rem;
      height: 3rem;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.25rem;
    }

    .workspace-info h3 {
      font-size: 1.125rem;
      margin-bottom: 0.125rem;
    }

    .workspace-slug {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .role-tag {
      margin-left: auto;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background-color: var(--color-gray-100);
      color: var(--color-gray-700);
    }

    .role-tag.owner { background-color: var(--color-primary-100); color: var(--color-primary-800); }
    
    .workspace-meta {
      display: flex;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-gray-100);
    }

    .meta-item {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .meta-value {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: var(--radius-lg);
      border: 1px dashed var(--color-gray-300);
    }

    .loading-state {
      text-align: center;
      padding: 3rem;
      color: var(--color-text-secondary);
    }
  `]
})
export class WorkspaceListComponent implements OnInit {
    workspaces$: Observable<WorkspaceSummary[]> | undefined;

    constructor(private workspaceService: WorkspaceService) { }

    ngOnInit() {
        this.workspaces$ = this.workspaceService.getAll();
    }

    getRoleLabel(role: WorkspaceRole): string {
        switch (role) {
            case WorkspaceRole.Owner: return 'Owner';
            case WorkspaceRole.Admin: return 'Admin';
            case WorkspaceRole.Member: return 'Member';
            default: return 'Unknown';
        }
    }

    getRoleClass(role: WorkspaceRole): string {
        switch (role) {
            case WorkspaceRole.Owner: return 'owner';
            default: return '';
        }
    }
}
