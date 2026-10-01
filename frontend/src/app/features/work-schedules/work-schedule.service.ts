import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateWorkScheduleRequest,
  UpdateWorkScheduleRequest,
  WorkScheduleProfile
} from './work-schedule.models';

@Injectable({ providedIn: 'root' })
export class WorkScheduleService {
  private readonly http = inject(HttpClient);
  private readonly adminUrl = '/api/v1/admin/work-schedules';
  private readonly userUrl = '/api/v1/work-schedules/me';

  listAll(includeInactive = true): Observable<WorkScheduleProfile[]> {
    const params = new HttpParams().set('includeInactive', includeInactive.toString());
    return this.http.get<WorkScheduleProfile[]>(this.adminUrl, { params });
  }

  getById(id: string): Observable<WorkScheduleProfile> {
    return this.http.get<WorkScheduleProfile>(`${this.adminUrl}/${id}`);
  }

  create(req: CreateWorkScheduleRequest): Observable<WorkScheduleProfile> {
    return this.http.post<WorkScheduleProfile>(this.adminUrl, req);
  }

  update(id: string, req: UpdateWorkScheduleRequest): Observable<WorkScheduleProfile> {
    return this.http.put<WorkScheduleProfile>(`${this.adminUrl}/${id}`, req);
  }

  setDefault(id: string): Observable<WorkScheduleProfile> {
    return this.http.post<WorkScheduleProfile>(`${this.adminUrl}/${id}/set-default`, {});
  }

  toggleActive(id: string): Observable<WorkScheduleProfile> {
    return this.http.post<WorkScheduleProfile>(`${this.adminUrl}/${id}/toggle-active`, {});
  }

  getMyWorkSchedule(): Observable<WorkScheduleProfile> {
    return this.http.get<WorkScheduleProfile>(this.userUrl);
  }
}
