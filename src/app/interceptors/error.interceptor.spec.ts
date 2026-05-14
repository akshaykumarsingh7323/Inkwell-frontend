import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { errorInterceptor } from './error.interceptor';
import { throwError, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

describe('errorInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should normalize 404 error and log as warning', async () => {
    const req = new HttpRequest('GET', '/api/missing');
    const errorResponse = new HttpErrorResponse({
      status: 404,
      statusText: 'Not Found',
      error: { message: 'Item not found' }
    });
    const next: HttpHandlerFn = () => throwError(() => errorResponse);

    try {
      await firstValueFrom(errorInterceptor(req, next));
    } catch (err: any) {
      expect(err.status).toBe(404);
      expect(err.message).toBe('Item not found');
      expect(console.warn).toHaveBeenCalled();
    }
  });

  it('should normalize 500 error and log as error', async () => {
    const req = new HttpRequest('GET', '/api/fail');
    const errorResponse = new HttpErrorResponse({
      status: 500,
      statusText: 'Internal Server Error',
      error: 'Server crashed'
    });
    const next: HttpHandlerFn = () => throwError(() => errorResponse);

    try {
      await firstValueFrom(errorInterceptor(req, next));
    } catch (err: any) {
      expect(err.status).toBe(500);
      expect(err.message).toBe('Server crashed');
      expect(console.error).toHaveBeenCalled();
    }
  });

  it('should handle HTML error responses gracefully', async () => {
    const req = new HttpRequest('GET', '/api/html-error');
    const errorResponse = new HttpErrorResponse({
      status: 404,
      error: '<!DOCTYPE html><html><body>Error</body></html>'
    });
    const next: HttpHandlerFn = () => throwError(() => errorResponse);

    try {
      await firstValueFrom(errorInterceptor(req, next));
    } catch (err: any) {
      expect(err.message).toContain('Resource not found');
    }
  });
});
