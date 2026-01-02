import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SocialAccountSummary } from '../core/models/social-account';

@Injectable({
  providedIn: 'root'
})
export class SocialAccountApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) { }

  getSocialAccounts(workspaceId: string): Observable<SocialAccountSummary[]> {
    return this.http.get<SocialAccountSummary[]>(`${this.baseUrl}/workspaces/${workspaceId}/social-accounts`);
  }

  disconnectSocialAccount(workspaceId: string, socialAccountId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/workspaces/${workspaceId}/social-accounts/${socialAccountId}`);
  }

  getFacebookAuthorizeUrl(workspaceId: string): Observable<{ authorizationUrl: string }> {
    return this.http.get<{ authorizationUrl: string }>(
      `${this.baseUrl}/oauth/facebook/authorize`,
      { params: { workspaceId } }
    );
  }
}