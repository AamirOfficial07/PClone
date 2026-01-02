import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreatePostRequest {
  workspaceId: string;
  title?: string | null;
  notes?: string | null;
}

export interface CreatePostVariantRequest {
  socialAccountId: string;
  type: string;
  text: string;
  linkUrl?: string | null;
  mediaAssetId?: string | null;
  scheduledAt: string;
}

export interface CreatePostWithVariantsRequest {
  post: CreatePostRequest;
  variants: CreatePostVariantRequest[];
}

export interface PostVariantSummaryDto {
  id: string;
  socialAccountId: string;
  type: string;
  text: string;
  state: string;
  scheduledAtUtc?: string | null;
  publishedAtUtc?: string | null;
  lastErrorMessage?: string | null;
}

export interface PostDetailDto {
  id: string;
  workspaceId: string;
  title?: string | null;
  notes?: string | null;
  createdByUserId: string;
  createdAt: string;
  variants: PostVariantSummaryDto[];
}

export interface PostListItemDto {
  id: string;
  title?: string | null;
  createdAt: string;
  variantCount: number;
  publishedCount: number;
  failedCount: number;
  scheduledCount: number;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class PostApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  createPost(workspaceId: string, payload: CreatePostWithVariantsRequest): Observable<PostDetailDto> {
    return this.http.post<PostDetailDto>(
      `${this.baseUrl}/workspaces/${workspaceId}/posts`,
      payload
    );
  }

  getPost(workspaceId: string, postId: string): Observable<PostDetailDto> {
    return this.http.get<PostDetailDto>(
      `${this.baseUrl}/workspaces/${workspaceId}/posts/${postId}`
    );
  }

  listPosts(
    workspaceId: string,
    params: {
      pageNumber?: number;
      pageSize?: number;
      state?: string;
      socialAccountId?: string;
      fromUtc?: string;
      toUtc?: string;
    } = {}
  ): Observable<PagedResult<PostListItemDto>> {
    const query: Record<string, string> = {};

    if (params.pageNumber != null) {
      query['pageNumber'] = String(params.pageNumber);
    }
    if (params.pageSize != null) {
      query['pageSize'] = String(params.pageSize);
    }
    if (params.state) {
      query['state'] = params.state;
    }
    if (params.socialAccountId) {
      query['socialAccountId'] = params.socialAccountId;
    }
    if (params.fromUtc) {
      query['fromUtc'] = params.fromUtc;
    }
    if (params.toUtc) {
      query['toUtc'] = params.toUtc;
    }

    const queryString = new URLSearchParams(query).toString();
    const url = queryString
      ? `${this.baseUrl}/workspaces/${workspaceId}/posts?${queryString}`
      : `${this.baseUrl}/workspaces/${workspaceId}/posts`;

    return this.http.get<PagedResult<PostListItemDto>>(url);
  }
}