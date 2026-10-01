import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { AppShellComponent } from './core/layout/app-shell.component';
import { LoginPageComponent } from './features/auth/login-page.component';
import { TimesheetPageComponent } from './features/timesheets/timesheet-page.component';

export const routes: Routes = [
  { path: 'connexion', component: LoginPageComponent, title: 'Connexion · TimeFlow' },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'mes-temps' },
      { path: 'mes-temps', component: TimesheetPageComponent, title: 'Mes temps · TimeFlow' }
    ]
  },
  { path: '**', redirectTo: 'mes-temps' }
];
