import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RegisterUserRequest } from '../models/auth';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = `${environment.apiBaseUrl}/auth`;
    private currentUserSubject = new BehaviorSubject<LoginResponse | null>(this.getUserFromStorage());

    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient) { }

    public get currentUserValue(): LoginResponse | null {
        return this.currentUserSubject.value;
    }

    public get accessToken(): string | null {
        return this.currentUserValue?.accessToken || null;
    }

    register(request: RegisterUserRequest): Observable<any> {
        return this.http.post(`${this.apiUrl}/register`, request);
    }

    login(request: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${this.apiUrl}/login`, request).pipe(
            tap(response => {
                this.saveUserToStorage(response);
                this.currentUserSubject.next(response);
            })
        );
    }

    logout(): void {
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
    }

    private saveUserToStorage(user: LoginResponse): void {
        localStorage.setItem('user', JSON.stringify(user));
    }

    private getUserFromStorage(): LoginResponse | null {
        const userJson = localStorage.getItem('user');
        if (userJson) {
            try {
                return JSON.parse(userJson);
            } catch {
                return null;
            }
        }
        return null;
    }
}
