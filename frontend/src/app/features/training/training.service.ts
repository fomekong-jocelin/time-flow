import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { switchMap } from 'rxjs';
import { ParticipantStatus, TrainingFormData, TrainingKpi, TrainingSession } from './training.models';

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/trainings';

  list(filters?: { query?: string; status?: string; category?: string; trainerId?: string; onlyMine?: boolean }) {
    let params = new HttpParams();
    if (filters?.query) params = params.set('query', filters.query);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.trainerId) params = params.set('trainerId', filters.trainerId);
    if (filters?.onlyMine !== undefined) params = params.set('onlyMine', filters.onlyMine);

    return this.http.get<TrainingSession[]>(this.baseUrl, { params });
  }

  getKpis() {
    return this.http.get<TrainingKpi>(`${this.baseUrl}/kpi`);
  }

  get(id: string) {
    return this.http.get<TrainingSession>(`${this.baseUrl}/${id}`);
  }

  create(data: TrainingFormData) {
    return this.http.get('/api/v1/auth/csrf').pipe(
      switchMap(() => this.http.post<TrainingSession>(this.baseUrl, data))
    );
  }

  update(id: string, data: TrainingFormData) {
    return this.http.get('/api/v1/auth/csrf').pipe(
      switchMap(() => this.http.put<TrainingSession>(`${this.baseUrl}/${id}`, data))
    );
  }

  delete(id: string) {
    return this.http.get('/api/v1/auth/csrf').pipe(
      switchMap(() => this.http.delete<void>(`${this.baseUrl}/${id}`))
    );
  }

  register(sessionId: string, userId?: string) {
    return this.http.get('/api/v1/auth/csrf').pipe(
      switchMap(() => this.http.post<void>(`${this.baseUrl}/${sessionId}/participants`, userId ? { userId } : {}))
    );
  }

  unregister(sessionId: string, userId: string) {
    return this.http.get('/api/v1/auth/csrf').pipe(
      switchMap(() => this.http.delete<void>(`${this.baseUrl}/${sessionId}/participants/${userId}`))
    );
  }

  updateParticipantStatus(sessionId: string, userId: string, status: ParticipantStatus) {
    return this.http.get('/api/v1/auth/csrf').pipe(
      switchMap(() => this.http.patch<void>(`${this.baseUrl}/${sessionId}/participants/${userId}/status`, { status }))
    );
  }
}
