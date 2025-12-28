import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { WorkflowsComponent } from './workflows/workflows.component';
import { WorkflowDetailComponent } from './workflows/workflow-detail.component';
import { SettingsComponent } from './settings/settings.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'workflows',
    component: WorkflowsComponent
  },
  {
    path: 'workflows/:id',
    component: WorkflowDetailComponent
  },
  {
    path: 'settings',
    component: SettingsComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];