import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'primary' | 'warning';
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  private activeConfirm = signal<{ options: ConfirmOptions; resolve: (result: boolean) => void } | null>(null);

  getConfirm() {
    return this.activeConfirm.asReadonly();
  }

  confirm(options: ConfirmOptions): Promise<boolean> {
    console.log('Confirmation requested:', options);
    return new Promise((resolve) => {
      this.activeConfirm.set({ options, resolve });
    });
  }

  close(result: boolean) {
    const active = this.activeConfirm();
    if (active) {
      active.resolve(result);
      this.activeConfirm.set(null);
    }
  }
}
