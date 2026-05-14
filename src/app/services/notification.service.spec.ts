import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { of, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpClientSpy: any;
  let authServiceSpy: any;

  beforeEach(() => {
    httpClientSpy = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };
    authServiceSpy = {
      currentUser$: of({ userId: 1 })
    };

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: HttpClient, useValue: httpClientSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get unread count', async () => {
    httpClientSpy.get.mockReturnValue(of(5));
    const res = await firstValueFrom(service.getUnreadCount());
    expect(res).toBe(5);
    expect(httpClientSpy.get).toHaveBeenCalledWith(expect.stringContaining('/notifications/unread-count/1'));
  });

  it('should mark as read', async () => {
    httpClientSpy.put.mockReturnValue(of({}));
    await firstValueFrom(service.markAsRead(101));
    expect(httpClientSpy.put).toHaveBeenCalledWith(expect.stringContaining('/notifications/101/read'), {});
  });

  it('should get notifications for current user', async () => {
    const mockNotifications = [{ notificationId: 1, title: 'Alert' }];
    httpClientSpy.get.mockReturnValue(of(mockNotifications));
    const res = await firstValueFrom(service.getMyNotifications());
    expect(res).toEqual(mockNotifications);
    expect(httpClientSpy.get).toHaveBeenCalledWith(expect.stringContaining('/notifications/user/1'));
  });

  it('should broadcast by role', async () => {
    httpClientSpy.post.mockReturnValue(of('Broadcasted'));
    const req = { targetRole: 'READER' as const, title: 'Hi', message: 'Hello' };
    const res = await firstValueFrom(service.broadcastByRole(req));
    expect(res).toBe('Broadcasted');
    expect(httpClientSpy.post).toHaveBeenCalledWith(expect.stringContaining('/notifications/broadcast'), req, expect.any(Object));
  });
});
