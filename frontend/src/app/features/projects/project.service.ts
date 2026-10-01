import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { switchMap } from 'rxjs';

export interface Project {
  id: string;
  name: string;
  source: string;
  organization: string | null;
  active: boolean;
  billableDefault: boolean;
  reference: string | null;
}
export interface Integration {
  configured: boolean;
  latestRun: { status: string; startedAt: string; importedCount: number } | null;
}
@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly integrationUrl = '/api/v1/admin/integrations/azure/projects';
  list() { return this.http.get<Project[]>('/api/v1/projects'); }
  integration() { return this.http.get<Integration>(this.integrationUrl); }
  workbook(template: boolean) {
    return this.http.get(`/api/v1/admin/projects/excel/${template ? 'template' : 'export'}`, { responseType: 'blob' });
  }
  importWorkbook(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.get('/api/v1/auth/csrf').pipe(
      switchMap(() => this.http.post<{ importedCount: number }>('/api/v1/admin/projects/excel/import', body))
    );
  }
  synchronize() {
    return this.http.get('/api/v1/auth/csrf').pipe(
      switchMap(() => this.http.post<{ importedCount: number }>(`${this.integrationUrl}/sync`, {}))
    );
  }
}
