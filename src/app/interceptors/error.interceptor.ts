import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

// Status codes that are "expected" when optional microservices are not running.
// Logged as warnings, not errors, to avoid alarming console noise.
const WARN_ONLY_STATUSES = new Set([404, 503]);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let normalizedMessage =
        (typeof error.error === 'string' && !error.error.startsWith('<!') && error.error) ||
        error.error?.message ||
        error.message ||
        'Unexpected request error';
      
      if (typeof error.error === 'string' && error.error.startsWith('<!')) {
        normalizedMessage = `Resource not found or service unavailable (${error.status})`;
      }

      if (WARN_ONLY_STATUSES.has(error.status)) {
        // 404 / 503 → optional service not running, non-fatal
        console.warn(`[HTTP ${error.status}] ${req.url} — ${normalizedMessage}`);
      } else {
        // All other errors (401, 403, 400, 500 etc.) are real problems
        console.error('Interceptor caught error:', error);
      }

      const normalizedError = {
        status: error.status,
        message: normalizedMessage,
        raw: error
      };

      return throwError(() => normalizedError);
    })
  );
};
