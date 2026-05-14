import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromptService } from '../../services/prompt.service';

@Component({
  selector: 'app-prompt-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" *ngIf="promptService.getPrompt()()" (click)="promptService.close(null)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ promptService.getPrompt()()?.options?.title }}</h3>
          <button class="close-btn" (click)="promptService.close(null)">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <p class="prompt-msg">{{ promptService.getPrompt()()?.options?.message }}</p>
          <input type="text" 
                 class="prompt-input" 
                 [placeholder]="promptService.getPrompt()()?.options?.placeholder || ''"
                 [(ngModel)]="inputValue"
                 (keyup.enter)="submit()"
                 autofocus>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" (click)="promptService.close(null)">
            {{ promptService.getPrompt()()?.options?.cancelText || 'Cancel' }}
          </button>
          <button class="btn-confirm" (click)="submit()">
            {{ promptService.getPrompt()()?.options?.confirmText || 'OK' }}
          </button>
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
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.2);
      animation: modalFadeUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes modalFadeUp {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 1.25rem;
      color: #0f172a;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
    }

    .modal-body {
      padding: 24px;
    }

    .prompt-msg {
      margin: 0 0 16px 0;
      color: #475569;
      font-size: 0.95rem;
    }

    .prompt-input {
      width: 100%;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1.5px solid #e2e8f0;
      font-size: 1rem;
      transition: all 0.2s;
      outline: none;
    }

    .prompt-input:focus {
      border-color: #004643;
      box-shadow: 0 0 0 3px rgba(0, 70, 67, 0.1);
    }

    .modal-actions {
      padding: 16px 24px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-cancel {
      padding: 10px 20px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: white;
      color: #64748b;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-confirm {
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      background: #004643;
      color: white;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class PromptModalComponent {
  promptService = inject(PromptService);
  inputValue = '';

  submit() {
    this.promptService.close(this.inputValue);
    this.inputValue = '';
  }
}
