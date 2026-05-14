import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts = signal<Toast[]>([]);
  private counter = 0;

  getToasts() {
    return this.toasts.asReadonly();
  }

  show(message: string, type: ToastType = 'info', duration: number = 3000) {
    const id = this.counter++;
    const toast: Toast = { id, message, type, duration };
    
    this.toasts.update(t => [...t, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(message: string, duration?: number) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration?: number) {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number) {
    this.show(message, 'info', duration);
  }

  remove(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
