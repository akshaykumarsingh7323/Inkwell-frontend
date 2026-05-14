import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { of, throwError, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

describe('authInterceptor', () => {
  let authServiceSpy: any;

  beforeEach(() => {
    authServiceSpy = {
      getToken: vi.fn(),
      isTokenExpired: vi.fn(),
      refreshToken: vi.fn(),
      logout: vi.fn(),
      getCurrentUserSnapshot: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });
  });

  it('should add Authorization header when token exists', async () => {
    authServiceSpy.getToken.mockReturnValue('valid-token');
    authServiceSpy.isTokenExpired.mockReturnValue(false);
    authServiceSpy.getCurrentUserSnapshot.mockReturnValue({ userId: '1', role: 'READER' });

    const req = new HttpRequest('GET', '/api/posts');
    const next: HttpHandlerFn = (clonedReq) => {
      expect(clonedReq.headers.get('Authorization')).toBe('Bearer valid-token');
      expect(clonedReq.headers.get('X-User-Id')).toBe('1');
      expect(clonedReq.headers.get('X-User-Role')).toBe('READER');
      return of({} as HttpEvent<any>);
    };

    await TestBed.runInInjectionContext(async () => {
      await firstValueFrom(authInterceptor(req, next));
    });
  });

  it('should attempt refresh when token is expired', async () => {
    authServiceSpy.getToken.mockReturnValue('expired-token');
    authServiceSpy.isTokenExpired.mockReturnValue(true);
    authServiceSpy.refreshToken.mockReturnValue(of({ accessToken: 'new-token' }));
    authServiceSpy.getCurrentUserSnapshot.mockReturnValue({});

    const req = new HttpRequest('GET', '/api/posts');
    let headerCheck = false;
    const next: HttpHandlerFn = (clonedReq) => {
      if (clonedReq.headers.get('Authorization') === 'Bearer new-token') {
        headerCheck = true;
      }
      return of({} as HttpEvent<any>);
    };

    await TestBed.runInInjectionContext(async () => {
      await firstValueFrom(authInterceptor(req, next));
    });
    expect(headerCheck).toBe(true);
  });

  it('should not add headers for login request', async () => {
    authServiceSpy.getToken.mockReturnValue('valid-token');
    const req = new HttpRequest('POST', '/auth/login', {});
    const next: HttpHandlerFn = (clonedReq) => {
      expect(clonedReq.headers.has('Authorization')).toBeFalsy();
      return of({} as HttpEvent<any>);
    };

    await TestBed.runInInjectionContext(async () => {
      await firstValueFrom(authInterceptor(req, next));
    });
  });
});
