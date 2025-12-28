import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiState, ApiStatusService } from './core/services/api-status.service';
import { Toast } from './core/models/toast';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  readonly toast$: Observable<Toast | null>;
  readonly apiState$: Observable<ApiState>;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly apiStatusService: ApiStatusService,
    public router: Router
  ) {
    this.toast$ = this.notificationService.toast$;
    this.apiState$ = this.apiStatusService.state$;
  }

  isAuthRoute(): boolean {
    return this.router.url.includes('/auth');
  }

  onDismissToast(): void {
    this.notificationService.clear();
  }
}