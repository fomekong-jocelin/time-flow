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
  dailyRate?: number | null;
  budgetDays?: number | null;
  totalPrice?: number | null;
  currency?: string;
}

export interface ProjectFormData {
  name: string;
  active: boolean;
  billableDefault: boolean;
  dailyRate: number | null;
  budgetDays: number | null;
  totalPrice: number | null;
  currency: string;
}

export interface Integration {
  configured: boolean;
  latestRun: { status: string; startedAt: string; importedCount: number } | null;
}

export const PRESET_CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'XAF', symbol: 'FCFA', label: 'XAF (FCFA)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'CHF', symbol: 'CHF', label: 'CHF (CHF)' },
  { code: 'CAD', symbol: '$ CA', label: 'CAD ($ CA)' }
] as const;

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly integrationUrl = '/api/v1/admin/integrations/azure/projects';
  private readonly adminProjectsUrl = '/api/v1/admin/projects';

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

  create(data: ProjectFormData) {
    return this.http.get('/api/v1/auth/csrf').pipe(
      switchMap(() => this.http.post<Project>(this.adminProjectsUrl, data))
    );
  }

  update(id: string, data: ProjectFormData) {
    return this.http.get('/api/v1/auth/csrf').pipe(
      switchMap(() => this.http.put<Project>(`${this.adminProjectsUrl}/${id}`, data))
    );
  }
}
