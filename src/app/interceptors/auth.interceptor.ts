import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const isPublicAuthRequest = req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/forgot-password') ||
    req.url.includes('/auth/reset-password');
  const isRefreshRequest = req.url.includes('/auth/refresh');
  const isPublicEndpoint = isPublicRequest(req.url, req.method);

  if (token && !isPublicAuthRequest && !isRefreshRequest) {
    console.debug(`[AuthInterceptor] Attaching token to request: ${req.url}`);
    if (authService.isTokenExpired(token) && !isRefreshRequest) {
      console.warn(`[AuthInterceptor] Token expired, attempting refresh...`);
      return authService.refreshToken().pipe(
        switchMap((response) => {
          const clonedReq = attachAuthHeaders(req, response.accessToken, authService);
          return next(clonedReq);
        }),
        catchError((err) => {
          console.error(`[AuthInterceptor] Refresh failed, logging out:`, err);
          authService.logout();
          return throwError(() => err);
        })
      );
    }

    const user = authService.getCurrentUserSnapshot();
    const userId = user?.userId;
    const userRole = user?.role;

    const headers: any = {
      Authorization: `Bearer ${token}`
    };

    if (userId) {
      headers['X-User-Id'] = String(userId);
    }
    if (userRole) {
      headers['X-User-Role'] = userRole;
    }

    req = req.clone({
      setHeaders: headers
    });
  } else {
    console.debug(`[AuthInterceptor] No token or public auth request for: ${req.url}`);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 occurs on a public endpoint, don't logout, just retry without token
      if (error.status === 401 && isPublicEndpoint) {
        // Retry without token
        const retryReq = req.clone({
          headers: req.headers
            .delete('Authorization')
            .delete('X-User-Id')
            .delete('X-User-Role')
        });
        return next(retryReq);
      }

      if (error.status === 401 && !isPublicAuthRequest && !isRefreshRequest) {
        return authService.refreshToken().pipe(
          switchMap((response) => {
            const retried = attachAuthHeaders(req, response.accessToken, authService);
            return next(retried);
          }),
          catchError((refreshError) => {
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};

function isPublicRequest(url: string, method: string): boolean {
  const normalizedMethod = method.toUpperCase();

  if (normalizedMethod === 'POST') {
    return /\/newsletter\/subscribe(?:\?|$)/.test(url) ||
      /\/posts\/\d+\/view(?:\?|$)/.test(url);
  }

  if (normalizedMethod !== 'GET') {
    return false;
  }

  return /\/posts\/published(?:\/|$|\?)/.test(url) ||
    /\/posts\/slug\/[^/]+/.test(url) ||
    /\/posts\/search(?:\?|$)/.test(url) ||
    /\/posts\/public\/author\/\d+/.test(url) ||
    /\/posts\/explore(?:\?|$)/.test(url) ||
    /\/posts\/public\/trending(?:\?|$)/.test(url) ||
    /\/categories(?:\/|$|\?)/.test(url) ||
    /\/tags(?:\/|$|\?)/.test(url) ||
    /\/auth\/public\/users\/\d+/.test(url) ||
    /\/auth\/public\/authors(?:\?|$)/.test(url) ||
    /\/newsletter\/confirm(?:\?|$)/.test(url) ||
    /\/newsletter\/unsubscribe(?:\/|$|\?)/.test(url) ||
    /\/comments\/post\/\d+/.test(url);
}

function attachAuthHeaders(req: HttpRequest<unknown>, token: string, authService: AuthService) {
  const user = authService.getCurrentUserSnapshot();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`
  };

  if (user?.userId) {
    headers['X-User-Id'] = String(user.userId);
  }

  if (user?.role) {
    headers['X-User-Role'] = user.role;
  }

  return req.clone({ setHeaders: headers });
}
