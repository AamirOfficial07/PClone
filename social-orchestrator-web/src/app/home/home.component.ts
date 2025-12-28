import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="home">
      <h1>Welcome to Social Orchestrator</h1>
      <p class="home__subtitle">
        This is your starting point for building social automation and orchestration flows.
      </p>
      <p class="home__hint">
        Use the navigation in the header to explore features as they are added.
      </p>
    </section>
  `,
  styles: [
    `
      .home {
        padding: 1.5rem 0;
      }

      .home h1 {
        margin: 0 0 0.5rem;
        font-size: 1.75rem;
      }

      .home__subtitle {
        margin: 0 0 0.75rem;
        color: #4b5563;
      }

      .home__hint {
        margin: 0;
        font-size: 0.9rem;
        color: #6b7280;
      }
    `
  ]
})
export class HomeComponent {}