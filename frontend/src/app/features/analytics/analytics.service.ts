import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnalyticsOverview } from './analytics.models';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/analytics';

  getOverview(period?: string, userId?: string, projectId?: string): Observable<AnalyticsOverview> {
    let params = new HttpParams();
    if (period) params = params.set('period', period);
    if (userId) params = params.set('userId', userId);
    if (projectId) params = params.set('projectId', projectId);
    return this.http.get<AnalyticsOverview>(`${this.baseUrl}/overview`, { params });
  }
}
