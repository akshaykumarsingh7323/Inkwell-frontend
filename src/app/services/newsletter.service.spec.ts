import { TestBed } from '@angular/core/testing';
import { NewsletterService } from './newsletter.service';
import { HttpClient } from '@angular/common/http';
import { of, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

describe('NewsletterService', () => {
  let service: NewsletterService;
  let httpClientSpy: any;

  beforeEach(() => {
    httpClientSpy = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        NewsletterService,
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    });
    service = TestBed.inject(NewsletterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should subscribe', async () => {
    const req = { email: 'test@example.com' };
    httpClientSpy.post.mockReturnValue(of('Subscribed'));

    const res = await firstValueFrom(service.subscribe(req));
    expect(res).toBe('Subscribed');
    expect(httpClientSpy.post).toHaveBeenCalledWith(expect.stringContaining('/newsletter/subscribe'), req, expect.any(Object));
  });

  it('should get subscriber count', async () => {
    httpClientSpy.get.mockReturnValue(of(100));
    const res = await firstValueFrom(service.getSubscriberCount(1));
    expect(res).toBe(100);
    expect(httpClientSpy.get).toHaveBeenCalledWith(expect.stringContaining('/newsletter/count'), expect.any(Object));
  });

  it('should get subscription status', async () => {
    httpClientSpy.get.mockReturnValue(of({ status: 'ACTIVE' }));
    const res = await firstValueFrom(service.getSubscriptionStatus('test@example.com', 1));
    expect(res).toBe('ACTIVE');
  });

  it('should handle missing subscriber status as NONE', async () => {
    httpClientSpy.get.mockReturnValue(of({ status: 'NONE' }));
    const res = await firstValueFrom(service.getSubscriptionStatus('none@example.com', 1));
    expect(res).toBe('NONE');
  });
});
