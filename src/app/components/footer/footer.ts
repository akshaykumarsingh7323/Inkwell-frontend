import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewsletterService } from '../../services/newsletter.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  private newsletterService = inject(NewsletterService);
  
  currentYear = new Date().getFullYear();
  email = '';
  statusMessage = '';
  isError = false;
  isSubmitting = false;

  subscribe(): void {
    if (!this.email.trim()) return;
    
    this.isSubmitting = true;
    this.statusMessage = '';
    
    this.newsletterService.subscribe({ email: this.email.trim() }).subscribe({
      next: () => {
        this.statusMessage = 'Thanks for subscribing! Please check your email to confirm.';
        this.isError = false;
        this.email = '';
        this.isSubmitting = false;
      },
      error: () => {
        this.statusMessage = 'Subscription failed. Please try again later.';
        this.isError = true;
        this.isSubmitting = false;
      }
    });
  }
}
