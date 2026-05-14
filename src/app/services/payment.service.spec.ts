import { TestBed } from '@angular/core/testing';
import { PaymentService } from './payment.service';
import { HttpClient } from '@angular/common/http';
import { of, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

describe('PaymentService', () => {
  let service: PaymentService;
  let httpClientSpy: any;

  beforeEach(() => {
    httpClientSpy = {
      get: vi.fn(),
      post: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PaymentService,
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    });
    service = TestBed.inject(PaymentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create order', async () => {
    httpClientSpy.post.mockReturnValue(of('order_123'));
    const res = await firstValueFrom(service.createOrder('user1', 'post1', 500));
    expect(res).toBe('order_123');
    expect(httpClientSpy.post).toHaveBeenCalledWith(expect.stringContaining('/payments/create-order'), { userId: 'user1', postId: 'post1', amount: 500 }, expect.any(Object));
  });

  it('should verify payment', async () => {
    const req = { orderId: 'ord1', paymentId: 'pay1', signature: 'sig1' };
    httpClientSpy.post.mockReturnValue(of({ status: 'SUCCESS' }));
    const res = await firstValueFrom(service.verifyPayment(req));
    expect(res.status).toBe('SUCCESS');
    expect(httpClientSpy.post).toHaveBeenCalledWith(expect.stringContaining('/payments/verify'), req);
  });

  it('should check access', async () => {
    httpClientSpy.get.mockReturnValue(of(true));
    const res = await firstValueFrom(service.checkAccess('user1', 'post1'));
    expect(res).toBe(true);
    expect(httpClientSpy.get).toHaveBeenCalledWith(expect.stringContaining('/payments/check'), expect.any(Object));
  });

  it('should get total revenue', async () => {
    httpClientSpy.get.mockReturnValue(of({ total: 1000 }));
    const res = await firstValueFrom(service.getTotalRevenue());
    expect(res.total).toBe(1000);
  });
});
