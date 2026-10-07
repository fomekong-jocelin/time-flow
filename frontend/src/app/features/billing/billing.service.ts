import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BillingDetailItem, BillingOverview } from './billing.models';

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/billing';

  getOverview(period?: string, userId?: string, projectId?: string): Observable<BillingOverview> {
    const params = this.buildParams(period, userId, projectId);
    return this.http.get<BillingOverview>(`${this.baseUrl}/overview`, { params });
  }

  getDetails(period?: string, userId?: string, projectId?: string): Observable<BillingDetailItem[]> {
    const params = this.buildParams(period, userId, projectId);
    return this.http.get<BillingDetailItem[]>(`${this.baseUrl}/details`, { params });
  }

  exportExcel(period?: string, userId?: string, projectId?: string): Observable<Blob> {
    const params = this.buildParams(period, userId, projectId);
    return this.http.get(`${this.baseUrl}/export/excel`, {
      params,
      responseType: 'blob'
    });
  }

  exportCsv(period?: string, userId?: string, projectId?: string): Observable<Blob> {
    const params = this.buildParams(period, userId, projectId);
    return this.http.get(`${this.baseUrl}/export/csv`, {
      params,
      responseType: 'blob'
    });
  }

  triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private buildParams(period?: string, userId?: string, projectId?: string): HttpParams {
    let params = new HttpParams();
    if (period) params = params.set('period', period);
    if (userId) params = params.set('userId', userId);
    if (projectId) params = params.set('projectId', projectId);
    return params;
  }
}
