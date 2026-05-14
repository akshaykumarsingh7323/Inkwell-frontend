import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';
import { vi } from 'vitest';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add a toast', () => {
    service.success('Test Success');
    const toasts = service.getToasts()();
    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe('Test Success');
    expect(toasts[0].type).toBe('success');
  });

  it('should remove a toast manually', () => {
    service.info('To be removed');
    const id = service.getToasts()()[0].id;
    service.remove(id);
    expect(service.getToasts()().length).toBe(0);
  });

  it('should auto-remove toast after duration', async () => {
    // In Vitest, we can use async/await with setTimeout for simple cases
    // or vi.useFakeTimers()
    vi.useFakeTimers();
    service.show('Auto remove', 'info', 1000);
    expect(service.getToasts()().length).toBe(1);
    
    vi.advanceTimersByTime(1001);
    expect(service.getToasts()().length).toBe(0);
    vi.useRealTimers();
  });

  it('should handle multiple toasts', () => {
    service.success('One');
    service.error('Two');
    expect(service.getToasts()().length).toBe(2);
  });
});
