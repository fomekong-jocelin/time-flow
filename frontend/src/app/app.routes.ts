import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { LoginPageComponent } from './features/auth/login-page.component';
import { TimesheetPageComponent } from './features/timesheets/timesheet-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mes-temps' },
  { path: 'connexion', component: LoginPageComponent },
  { path: 'mes-temps', component: TimesheetPageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'mes-temps' }
];
