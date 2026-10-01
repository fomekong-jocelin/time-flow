import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

const MANAGER_ROLES = ['MANAGER', 'DIRECTION', 'ADMIN'];

/** Confort UX uniquement : l'autorisation manager reste appliquée par le backend. */
export const managerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const role = auth.currentUser()?.role;
  return (role && MANAGER_ROLES.includes(role)) || inject(Router).createUrlTree(['/mes-temps']);
};
