import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Toast, ToastKind } from '../models/toast';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly toastSubject = new BehaviorSubject<Toast | null>(null);
  readonly toast$ = this.toastSubject.asObservable();

  private dismissTimeoutId: number | null = null;

  show(message: string, kind: ToastKind = 'info', durationMs = 3000): void {
    const toast: Toast = {
      id: Date.now(),
      kind,
      message
    };

    this.toastSubject.next(toast);

    if (this.dismissTimeoutId !== null) {
      clearTimeout(this.dismissTimeoutId);
    }

    this.dismissTimeoutId = window.setTimeout(() => {
      this.clear();
    }, durationMs);
  }

  showSuccess(message: string, durationMs = 3000): void {
    this.show(message, 'success', durationMs);
  }

  showError(message: string, durationMs = 4000): void {
    this.show(message, 'error', durationMs);
  }

  clear(): void {
    this.toastSubject.next(null);
    this.dismissTimeoutId = null;
  }
}