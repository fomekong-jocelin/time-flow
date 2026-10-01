import { Routes } from '@angular/router';
import { TimesheetPageComponent } from './features/timesheets/timesheet-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mes-temps' },
  { path: 'mes-temps', component: TimesheetPageComponent },
  { path: '**', redirectTo: 'mes-temps' }
];
