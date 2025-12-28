import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HealthResponse } from '../api/api-types';

export type ApiMode = 'mock' | 'live';
export type ApiStatus = 'unknown' | 'online' | 'offline';

export interface ApiState {
  mode: ApiMode;
  status: ApiStatus;
}

@Injectable({
  providedIn: 'root'
})
export class ApiStatusService {
  private readonly stateSubject = new BehaviorSubject<ApiState>({
    mode: environment.useMockApi ? 'mock' : 'live',
    status: environment.useMockApi ? 'online' : 'unknown'
  });

  readonly state$: Observable<ApiState> = this.stateSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    if (!environment.useMockApi) {
      this.checkHealth();
    }
  }

  checkHealth(): void {
    if (environment.useMockApi) {
      this.stateSubject.next({
        mode: 'mock',
        status: 'online'
      });
      return;
    }

    this.stateSubject.next({
      mode: 'live',
      status: 'unknown'
    });

    this.http.get<HealthResponse>(`${environment.apiBaseUrl}/health`).subscribe({
      next: (response) => {
        const ok = typeof response?.ok === 'boolean' ? response.ok : true;

        this.stateSubject.next({
          mode: 'live',
          status: ok ? 'online' : 'offline'
        });
      },
      error: () => {
        this.stateSubject.next({
          mode: 'live',
          status: 'offline'
        });
      }
    });
  }
}