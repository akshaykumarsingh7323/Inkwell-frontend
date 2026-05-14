import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './components/toast-container/toast-container';
import { ConfirmationModalComponent } from './components/confirmation-modal/confirmation-modal';
import { PromptModalComponent } from './components/prompt-modal/prompt-modal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent, ConfirmationModalComponent, PromptModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('inkwell');
}
