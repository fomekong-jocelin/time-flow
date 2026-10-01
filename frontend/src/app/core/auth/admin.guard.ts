import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Confort UX uniquement : l'autorisation ADMIN reste appliquée par le backend. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.currentUser()?.role === 'ADMIN' || inject(Router).createUrlTree(['/mes-temps']);
};

export const adminOrDirectionGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const role = auth.currentUser()?.role;
  return role === 'ADMIN' || role === 'DIRECTION' || inject(Router).createUrlTree(['/mes-temps']);
};
