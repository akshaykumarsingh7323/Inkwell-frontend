import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NewsletterService } from '../../services/newsletter.service';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-newsletter-unsubscribe',
  standalone: true,
  imports: [CommonModule, RouterLink, Footer],
  template: `
    <main class="confirm-page">
      <div class="confirm-card">
        <div class="status-icon" [class.success]="status === 'success'" [class.error]="status === 'error'">
          <span class="material-symbols-outlined">
            {{ status === 'success' ? 'notifications_off' : (status === 'error' ? 'error' : 'hourglass_empty') }}
          </span>
        </div>
        
        <h1>{{ title }}</h1>
        <p>{{ message }}</p>

        <div class="actions" *ngIf="status !== 'loading'">
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
    .status-icon.success { background: #fff3e0; color: #e65100; }
    .status-icon.error { background: #ffebee; color: #c62828; }
    .status-icon span { font-size: 48px; }
    
    h1 { font-family: 'Playfair Display', serif; margin-bottom: 16px; color: #1a1a1a; }
    p { color: #666; margin-bottom: 32px; font-size: 1.1rem; line-height: 1.6; }
    
    .actions { display: flex; gap: 16px; justify-content: center; }
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
export class NewsletterUnsubscribe implements OnInit {
  private route = inject(ActivatedRoute);
  private newsletterService = inject(NewsletterService);

  status: 'loading' | 'success' | 'error' = 'loading';
  title = 'Unsubscribing...';
  message = 'Please wait while we process your request.';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.setError('Invalid Request', 'No unsubscribe token was found in the URL.');
      return;
    }

    this.newsletterService.unsubscribe(token).subscribe({
      next: () => {
        this.status = 'success';
        this.title = 'Unsubscribed';
        this.message = 'You have been successfully removed from our mailing list. You will no longer receive notifications.';
      },
      error: (err) => {
        this.setError('Request Failed', err.error?.error || 'The token might be expired or invalid.');
      }
    });
  }

  private setError(title: string, message: string): void {
    this.status = 'error';
    this.title = title;
    this.message = message;
  }
}
