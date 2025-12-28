import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { WorkspaceService } from '../workspace.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
    selector: 'app-create-workspace',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
    <div class="create-workspace-container">
      <div class="card workspace-form-card">
        <div class="card-header">
          <h2>Create New Workspace</h2>
          <p class="subtitle">Set up a space for your team and projects</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="workspace-form">
          <div class="form-group">
            <label for="name" class="form-label">Workspace Name</label>
            <input
              type="text"
              id="name"
              class="form-control"
              formControlName="name"
              placeholder="e.g. Acme Corp Marketing"
              [class.error]="f['name'].touched && f['name'].invalid"
            />
            <div *ngIf="f['name'].touched && f['name'].errors" class="form-error">
              <div *ngIf="f['name'].errors['required']">Workspace name is required</div>
            </div>
            <p class="form-hint">This will also generate your workspace URL slug.</p>
          </div>

          <div class="form-group">
            <label for="timeZone" class="form-label">Timezone</label>
            <select id="timeZone" class="form-control" formControlName="timeZone">
              <option value="UTC">UTC (Universal Coordinated Time)</option>
              <option value="America/New_York">Eastern Time (US & Canada)</option>
              <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
              <option value="Europe/London">London</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>

          <div class="form-actions mt-4">
            <a routerLink="/workspaces" class="btn btn--secondary">Cancel</a>
            <button type="submit" class="btn btn--primary" [disabled]="loading || form.invalid">
              <span *ngIf="loading">Creating...</span>
              <span *ngIf="!loading">Create Workspace</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
    styles: [`
    .create-workspace-container {
      max-width: 600px;
      margin: 2rem auto;
    }

    .workspace-form-card {
      padding: 2.5rem;
    }

    .card-header {
      margin-bottom: 2rem;
      text-align: center;
    }

    .subtitle {
      color: var(--color-text-secondary);
      margin-top: 0.5rem;
    }

    .form-hint {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      margin-top: 0.25rem;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--color-gray-100);
      margin-top: 2rem;
    }
  `]
})
export class CreateWorkspaceComponent {
    form: FormGroup;
    loading = false;

    constructor(
        private fb: FormBuilder,
        private workspaceService: WorkspaceService,
        private router: Router,
        private notificationService: NotificationService
    ) {
        this.form = this.fb.group({
            name: ['', Validators.required],
            timeZone: ['UTC']
        });
    }

    get f() { return this.form.controls; }

    onSubmit() {
        if (this.form.invalid) return;

        this.loading = true;
        this.workspaceService.create(this.form.value).subscribe({
            next: () => {
                this.notificationService.showSuccess('Workspace created successfully');
                this.router.navigate(['/workspaces']);
            },
            error: (err) => {
                this.notificationService.showError(err.error?.error || 'Failed to create workspace');
                this.loading = false;
            }
        });
    }
}
