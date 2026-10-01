import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateHolidayRequest, PublicHoliday, UpdateHolidayRequest } from './work-schedule.models';

@Injectable({ providedIn: 'root' })
export class PublicHolidayService {
  private readonly http = inject(HttpClient);
  private readonly holidaysUrl = '/api/v1/holidays';

  listHolidays(year?: number): Observable<PublicHoliday[]> {
    let params = new HttpParams();
    if (year != null) {
      params = params.set('year', year.toString());
    }
    return this.http.get<PublicHoliday[]>(this.holidaysUrl, { params });
  }

  createHoliday(req: CreateHolidayRequest): Observable<PublicHoliday> {
    return this.http.post<PublicHoliday>(this.holidaysUrl, req);
  }

  updateHoliday(id: string, req: UpdateHolidayRequest): Observable<PublicHoliday> {
    return this.http.put<PublicHoliday>(`${this.holidaysUrl}/${id}`, req);
  }

  deleteHoliday(id: string): Observable<void> {
    return this.http.delete<void>(`${this.holidaysUrl}/${id}`);
  }
}
