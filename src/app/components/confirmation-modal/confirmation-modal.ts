import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationService } from '../../services/confirmation.service';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" *ngIf="confirmService.getConfirm()()" (click)="confirmService.close(false)">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-accent" [class]="confirmService.getConfirm()()?.options?.type || 'primary'"></div>
        
        <div class="modal-inner">
          <div class="modal-icon-container" [class]="confirmService.getConfirm()()?.options?.type || 'primary'">
            <span class="material-symbols-outlined">{{ getIcon() }}</span>
          </div>

          <div class="modal-text">
            <h3>{{ confirmService.getConfirm()()?.options?.title }}</h3>
            <p>{{ confirmService.getConfirm()()?.options?.message }}</p>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" (click)="confirmService.close(false)">
              {{ confirmService.getConfirm()()?.options?.cancelText || 'Cancel' }}
            </button>
            <button class="btn-main" 
                    [class]="confirmService.getConfirm()()?.options?.type || 'primary'"
                    (click)="confirmService.close(true)">
              {{ confirmService.getConfirm()()?.options?.confirmText || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    }

    .modal-card {
      background: white;
      border-radius: 24px;
      width: 100%;
      max-width: 440px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      position: relative;
      animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes modalSlideIn {
      from { opacity: 0; transform: translateY(30px) scale(0.9); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .modal-accent {
      height: 6px;
      width: 100%;
    }
    .modal-accent.primary { background: linear-gradient(90deg, #004643, #00695c); }
    .modal-accent.danger { background: linear-gradient(90deg, #ef4444, #b91c1c); }
    .modal-accent.warning { background: linear-gradient(90deg, #f59e0b, #d97706); }

    .modal-inner {
      padding: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .modal-icon-container {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }

    .modal-icon-container.primary { background: #f0fdf4; color: #166534; }
    .modal-icon-container.danger { background: #fef2f2; color: #991b1b; }
    .modal-icon-container.warning { background: #fffbeb; color: #92400e; }

    .modal-icon-container span {
      font-size: 32px;
    }

    .modal-text h3 {
      margin: 0 0 12px;
      font-size: 1.5rem;
      color: #0f172a;
      font-weight: 700;
      letter-spacing: -0.025em;
    }

    .modal-text p {
      margin: 0;
      color: #64748b;
      font-size: 1.05rem;
      line-height: 1.6;
    }

    .modal-footer {
      width: 100%;
      margin-top: 32px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .btn-secondary {
      padding: 14px;
      border-radius: 12px;
      border: 1.5px solid #e2e8f0;
      background: white;
      color: #475569;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .btn-main {
      padding: 14px;
      border-radius: 12px;
      border: none;
      color: white;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .btn-main:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .btn-main.primary { background: #004643; }
    .btn-main.danger { background: #ef4444; }
    .btn-main.warning { background: #f59e0b; }

    .btn-main:active {
      transform: translateY(0);
    }
  `]
})
export class ConfirmationModalComponent {
  confirmService = inject(ConfirmationService);

  getIcon(): string {
    const options = this.confirmService.getConfirm()()?.options;
    if (options?.type === 'danger') return 'warning';
    if (options?.type === 'warning') return 'report_problem';
    if (options?.title?.toLowerCase().includes('logout') || options?.title?.toLowerCase().includes('sign out')) return 'logout';
    return 'help_outline';
  }
}
