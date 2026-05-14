import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of toastService.getToasts()()" 
           class="toast" 
           [class]="toast.type"
           (click)="toastService.remove(toast.id)">
        <div class="toast-icon">
          <span class="material-symbols-outlined">{{ getIcon(toast.type) }}</span>
        </div>
        <div class="toast-content">
          <p class="toast-message">{{ toast.message }}</p>
        </div>
        <button class="toast-close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      min-width: 300px;
      max-width: 450px;
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-left: 4px solid #ccc;
      transition: all 0.2s;
    }

    .toast:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(0,0,0,0.15);
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .toast.success { border-left-color: #10b981; }
    .toast.error { border-left-color: #ef4444; }
    .toast.warning { border-left-color: #f59e0b; }
    .toast.info { border-left-color: #3b82f6; }

    .toast-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
    }

    .toast.success .toast-icon { color: #10b981; background: #ecfdf5; }
    .toast.error .toast-icon { color: #ef4444; background: #fef2f2; }
    .toast.warning .toast-icon { color: #f59e0b; background: #fffbeb; }
    .toast.info .toast-icon { color: #3b82f6; background: #eff6ff; }

    .toast-content {
      flex: 1;
    }

    .toast-message {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 500;
      color: #1e293b;
    }

    .toast-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .toast-close:hover {
      background: #f1f5f9;
      color: #475569;
    }

    @media (max-width: 480px) {
      .toast-container {
        top: auto;
        bottom: 24px;
        left: 24px;
        right: 24px;
      }
      .toast {
        min-width: 0;
      }
    }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }
}
