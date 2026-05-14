import { TestBed } from '@angular/core/testing';
import { RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { of, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

describe('authGuard', () => {
  let authServiceSpy: any;

  beforeEach(() => {
    authServiceSpy = {
      isInitializing$: of(false),
      isLoggedIn: vi.fn(),
      redirectToLogin: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });
  });

  it('should allow navigation if logged in', async () => {
    authServiceSpy.isLoggedIn.mockReturnValue(true);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/protected' } as RouterStateSnapshot;

    await TestBed.runInInjectionContext(async () => {
      const result = authGuard(route, state);
      const res = await firstValueFrom(result as any);
      expect(res).toBe(true);
    });
  });

  it('should redirect to login if not logged in', async () => {
    authServiceSpy.isLoggedIn.mockReturnValue(false);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/protected' } as RouterStateSnapshot;

    await TestBed.runInInjectionContext(async () => {
      const result = authGuard(route, state);
      const res = await firstValueFrom(result as any);
      expect(res).toBe(false);
      expect(authServiceSpy.redirectToLogin).toHaveBeenCalledWith('/protected');
    });
  });
});
