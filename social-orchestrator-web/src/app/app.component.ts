import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Observable } from 'rxjs';
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

  constructor(private readonly notificationService: NotificationService) {
    this.toast$ = this.notificationService.toast$;
  }

  onDismissToast(): void {
    this.notificationService.clear();
  }
}