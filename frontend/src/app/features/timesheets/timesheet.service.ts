import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { ActiveProject, SaveTimesheetPayload, TimesheetOverview } from './timesheet.models';

export function problemMessage(error: unknown, fallback: string): string {
  const detail = (error as { error?: { detail?: unknown } })?.error?.detail;
  return typeof detail === 'string' && detail.length < 300 ? detail : fallback;
}

@Injectable({ providedIn: 'root' })
export class TimesheetService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/timesheets';

  getTimesheet(weekStart?: string): Observable<TimesheetOverview> {
    const url = weekStart ? `${this.baseUrl}?weekStart=${weekStart}` : this.baseUrl;
    return this.http.get<TimesheetOverview>(url);
  }

  saveDraft(weekStart: string, payload: SaveTimesheetPayload): Observable<TimesheetOverview> {
    return this.withCsrf(() => this.http.put<TimesheetOverview>(`${this.baseUrl}/${weekStart}`, payload));
  }

  submit(weekStart: string, payload?: SaveTimesheetPayload): Observable<TimesheetOverview> {
    return this.withCsrf(() => this.http.post<TimesheetOverview>(`${this.baseUrl}/${weekStart}/submit`, payload ?? null));
  }

  getActiveProjects(): Observable<ActiveProject[]> {
    return this.http.get<ActiveProject[]>('/api/v1/projects').pipe(
      map(projects => projects.filter(p => p.active))
    );
  }

  private withCsrf<T>(request: () => Observable<T>): Observable<T> {
    return this.http.get('/api/v1/auth/csrf').pipe(switchMap(request));
  }
}
