import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PostApiService, PostListItemDto } from '../post-api.service';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="posts">
      <header class="posts__header">
        <div>
          <h1>Posts</h1>
          <p class="posts__subtitle">
            Draft and schedule posts for your connected social accounts.
          </p>
        </div>
        <button type="button" class="btn btn--primary" (click)="onCreateNew()">
          + New post
        </button>
      </header>

      <ng-container *ngIf="items && items.length > 0; else emptyState">
        <table class="posts__table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Created</th>
              <th>Variants</th>
              <th>Scheduled</th>
              <th>Published</th>
              <th>Failed</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let post of items"
              (click)="openPost(post.id)"
              class="posts__row"
            >
              <td>{{ post.title || '(untitled post)' }}</td>
              <td>{{ post.createdAt | date: 'medium' }}</td>
              <td>{{ post.variantCount }}</td>
              <td>{{ post.scheduledCount }}</td>
              <td>{{ post.publishedCount }}</td>
              <td>{{ post.failedCount }}</td>
            </tr>
          </tbody>
        </table>
      </ng-container>

      <ng-template #emptyState>
        <div class="card posts__empty">
          <p>No posts yet.</p>
          <p class="posts__hint">
            Start by creating a post and scheduling it for one or more social accounts.
          </p>
        </div>
      </ng-template>
    </section>
  `,
  styles: [
    `
      .posts {
        padding: 1.5rem 0;
      }

      .posts__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .posts h1 {
        margin: 0 0 0.25rem;
        font-size: 1.5rem;
      }

      .posts__subtitle {
        margin: 0;
        color: #4b5563;
      }

      .posts__table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.95rem;
      }

      .posts__table th,
      .posts__table td {
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid #e5e7eb;
        text-align: left;
      }

      .posts__row {
        cursor: pointer;
      }

      .posts__row:hover {
        background-color: #f9fafb;
      }

      .posts__empty {
        padding: 1rem;
      }

      .posts__hint {
        margin-top: 0.25rem;
        color: #6b7280;
        font-size: 0.9rem;
      }
    `
  ]
})
export class PostListComponent implements OnInit {
  items: PostListItemDto[] = [];
  private workspaceId!: string;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: PostApiService
  ) {}

  ngOnInit(): void {
    this.workspaceId = this.route.snapshot.paramMap.get('workspaceId') as string;
    this.load();
  }

  private load(): void {
    this.api
      .listPosts(this.workspaceId, {
        pageNumber: 1,
        pageSize: 50
      })
      .subscribe(result => {
        this.items = result.items;
      });
  }

  onCreateNew(): void {
    this.router.navigate(['workspaces', this.workspaceId, 'posts', 'new']);
  }

  openPost(postId: string): void {
    this.router.navigate(['workspaces', this.workspaceId, 'posts', postId]);
  }
}