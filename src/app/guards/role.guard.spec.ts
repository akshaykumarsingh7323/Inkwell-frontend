import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { of, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

describe('roleGuard', () => {
  let authServiceSpy: any;
  let routerSpy: any;

  beforeEach(() => {
    authServiceSpy = {
      isInitializing$: of(false),
      currentUser$: of({ role: 'READER' }),
      isLoggedIn: vi.fn(),
      hasAnyRole: vi.fn(),
      redirectToLogin: vi.fn(),
      getDefaultRouteForRole: vi.fn()
    };
    routerSpy = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });
  });

  it('should allow navigation if user has required role', async () => {
    authServiceSpy.isLoggedIn.mockReturnValue(true);
    authServiceSpy.hasAnyRole.mockReturnValue(true);

    const guard = roleGuard(['READER']);
    
    await TestBed.runInInjectionContext(async () => {
      const result = await firstValueFrom(guard({} as any, {} as any) as any);
      expect(result).toBe(true);
    });
  });

  it('should redirect if user is not logged in', async () => {
    authServiceSpy.isLoggedIn.mockReturnValue(false);
    authServiceSpy.currentUser$ = of(null);

    const guard = roleGuard(['ADMIN']);
    
    await TestBed.runInInjectionContext(async () => {
      const result = await firstValueFrom(guard({} as any, {} as any) as any);
      expect(result).toBe(false);
      expect(authServiceSpy.redirectToLogin).toHaveBeenCalled();
    });
  });

  it('should redirect to default route if user has wrong role', async () => {
    authServiceSpy.isLoggedIn.mockReturnValue(true);
    authServiceSpy.hasAnyRole.mockReturnValue(false);
    authServiceSpy.getDefaultRouteForRole.mockReturnValue('/home');

    const guard = roleGuard(['ADMIN']);
    
    await TestBed.runInInjectionContext(async () => {
      const result = await firstValueFrom(guard({} as any, {} as any) as any);
      expect(result).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });
  });
});
