import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);

  return authService.isInitializing$.pipe(
    filter(isInit => !isInit),
    take(1),
    map(() => {
      if (authService.isLoggedIn()) {
        return true;
      }
      authService.redirectToLogin(state.url);
      return false;
    })
  );
};
