import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError, firstValueFrom } from 'rxjs';
import { AuthRequest, AuthResponse } from '../models/user.model';
import { vi } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;
  let httpClientSpy: any;
  let routerSpy: any;

  const mockUser: AuthResponse = {
    userId: '1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'READER',
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
  };

  beforeEach(() => {
    httpClientSpy = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };
    routerSpy = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: httpClientSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });
    service = TestBed.inject(AuthService);
    
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should login successfully and save user to storage', async () => {
      const loginReq: AuthRequest = { usernameOrEmail: 'test@example.com', password: 'password' };
      httpClientSpy.post.mockReturnValue(of(mockUser));

      const response = await firstValueFrom(service.login(loginReq));
      expect(response).toEqual(mockUser);
      expect(localStorage.getItem('access_token')).toBe(mockUser.accessToken);
      expect(localStorage.getItem('user_data')).toContain(mockUser.email);

      expect(httpClientSpy.post).toHaveBeenCalledWith(expect.stringContaining('/auth/login'), expect.any(Object), expect.any(Object));
    });

    it('should handle login error', async () => {
      const errorResponse = new HttpErrorResponse({
        error: { message: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized'
      });
      httpClientSpy.post.mockReturnValue(throwError(() => errorResponse));

      try {
        await firstValueFrom(service.login({ usernameOrEmail: 'wrong', password: 'wrong' }));
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });
  });

  describe('logout', () => {
    it('should clear storage and navigate to login', () => {
      localStorage.setItem('access_token', 'some-token');
      httpClientSpy.post.mockReturnValue(of({}));

      service.logout();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('user_data')).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('role checks', () => {
    it('should identify admin correctly', () => {
      const adminUser = { ...mockUser, role: 'ROLE_ADMIN' };
      // Manually set state via a private method or by mocking getUserFromStorage
      // Since we can't easily access private members, we'll test via public API if possible
      // or rely on how the service initializes.
      
      // Let's use setSession which is public
      service.setSession(adminUser);
      expect(service.isAdmin()).toBe(true);
      expect(service.isAuthor()).toBe(false);
    });

    it('should identify author correctly', () => {
      const authorUser = { ...mockUser, role: 'ROLE_AUTHOR' };
      service.setSession(authorUser);
      expect(service.isAuthor()).toBe(true);
      expect(service.isAdmin()).toBe(false);
    });
  });

  describe('token handling', () => {
    it('should check if token is expired', () => {
      // Create a mock JWT with exp in the future
      const futureDate = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ exp: futureDate }));
      const token = `header.${payload}.signature`;

      expect(service.isTokenExpired(token)).toBe(false);

      // Create a mock JWT with exp in the past
      const pastDate = Math.floor(Date.now() / 1000) - 3600;
      const pastPayload = btoa(JSON.stringify({ exp: pastDate }));
      const pastToken = `header.${pastPayload}.signature`;

      expect(service.isTokenExpired(pastToken)).toBe(true);
    });
  });
});
