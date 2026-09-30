import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { AuthConfig, CurrentUser } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly currentUser = signal<CurrentUser | null>(null);

  config(): Observable<AuthConfig> {
    return this.http.get<AuthConfig>('/api/v1/auth/config');
  }

  loadCurrentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>('/api/v1/auth/me').pipe(
      tap(user => this.currentUser.set(user))
    );
  }

  loginLocal(email: string, password: string): Observable<CurrentUser> {
    return this.http.get('/api/v1/auth/csrf').pipe(
      switchMap(() => this.http.post<CurrentUser>('/api/v1/auth/login', { email, password })),
      tap(user => this.currentUser.set(user))
    );
  }

  loginWithMicrosoft(): void {
    window.location.assign('/oauth2/authorization/entra');
  }

  logout(): Observable<void> {
    return this.http.get('/api/v1/auth/csrf').pipe(
      switchMap(() => this.http.post<void>('/api/v1/auth/logout', {})),
      tap(() => this.currentUser.set(null))
    );
  }
}
