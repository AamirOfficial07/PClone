import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PostApiService, PostDetailDto } from '../post-api.service';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="post-detail" *ngIf="post">
      <h1>{{ post.title || '(untitled post)' }}</h1>
      <p class="post-detail__meta">
        Created {{ post.createdAt | date: 'medium' }}
      </p>

      <div *ngIf="post.notes" class="post-detail__notes card">
        <h2>Notes</h2>
        <p>{{ post.notes }}</p>
      </div>

      <section class="post-detail__variants">
        <h2>Variants</h2>

        <table class="post-detail__table">
          <thead>
            <tr>
              <th>Social account</th>
              <th>Type</th>
              <th>Text</th>
              <th>State</th>
              <th>Scheduled</th>
              <th>Published</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let v of post.variants">
              <td>{{ v.socialAccountId }}</td>
              <td>{{ v.type }}</td>
              <td class="post-detail__text">
                {{ v.text }}
              </td>
              <td>{{ v.state }}</td>
              <td>{{ v.scheduledAtUtc | date: 'short' }}</td>
              <td>{{ v.publishedAtUtc | date: 'short' }}</td>
              <td class="post-detail__error">
                {{ v.lastErrorMessage }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </section>
  `,
  styles: [
    `
      .post-detail {
        padding: 1.5rem 0;
      }

      .post-detail h1 {
        margin: 0 0 0.5rem;
        font-size: 1.5rem;
      }

      .post-detail__meta {
        margin: 0 0 1rem;
        color: #6b7280;
      }

      .post-detail__notes {
        padding: 0.75rem 0.9rem;
        margin-bottom: 1rem;
      }

      .post-detail__variants h2 {
        margin-bottom: 0.5rem;
      }

      .post-detail__table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
      }

      .post-detail__table th,
      .post-detail__table td {
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid #e5e7eb;
        text-align: left;
        vertical-align: top;
      }

      .post-detail__text {
        max-width: 320px;
        white-space: pre-wrap;
      }

      .post-detail__error {
        color: #b91c1c;
        max-width: 240px;
        white-space: pre-wrap;
      }
    `
  ]
})
export class PostDetailComponent implements OnInit {
  post: PostDetailDto | null = null;
  private workspaceId!: string;
  private postId!: string;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: PostApiService
  ) {}

  ngOnInit(): void {
    this.workspaceId = this.route.snapshot.paramMap.get('workspaceId') as string;
    this.postId = this.route.snapshot.paramMap.get('postId') as string;

    this.api.getPost(this.workspaceId, this.postId).subscribe(detail => {
      this.post = detail;
    });
  }
}