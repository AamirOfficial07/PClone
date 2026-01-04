import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PostApiService, CreatePostWithVariantsRequest } from '../post-api.service';
import { SocialAccountApiService } from '../../social-accounts/social-account-api.service';

@Component({
  selector: 'app-post-composer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="composer">
      <h1>New post</h1>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="composer__section">
          <label>
            Title
            <input type="text" formControlName="title" />
          </label>
        </div>

        <div class="composer__section">
          <label>
            Notes
            <textarea rows="3" formControlName="notes"></textarea>
          </label>
        </div>

        <div class="composer__section">
          <h2>Variants</h2>
          <p class="composer__hint">
            Create a variant for each social account you want to publish to.
          </p>

          <div
            formArrayName="variants"
            class="composer__variants"
          >
            <div
              class="composer__variant card"
              *ngFor="let group of variantControls; let i = index"
              [formGroupName]="i"
            >
              <label>
                Social account
                <select formControlName="socialAccountId">
                  <option value="">Select account</option>
                  <option
                    *ngFor="let account of socialAccounts"
                    [value]="account.id"
                  >
                    {{ account.name }} ({{ account.networkType }})
                  </option>
                </select>
              </label>

              <label>
                Type
                <select formControlName="type">
                  <option value="Status">Status</option>
                  <option value="Link">Link</option>
                </select>
              </label>

              <label>
                Text
                <textarea rows="3" formControlName="text"></textarea>
              </label>

              <label *ngIf="group.get('type')?.value === 'Link'">
                Link URL
                <input type="url" formControlName="linkUrl" />
              </label>

              <div class="composer__schedule">
                <label>
                  Scheduled date (workspace local)
                  <input type="date" formControlName="scheduledDate" />
                </label>
                <label>
                  Scheduled time
                  <input type="time" formControlName="scheduledTime" />
                </label>
              </div>

              <button
                type="button"
                class="btn btn--secondary composer__remove"
                (click)="removeVariant(i)"
              >
                Remove
              </button>
            </div>
          </div>

          <button
            type="button"
            class="btn btn--secondary composer__add"
            (click)="addVariant()"
          >
            + Add variant
          </button>
        </div>

        <div class="composer__actions">
          <button type="submit" class="btn btn--primary" [disabled]="form.invalid || variants.length === 0">
            Schedule post
          </button>
          <button type="button" class="btn btn--secondary" (click)="cancel()">
            Cancel
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      .composer {
        padding: 1.5rem 0;
        max-width: 800px;
      }

      .composer h1 {
        margin: 0 0 1rem;
        font-size: 1.5rem;
      }

      .composer__section {
        margin-bottom: 1rem;
      }

      label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.9rem;
        margin-bottom: 0.75rem;
      }

      input[type='text'],
      input[type='url'],
      input[type='date'],
      input[type='time'],
      select,
      textarea {
        border-radius: 4px;
        border: 1px solid #d1d5db;
        padding: 0.4rem 0.5rem;
        font: inherit;
      }

      textarea {
        resize: vertical;
      }

      .composer__variants {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .composer__variant {
        padding: 0.75rem 0.9rem;
      }

      .composer__schedule {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .composer__add {
        margin-top: 0.75rem;
      }

      .composer__actions {
        margin-top: 1.5rem;
        display: flex;
        gap: 0.5rem;
      }

      .composer__hint {
        margin: 0 0 0.5rem;
        color: #6b7280;
        font-size: 0.85rem;
      }

      .composer__remove {
        margin-top: 0.5rem;
      }
    `
  ]
})
export class PostComposerComponent implements OnInit {
  form!: FormGroup;
  socialAccounts: { id: string; name: string; networkType: string }[] = [];
  private workspaceId!: string;

  get variants(): FormArray {
    return this.form.get('variants') as FormArray;
  }

  get variantControls() {
    return this.variants.controls as FormGroup[];
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: PostApiService,
    private readonly socialAccountApi: SocialAccountApiService
  ) {}

  ngOnInit(): void {
    this.workspaceId = this.route.snapshot.paramMap.get('workspaceId') as string;

    this.form = this.fb.group({
      title: [''],
      notes: [''],
      variants: this.fb.array([])
    });

    this.addVariant();

    this.socialAccountApi
      .getSocialAccounts(this.workspaceId)
      .subscribe(accounts => {
        this.socialAccounts = accounts;
      });
  }

  addVariant(): void {
    const group = this.fb.group({
      socialAccountId: ['', Validators.required],
      type: ['Status', Validators.required],
      text: ['', Validators.required],
      linkUrl: [''],
      scheduledDate: ['', Validators.required],
      scheduledTime: ['', Validators.required]
    });

    this.variants.push(group);
  }

  removeVariant(index: number): void {
    this.variants.removeAt(index);
  }

  onSubmit(): void {
    if (this.form.invalid || this.variants.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value as {
      title: string;
      notes: string;
      variants: {
        socialAccountId: string;
        type: string;
        text: string;
        linkUrl: string;
        scheduledDate: string;
        scheduledTime: string;
      }[];
    };

    const payload: CreatePostWithVariantsRequest = {
      post: {
        workspaceId: this.workspaceId,
        title: value.title || null,
        notes: value.notes || null
      },
      variants: value.variants.map(v => {
        const scheduledAt = `${v.scheduledDate}T${v.scheduledTime}:00`;

        return {
          socialAccountId: v.socialAccountId,
          type: v.type,
          text: v.text,
          linkUrl: v.linkUrl || null,
          mediaAssetId: null,
          scheduledAt
        };
      })
    };

    this.api.createPost(this.workspaceId, payload).subscribe(created => {
      this.router.navigate(['workspaces', this.workspaceId, 'posts', created.id]);
    });
  }

  cancel(): void {
    this.router.navigate(['workspaces', this.workspaceId, 'posts']);
  }
}