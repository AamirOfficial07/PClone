import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { first } from 'rxjs/operators';
import { NotificationService } from '../../core/services/notification.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="auth-title">Welcome back</h1>
          <p class="auth-subtitle">Sign in to your account to continue</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email" class="form-label">Email address</label>
            <input
              type="email"
              id="email"
              class="form-control"
              formControlName="email"
              [class.error]="f['email'].touched && f['email'].invalid"
              placeholder="you@example.com"
            />
            <div *ngIf="f['email'].touched && f['email'].errors" class="form-error">
              <div *ngIf="f['email'].errors['required']">Email is required</div>
              <div *ngIf="f['email'].errors['email']">Please enter a valid email</div>
            </div>
          </div>

          <div class="form-group">
            <div class="d-flex justify-between">
              <label for="password" class="form-label">Password</label>
            </div>
            <input
              type="password"
              id="password"
              class="form-control"
              formControlName="password"
              [class.error]="f['password'].touched && f['password'].invalid"
              placeholder="••••••••"
            />
            <div *ngIf="f['password'].touched && f['password'].errors" class="form-error">
              <div *ngIf="f['password'].errors['required']">Password is required</div>
            </div>
          </div>

          <button type="submit" class="btn btn--primary btn--block mt-4" [disabled]="loading || loginForm.invalid">
            <span *ngIf="loading">Signing in...</span>
            <span *ngIf="!loading">Sign in</span>
          </button>

          <p class="text-center mt-4 auth-subtitle">
            Don't have an account? 
            <a routerLink="/auth/register">Sign up</a>
          </p>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent {
    loginForm: FormGroup;
    loading = false;
    returnUrl: string;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private authService: AuthService,
        private notificationService: NotificationService
    ) {
        // Redirect to home if already logged in
        if (this.authService.currentUserValue) {
            this.router.navigate(['/']);
        }

        this.loginForm = this.formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required]
        });

        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/workspaces';
    }

    get f() { return this.loginForm.controls; }

    onSubmit() {
        if (this.loginForm.invalid) {
            return;
        }

        this.loading = true;
        this.authService.login(this.loginForm.value)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.router.navigate([this.returnUrl]);
                },
                error: error => {
                    console.error(error);
                    this.notificationService.showError(error.error?.error || 'Login failed');
                    this.loading = false;
                }
            });
    }
}
