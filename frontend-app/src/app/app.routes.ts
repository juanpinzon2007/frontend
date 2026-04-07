import { Routes } from '@angular/router';
import { AuthPageComponent } from './auth/auth-page.component';
import { authGuard } from './core/auth.guard';
import { guestGuard } from './core/guest.guard';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: 'login',
    component: AuthPageComponent,
    canActivate: [guestGuard]
  },
  {
    path: 'workspace',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'workspace'
  },
  {
    path: '**',
    redirectTo: 'workspace'
  }
];
