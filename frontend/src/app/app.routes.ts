import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { authGuard } from './core/auth/auth.guard';
import { managerGuard } from './core/auth/manager.guard';
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
      { path: 'mes-temps', component: TimesheetPageComponent, title: 'Mes temps · TimeFlow' },
      { path: 'validation', canActivate: [managerGuard], loadComponent: () => import('./features/validation/validation-page.component').then(m => m.ValidationPageComponent), title: 'Validation · TimeFlow' },
      { path: 'admin/utilisateurs', canActivate: [adminGuard], loadComponent: () => import('./features/users/users-page.component').then(m => m.UsersPageComponent), title: 'Utilisateurs · TimeFlow' },
      { path: 'projets', loadComponent: () => import('./features/projects/projects-page.component').then(m => m.ProjectsPageComponent), title: 'Projets · TimeFlow' }
    ]
  },
  { path: '**', redirectTo: 'mes-temps' }
];
