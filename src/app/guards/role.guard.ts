import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, switchMap, take } from 'rxjs/operators';

export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.isInitializing$.pipe(
      filter(isInit => !isInit),
      switchMap(() => authService.currentUser$),
      take(1),
      map(user => {
        if (!user || !user.role || !authService.isLoggedIn()) {
          authService.redirectToLogin();
          return false;
        }

        if (authService.hasAnyRole(allowedRoles, user)) {
          return true;
        }

        router.navigate([authService.getDefaultRouteForRole(user.role)]);
        return false;
      })
    );
  };
}
