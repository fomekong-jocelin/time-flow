import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
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
    return new Observable<CurrentUser>(subscriber => {
      this.http.get('/api/v1/auth/csrf').subscribe({
        next: () => this.http.post<CurrentUser>('/api/v1/auth/login', { email, password }).subscribe({
          next: user => {
            this.currentUser.set(user);
            subscriber.next(user);
            subscriber.complete();
          },
          error: error => subscriber.error(error)
        }),
        error: error => subscriber.error(error)
      });
    });
  }

  loginWithMicrosoft(): void {
    window.location.assign('/oauth2/authorization/entra');
  }

  logout(): void {
    this.http.get('/api/v1/auth/csrf').subscribe(() => {
      this.http.post<void>('/api/v1/auth/logout', {}).subscribe({
        next: () => {
          this.currentUser.set(null);
          window.location.assign('/connexion');
        }
      });
    });
  }
}
