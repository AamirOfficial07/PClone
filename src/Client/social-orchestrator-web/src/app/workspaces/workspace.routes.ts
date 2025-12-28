import { Routes } from '@angular/router';
import { WorkspaceListComponent } from './workspace-list/workspace-list.component';
import { CreateWorkspaceComponent } from './create-workspace/create-workspace.component';

export const WORKSPACE_ROUTES: Routes = [
    { path: '', component: WorkspaceListComponent },
    { path: 'create', component: CreateWorkspaceComponent }
];
