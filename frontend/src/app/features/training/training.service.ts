import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { switchMap } from 'rxjs';
import { ParticipantStatus, TrainingFilters, TrainingFormData, TrainingKpi, TrainingPage, TrainingSession, TrainingUser } from './training.models';
import type { ParticipantCorrection } from './training-participation';

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/trainings';
  private params(filters: TrainingFilters = {}): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return params;
  }
  list(filters?: TrainingFilters) { return this.http.get<TrainingSession[]>(this.baseUrl, { params: this.params(filters) }); }
  listPage(filters: TrainingFilters = {}) {
    return this.http.get<TrainingPage>(`${this.baseUrl}/page`, { params: this.params({ page: 0, size: 24, ...filters }) });
  }
  getKpis() { return this.http.get<TrainingKpi>(`${this.baseUrl}/kpi`); }
  getUsers() { return this.http.get<TrainingUser[]>(`${this.baseUrl}/users`); }
  get(id: string) { return this.http.get<TrainingSession>(`${this.baseUrl}/${id}`); }
  create(data: TrainingFormData) {
    return this.http.get('/api/v1/auth/csrf').pipe(switchMap(() => this.http.post<TrainingSession>(this.baseUrl, data)));
  }
  update(id: string, data: TrainingFormData) {
    return this.http.get('/api/v1/auth/csrf').pipe(switchMap(() => this.http.put<TrainingSession>(`${this.baseUrl}/${id}`, data)));
  }
  delete(id: string) {
    return this.http.get('/api/v1/auth/csrf').pipe(switchMap(() => this.http.delete<void>(`${this.baseUrl}/${id}`)));
  }
  register(sessionId: string, userId?: string) {
    return this.http.get('/api/v1/auth/csrf').pipe(switchMap(() => this.http.post<void>(
      `${this.baseUrl}/${sessionId}/participants`, userId ? { userId } : {})));
  }
  unregister(sessionId: string, userId: string) {
    return this.http.get('/api/v1/auth/csrf').pipe(switchMap(() => this.http.delete<void>(
      `${this.baseUrl}/${sessionId}/participants/${userId}`)));
  }
  updateParticipantStatus(sessionId: string, userId: string, status: ParticipantStatus) {
    return this.http.get('/api/v1/auth/csrf').pipe(switchMap(() => this.http.patch<void>(
      `${this.baseUrl}/${sessionId}/participants/${userId}/status`, { status })));
  }
  correctParticipant(sessionId: string, correction: ParticipantCorrection) {
    const { userId, ...command } = correction;
    return this.http.get('/api/v1/auth/csrf').pipe(switchMap(() => this.http.post<void>(
      `${this.baseUrl}/${sessionId}/participants/${userId}/corrections`, command)));
  }
}
