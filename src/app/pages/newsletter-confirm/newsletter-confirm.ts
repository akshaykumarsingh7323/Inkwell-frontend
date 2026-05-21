import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NewsletterService } from '../../services/newsletter.service';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-newsletter-confirm',
  standalone: true,
  imports: [CommonModule, RouterLink, Footer],
  template: `
    <main class="confirm-page">
      <div class="confirm-card">
        <div class="status-icon" 
          [class.success]="status === 'success'" 
          [class.error]="status === 'error'"
          [class.ready]="status === 'ready'">
          <span class="material-symbols-outlined">
            {{ status === 'success' ? 'check_circle' : (status === 'error' ? 'error' : (status === 'ready' ? 'mail' : 'hourglass_empty')) }}
          </span>
        </div>
        
        <h1>{{ title }}</h1>
        <p>{{ message }}</p>

        <!-- Manual Confirmation Button -->
        <div class="actions" *ngIf="status === 'ready'">
          <button (click)="confirm()" class="btn-confirm" [disabled]="isProcessing">
            {{ isProcessing ? 'Verifying...' : 'Confirm My Subscription' }}
          </button>
        </div>

        <div class="actions" *ngIf="status === 'success' || status === 'error'">
          <a routerLink="/home" class="btn-primary">Go to Home</a>
          <a routerLink="/explore" class="btn-secondary">Explore Posts</a>
        </div>
      </div>
    </main>
    <app-footer></app-footer>
  `,
  styles: [`
    .confirm-page {
      min-height: calc(100vh - 140px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: #f8f9fa;
    }
    .confirm-card {
      background: white;
      padding: 48px;
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      text-align: center;
      max-width: 500px;
      width: 100%;
    }
    .status-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #eee;
    }
    .status-icon.success { background: #e8f5e9; color: #2e7d32; }
    .status-icon.error { background: #ffebee; color: #c62828; }
    .status-icon.ready { background: #e3f2fd; color: #1976d2; }
    .status-icon span { font-size: 48px; }
    
    h1 { font-family: 'Playfair Display', serif; margin-bottom: 16px; color: #1a1a1a; font-size: 2rem; }
    p { color: #666; margin-bottom: 32px; font-size: 1.1rem; line-height: 1.6; }
    
    .actions { display: flex; gap: 16px; justify-content: center; }
    .btn-confirm {
      background: #004643; color: white; padding: 14px 32px;
      border: none; border-radius: 12px; font-weight: 600; cursor: pointer;
      font-size: 1rem; transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 70, 67, 0.2);
    }
    .btn-confirm:hover { background: #003330; transform: translateY(-2px); }
    .btn-confirm:disabled { background: #ccc; cursor: not-allowed; transform: none; }

    .btn-primary {
      background: #1a1a1a; color: white; padding: 12px 24px;
      border-radius: 12px; text-decoration: none; font-weight: 500;
      transition: transform 0.2s;
    }
    .btn-secondary {
      background: #eee; color: #1a1a1a; padding: 12px 24px;
      border-radius: 12px; text-decoration: none; font-weight: 500;
      transition: transform 0.2s;
    }
    .btn-primary:hover, .btn-secondary:hover { transform: translateY(-2px); }
  `]
})
export class NewsletterConfirm implements OnInit {
  private route = inject(ActivatedRoute);
  private newsletterService = inject(NewsletterService);

  status: 'loading' | 'ready' | 'success' | 'error' = 'loading';
  isProcessing = false;
  title = 'Verifying...';
  message = 'Please wait while we prepare your confirmation.';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.setError('Invalid Link', 'No confirmation token was found. Please check your email and try again.');
      return;
    }

    // Instead of automatic confirmation, we set status to 'ready'
    setTimeout(() => {
      this.status = 'ready';
      this.title = 'One Last Step!';
      this.message = 'Please click the button below to finalize your subscription and join the InkWell community.';
    }, 800);
  }

  confirm(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) return;

    this.isProcessing = true;
    this.newsletterService.confirmSubscription(token).subscribe({
      next: () => {
        this.status = 'success';
        this.title = 'Subscription Confirmed!';
        this.message = 'Welcome aboard! You have successfully joined our newsletter. Check your inbox for a welcome surprise.';
        this.isProcessing = false;
      },
      error: (err) => {
        this.setError('Confirmation Failed', err.error?.error || 'The link might be expired or already used.');
        this.isProcessing = false;
      }
    });
  }

  private setError(title: string, message: string): void {
    this.status = 'error';
    this.title = title;
    this.message = message;
  }
}
