import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WorkflowStatus } from '../core/models/workflow';
import { WorkflowService } from './workflow.service';

@Component({
  selector: 'app-workflow-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="workflow-editor" *ngIf="!notFound; else notFoundTpl">
      <a routerLink="/workflows" class="workflow-editor__back">
        ← Back to workflows
      </a>

      <h1>{{ isEditMode ? 'Edit workflow' : 'New workflow' }}</h1>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="workflow-editor__form">
        <label class="workflow-editor__field">
          <span class="workflow-editor__label">Name</span>
          <input
            type="text"
            formControlName="name"
            class="workflow-editor__input"
            placeholder="e.g. Weekly content digest"
          />
          <span
            class="workflow-editor__error"
            *ngIf="form.controls.name.touched && form.controls.name.invalid"
          >
            Name is required.
          </span>
        </label>

        <label class="workflow-editor__field">
          <span class="workflow-editor__label">Description</span>
          <textarea
            formControlName="description"
            rows="3"
            class="workflow-editor__textarea"
            placeholder="What does this workflow do?"
          ></textarea>
        </label>

        <label class="workflow-editor__field">
          <span class="workflow-editor__label">Status</span>
          <select formControlName="status" class="workflow-editor__select">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </label>

        <div class="workflow-editor__actions">
          <button
            type="submit"
            class="workflow-editor__primary"
            [disabled]="form.invalid"
          >
            {{ isEditMode ? 'Save changes' : 'Create workflow' }}
          </button>

          <button
            type="button"
            class="workflow-editor__secondary"
            (click)="onCancel()"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>

    <ng-template #notFoundTpl>
      <section class="workflow-editor">
        <a routerLink="/workflows" class="workflow-editor__back">
          ← Back to workflows
        </a>
        <p>We couldn’t find that workflow.</p>
      </section>
    </ng-template>
  `,
  styles: [
    `
      .workflow-editor {
        padding: 1.5rem 0;
        max-width: 560px;
      }

      .workflow-editor__back {
        display: inline-flex;
        align-items: center;
        margin-bottom: 0.75rem;
        font-size: 0.85rem;
        color: #4b5563;
      }

      .workflow-editor__back:hover {
        text-decoration: underline;
      }

      .workflow-editor h1 {
        margin: 0 0 1rem;
        font-size: 1.7rem;
      }

      .workflow-editor__form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .workflow-editor__field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .workflow-editor__label {
        font-size: 0.9rem;
        color: #374151;
      }

      .workflow-editor__input,
      .workflow-editor__textarea,
      .workflow-editor__select {
        border-radius: 0.5rem;
        border: 1px solid #d1d5db;
        padding: 0.5rem 0.6rem;
        font-size: 0.95rem;
        font-family: inherit;
      }

      .workflow-editor__textarea {
        resize: vertical;
        min-height: 80px;
      }

      .workflow-editor__input:focus,
      .workflow-editor__textarea:focus,
      .workflow-editor__select:focus {
        outline: none;
        border-color: #4f46e5;
        box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.4);
      }

      .workflow-editor__error {
        font-size: 0.8rem;
        color: #b91c1c;
      }

      .workflow-editor__actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.5rem;
      }

      .workflow-editor__primary {
        padding: 0.45rem 1rem;
        border-radius: 999px;
        border: none;
        background: #4f46e5;
        color: #f9fafb;
        font-size: 0.9rem;
        cursor: pointer;
      }

      .workflow-editor__primary:hover:not(:disabled) {
        background: #4338ca;
      }

      .workflow-editor__primary:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .workflow-editor__secondary {
        padding: 0.45rem 1rem;
        border-radius: 999px;
        border: 1px solid #d1d5db;
        background: #ffffff;
        font-size: 0.9rem;
        color: #374151;
        cursor: pointer;
      }

      .workflow-editor__secondary:hover {
        border-color: #9ca3af;
      }
    `
  ]
})
export class WorkflowEditorComponent {
  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    status: ['draft' as WorkflowStatus]
  });

  readonly isEditMode: boolean;
  readonly notFound: boolean;
  private readonly currentId?: string;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly workflowService: WorkflowService
  ) {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.isEditMode = false;
      this.notFound = false;
      this.currentId = undefined;
      return;
    }

    const workflow = this.workflowService.getById(id);

    if (!workflow) {
      this.isEditMode = true;
      this.notFound = true;
      this.currentId = undefined;
      return;
    }

    this.isEditMode = true;
    this.notFound = false;
    this.currentId = workflow.id;

    this.form.patchValue({
      name: workflow.name,
      description: workflow.description,
      status: workflow.status
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;

    const name = (value.name || '').toString().trim();
    const description = (value.description || '').toString().trim();
    const status = (value.status || 'draft') as WorkflowStatus;

    if (!name) {
      return;
    }

    if (this.isEditMode && this.currentId) {
      this.workflowService.update(this.currentId, {
        name,
        description,
        status
      });

      this.router.navigate(['/workflows', this.currentId]);
      return;
    }

    const created = this.workflowService.create({
      name,
      description,
      status
    });

    this.router.navigate(['/workflows', created.id]);
  }

  onCancel(): void {
    if (this.isEditMode && this.currentId) {
      this.router.navigate(['/workflows', this.currentId]);
      return;
    }

    this.router.navigate(['/workflows']);
  }
}