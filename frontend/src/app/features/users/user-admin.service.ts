import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { CurrentUser } from '../../core/auth/auth.models';

export type UserRole = CurrentUser['role'];
export type AccountType = 'LOCAL' | 'SSO';

export interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  accountType: AccountType;
  active: boolean;
  managerId: string | null;
  managerName: string | null;
  weeklyTargetMinutes: number;
  ssoLinked: boolean;
  locked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  workScheduleProfileId?: string | null;
  workScheduleProfileName?: string | null;
  dailyRate?: number | null;
}

export interface UserProfile {
  displayName: string;
  role: UserRole;
  managerId: string | null;
  weeklyTargetMinutes: number;
  workScheduleProfileId?: string | null;
  dailyRate?: number | null;
}

export interface NewUser extends UserProfile {
  email: string;
  accountType: AccountType;
  password?: string;
}

export const ROLE_OPTIONS: readonly { value: UserRole; label: string }[] = [
  { value: 'COLLABORATOR', label: 'Collaborateur' },
  { value: 'TRAINER', label: 'Formateur' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'DIRECTION', label: 'Direction' },
  { value: 'ADMIN', label: 'Administrateur' }
];

export const MANAGER_ROLES: readonly UserRole[] = ['MANAGER', 'DIRECTION', 'ADMIN'];

/** Message lisible renvoyé par le backend (ProblemDetail), sinon message générique. */
export function problemMessage(error: unknown, fallback: string): string {
  const detail = (error as { error?: { detail?: unknown } })?.error?.detail;
  return typeof detail === 'string' && detail.length < 300 ? detail : fallback;
}

@Injectable({ providedIn: 'root' })
export class UserAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/admin/users';

  list(): Observable<ManagedUser[]> {
    return this.http.get<ManagedUser[]>(this.baseUrl);
  }

  create(user: NewUser): Observable<unknown> {
    const { accountType, password, ...body } = user;
    return accountType === 'LOCAL'
      ? this.withCsrf(() => this.http.post(`${this.baseUrl}/local`, { ...body, password }))
      : this.withCsrf(() => this.http.post(`${this.baseUrl}/sso`, body));
  }

  update(id: string, profile: UserProfile): Observable<ManagedUser> {
    return this.withCsrf(() => this.http.put<ManagedUser>(`${this.baseUrl}/${id}`, profile));
  }

  setActive(id: string, active: boolean): Observable<ManagedUser> {
    return this.withCsrf(() => this.http.put<ManagedUser>(`${this.baseUrl}/${id}/active`, { active }));
  }

  resetPassword(id: string, password: string): Observable<void> {
    return this.withCsrf(() => this.http.post<void>(`${this.baseUrl}/${id}/password`, { password }));
  }

  unlock(id: string): Observable<void> {
    return this.withCsrf(() => this.http.post<void>(`${this.baseUrl}/${id}/unlock`, {}));
  }

  private withCsrf<T>(request: () => Observable<T>): Observable<T> {
    return this.http.get('/api/v1/auth/csrf').pipe(switchMap(request));
  }
}
