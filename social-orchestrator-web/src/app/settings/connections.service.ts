import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Connection, ConnectionPlatform, ConnectionStatus } from '../core/models/connection';
import { NotificationService } from '../core/services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class ConnectionsService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  private readonly connectionsSubject = new BehaviorSubject<Connection[]>([
    {
      id: 'twitter-main',
      platform: 'twitter',
      label: 'Twitter / X',
      handle: '@acme',
      status: 'connected',
      createdAt: '2025-01-01T10:00:00.000Z',
      lastSyncAt: '2025-01-04T15:30:00.000Z'
    },
    {
      id: 'linkedin-company',
      platform: 'linkedin',
      label: 'LinkedIn Company Page',
      handle: 'Acme Inc.',
      status: 'connected',
      createdAt: '2025-01-02T09:15:00.000Z',
      lastSyncAt: '2025-01-04T11:00:00.000Z'
    }
  ]);

  readonly connections$: Observable<Connection[]> = this.connectionsSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly notificationService: NotificationService
  ) {
    if (!environment.useMockApi) {
      this.loadFromApi();
    }
  }

  getAll(): Observable<Connection[]> {
    return this.connections$;
  }

  private getSnapshot(): Connection[] {
    return this.connectionsSubject.value;
  }

  private loadFromApi(): void {
    this.http.get<Connection[]>(`${this.apiBaseUrl}/connections`).subscribe({
      next: (connections) => this.connectionsSubject.next(connections),
      error: () => {
        this.notificationService.showError('Could not load connections from the server.');
      }
    });
  }

  connect(input: {
    platform: ConnectionPlatform;
    handle: string;
    label: string;
  }): Connection {
    const now = new Date().toISOString();
    const baseId =
      input.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'connection';

    const current = this.getSnapshot();

    let candidateId = baseId;
    let suffix = 1;

    while (current.some((connection) => connection.id === candidateId)) {
      candidateId = `${baseId}-${suffix++}`;
    }

    const connection: Connection = {
      id: candidateId,
      platform: input.platform,
      label: input.label.trim(),
      handle: input.handle.trim(),
      status: 'connected',
      createdAt: now,
      lastSyncAt: now
    };

    this.connectionsSubject.next([...current, connection]);

    if (!environment.useMockApi) {
      this.http.post<Connection>(`${this.apiBaseUrl}/connections`, connection).subscribe({
        error: () => {
          this.notificationService.showError('Could not save the connection to the server.');
        }
      });
    }

    return connection;
  }

  disconnect(id: string): boolean {
    const current = this.getSnapshot();
    const index = current.findIndex((connection) => connection.id === id);

    if (index === -1) {
      return false;
    }

    const existing = current[index];

    const updated: Connection = {
      ...existing,
      status: 'disconnected',
      lastSyncAt: new Date().toISOString()
    };

    const next = [...current];
    next[index] = updated;

    this.connectionsSubject.next(next);

    if (!environment.useMockApi) {
      this.http
        .patch<Connection>(`${this.apiBaseUrl}/connections/${id}`, { status: 'disconnected' })
        .subscribe({
          error: () => {
            this.notificationService.showError(
              'Could not disconnect the connection on the server.'
            );
          }
        });
    }

    return true;
  }

  setStatus(id: string, status: ConnectionStatus): boolean {
    const current = this.getSnapshot();
    const index = current.findIndex((connection) => connection.id === id);

    if (index === -1) {
      return false;
    }

    const existing = current[index];

    const updated: Connection = {
      ...existing,
      status,
      lastSyncAt: new Date().toISOString()
    };

    const next = [...current];
    next[index] = updated;

    this.connectionsSubject.next(next);

    if (!environment.useMockApi) {
      this.http
        .patch<Connection>(`${this.apiBaseUrl}/connections/${id}`, { status })
        .subscribe({
          error: () => {
            this.notificationService.showError('Could not update the connection on the server.');
          }
        });
    }

    return true;
  }
}