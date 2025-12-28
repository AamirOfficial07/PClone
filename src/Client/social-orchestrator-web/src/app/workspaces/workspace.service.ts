import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateWorkspaceRequest, WorkspaceSummary } from '../core/models/workspace';

@Injectable({
    providedIn: 'root'
})
export class WorkspaceService {
    private apiUrl = `${environment.apiBaseUrl}/workspaces`;

    constructor(private http: HttpClient) { }

    getAll(): Observable<WorkspaceSummary[]> {
        return this.http.get<WorkspaceSummary[]>(this.apiUrl);
    }

    create(request: CreateWorkspaceRequest): Observable<WorkspaceSummary> {
        return this.http.post<WorkspaceSummary>(this.apiUrl, request);
    }
}
