import { Injectable, signal } from '@angular/core';

export interface PromptOptions {
  title: string;
  message: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PromptService {
  private activePrompt = signal<{ options: PromptOptions; resolve: (result: string | null) => void } | null>(null);

  getPrompt() {
    return this.activePrompt.asReadonly();
  }

  prompt(options: PromptOptions): Promise<string | null> {
    return new Promise((resolve) => {
      this.activePrompt.set({ options, resolve });
    });
  }

  close(result: string | null) {
    const active = this.activePrompt();
    if (active) {
      active.resolve(result);
      this.activePrompt.set(null);
    }
  }
}
