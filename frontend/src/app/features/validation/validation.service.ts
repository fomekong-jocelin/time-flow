import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { ManagerTimesheetDetail, PendingTimesheetSummary, SubordinateSummary } from './validation.models';

export function problemMessage(error: unknown, fallback: string): string {
  const detail = (error as { error?: { detail?: unknown } })?.error?.detail;
  return typeof detail === 'string' && detail.length < 300 ? detail : fallback;
}

@Injectable({ providedIn: 'root' })
export class ValidationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/manager/timesheets';

  getSubordinates(): Observable<SubordinateSummary[]> {
    return this.http.get<SubordinateSummary[]>(`${this.baseUrl}/subordinates`);
  }

  listPending(
    status = 'SUBMITTED',
    weekStart?: string,
    userId?: string,
    projectId?: string,
    fromWeek?: string,
    toWeek?: string
  ): Observable<PendingTimesheetSummary[]> {
    let url = `${this.baseUrl}?status=${encodeURIComponent(status)}`;
    if (weekStart) url += `&weekStart=${encodeURIComponent(weekStart)}`;
    if (userId) url += `&userId=${encodeURIComponent(userId)}`;
    if (projectId) url += `&projectId=${encodeURIComponent(projectId)}`;
    if (fromWeek) url += `&fromWeek=${encodeURIComponent(fromWeek)}`;
    if (toWeek) url += `&toWeek=${encodeURIComponent(toWeek)}`;
    return this.http.get<PendingTimesheetSummary[]>(url);
  }

  getDetail(timesheetId: string): Observable<ManagerTimesheetDetail> {
    return this.http.get<ManagerTimesheetDetail>(`${this.baseUrl}/${timesheetId}`);
  }

  validate(timesheetId: string, comment?: string): Observable<ManagerTimesheetDetail> {
    return this.withCsrf(() => this.http.post<ManagerTimesheetDetail>(`${this.baseUrl}/${timesheetId}/validate`, { comment }));
  }

  reject(timesheetId: string, comment: string): Observable<ManagerTimesheetDetail> {
    return this.withCsrf(() => this.http.post<ManagerTimesheetDetail>(`${this.baseUrl}/${timesheetId}/reject`, { comment }));
  }

  private withCsrf<T>(request: () => Observable<T>): Observable<T> {
    return this.http.get('/api/v1/auth/csrf').pipe(switchMap(request));
  }
}
