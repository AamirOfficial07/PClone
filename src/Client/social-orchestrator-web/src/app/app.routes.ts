import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'workspaces',
    canActivate: [authGuard],
    loadChildren: () => import('./workspaces/workspace.routes').then(m => m.WORKSPACE_ROUTES)
  },
  {
    path: '',
    redirectTo: 'workspaces',
    pathMatch: 'full'
  }
];