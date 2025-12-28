import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { first } from 'rxjs/operators';
import { NotificationService } from '../../core/services/notification.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="auth-title">Create an account</h1>
          <p class="auth-subtitle">Start organizing your social presence today</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          
          <div class="form-group">
            <label for="displayName" class="form-label">Full Name</label>
            <input
              type="text"
              id="displayName"
              class="form-control"
              formControlName="displayName"
              placeholder="John Doe"
            />
          </div>

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
            <label for="password" class="form-label">Password</label>
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
              <div *ngIf="f['password'].errors['minlength']">Password must be at least 6 characters</div>
            </div>
          </div>

          <button type="submit" class="btn btn--primary btn--block mt-4" [disabled]="loading || registerForm.invalid">
            <span *ngIf="loading">Creating account...</span>
            <span *ngIf="!loading">Create account</span>
          </button>

          <p class="text-center mt-4 auth-subtitle">
            Already have an account? 
            <a routerLink="/auth/login">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  `
})
export class RegisterComponent {
    registerForm: FormGroup;
    loading = false;

    constructor(
        private formBuilder: FormBuilder,
        private router: Router,
        private authService: AuthService,
        private notificationService: NotificationService
    ) {
        if (this.authService.currentUserValue) {
            this.router.navigate(['/']);
        }

        this.registerForm = this.formBuilder.group({
            displayName: [''],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    get f() { return this.registerForm.controls; }

    onSubmit() {
        if (this.registerForm.invalid) {
            return;
        }

        this.loading = true;
        this.authService.register(this.registerForm.value)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.notificationService.showSuccess('Registration successful! Please log in.');
                    this.router.navigate(['/auth/login']);
                },
                error: error => {
                    console.error(error);
                    this.notificationService.showError(error.error?.error || 'Registration failed');
                    this.loading = false;
                }
            });
    }
}
