import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';
import { vi } from 'vitest';

describe('guestGuard', () => {
  let authServiceSpy: any;
  let routerSpy: any;

  beforeEach(() => {
    authServiceSpy = {
      isLoggedIn: vi.fn(),
      getCurrentUserSnapshot: vi.fn(),
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

  it('should allow navigation if NOT logged in', () => {
    authServiceSpy.isLoggedIn.mockReturnValue(false);

    TestBed.runInInjectionContext(() => {
      const result = guestGuard({} as any, {} as any);
      expect(result).toBe(true);
    });
  });

  it('should redirect if logged in', () => {
    authServiceSpy.isLoggedIn.mockReturnValue(true);
    authServiceSpy.getCurrentUserSnapshot.mockReturnValue({ role: 'READER' });
    authServiceSpy.getDefaultRouteForRole.mockReturnValue('/home');

    TestBed.runInInjectionContext(() => {
      const result = guestGuard({} as any, {} as any);
      expect(result).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });
  });
});
