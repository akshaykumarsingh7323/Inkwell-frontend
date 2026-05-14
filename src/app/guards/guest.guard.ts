import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Guard to prevent authenticated users from accessing login/register pages.
 * If logged in, redirects to the dashboard.
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.getCurrentUserSnapshot();

  if (!authService.isLoggedIn()) {
    return true;
  }

  router.navigate([authService.getDefaultRouteForRole(user?.role)]);
  return false;
};
