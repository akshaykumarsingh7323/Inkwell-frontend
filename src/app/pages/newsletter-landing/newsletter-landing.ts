import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewsletterService } from '../../services/newsletter.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-newsletter-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="newsletter-page">
      <header class="hero">
        <div class="mgmt-link" *ngIf="isAdminOrAuthor()">
          <a routerLink="/newsletter-management">Manage Newsletters →</a>
        </div>
        <h1>Stay Inspired with InkWell</h1>
        <p>Join our newsletter to receive curated stories, expert insights, and the latest updates directly in your inbox.</p>
      </header>

      <section class="subscription-card">
        <div class="card-content">
          <div class="icon-circle">
            <span class="material-symbols-outlined">mail</span>
          </div>
          <h2>Weekly Digest</h2>
          <p>Get the best of InkWell delivered once a week. No spam, just pure inspiration.</p>
          
          <div class="form-group" *ngIf="!isSubscribed">
            <input 
              type="email" 
              [(ngModel)]="email" 
              placeholder="Enter your email address"
              [disabled]="isLoading"
            />
            <button (click)="subscribe()" [disabled]="isLoading || !email">
              {{ isLoading ? 'Subscribing...' : 'Subscribe Now' }}
            </button>
          </div>

          <div class="status-msg" *ngIf="statusMessage" [class.error]="isError">
            {{ statusMessage }}
          </div>

          <div class="success-box" *ngIf="isSubscribed">
            <span class="material-symbols-outlined">task_alt</span>
            <p>{{ statusMessage }}</p>
          </div>
        </div>
      </section>

      <section class="features">
        <div class="feature">
          <span class="material-symbols-outlined">bolt</span>
          <h3>Early Access</h3>
          <p>Be the first to read our premium long-form stories.</p>
        </div>
        <div class="feature">
          <span class="material-symbols-outlined">star</span>
          <h3>Curated Content</h3>
          <p>Hand-picked articles based on your reading preferences.</p>
        </div>
        <div class="feature">
          <span class="material-symbols-outlined">group</span>
          <h3>Community</h3>
          <p>Exclusive invites to webinars and author Q&A sessions.</p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .newsletter-page {
      padding: 60px 20px;
      max-width: 900px;
      margin: 0 auto;
      text-align: center;
    }
    .hero h1 {
      font-family: 'Playfair Display', serif;
      font-size: 3rem;
      margin-bottom: 20px;
      color: #1a1a1a;
    }
    .hero p {
      font-size: 1.2rem;
      color: #666;
      max-width: 600px;
      margin: 0 auto 40px;
      line-height: 1.6;
    }
    .subscription-card {
      background: white;
      padding: 60px;
      border-radius: 32px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.05);
      margin-bottom: 60px;
      border: 1px solid #f0f0f0;
    }
    .icon-circle {
      width: 64px;
      height: 64px;
      background: #f0f7f4;
      color: #006b4d;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon-circle span { font-size: 32px; }
    h2 { font-size: 1.8rem; margin-bottom: 12px; }
    .subscription-card p { color: #666; margin-bottom: 32px; }
    
    .form-group {
      display: flex;
      gap: 12px;
      max-width: 500px;
      margin: 0 auto;
    }
    input {
      flex: 1;
      padding: 16px 24px;
      border-radius: 16px;
      border: 2px solid #eee;
      font-size: 1rem;
      transition: border-color 0.2s;
    }
    input:focus { outline: none; border-color: #006b4d; }
    button {
      padding: 16px 32px;
      border-radius: 16px;
      background: #1a1a1a;
      color: white;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, background 0.2s;
    }
    button:hover { background: #333; transform: translateY(-2px); }
    button:disabled { background: #ccc; cursor: not-allowed; transform: none; }

    .status-msg { margin-top: 20px; color: #006b4d; font-weight: 500; }
    .status-msg.error { color: #c62828; }

    .success-box {
      margin-top: 20px;
      padding: 24px;
      background: #f0f7f4;
      border-radius: 16px;
      color: #006b4d;
    }
    .success-box span { font-size: 48px; margin-bottom: 12px; }

    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 30px;
    }
    .feature span { font-size: 40px; color: #006b4d; margin-bottom: 16px; display: block; }
    .feature h3 { font-size: 1.2rem; margin-bottom: 8px; }
    .feature p { color: #777; font-size: 0.95rem; line-height: 1.5; }

    .mgmt-link { margin-bottom: 20px; text-align: right; }
    .mgmt-link a { 
      color: #006b4d; font-weight: 600; text-decoration: none; 
      font-size: 0.9rem; background: #f0f7f4; padding: 8px 16px; 
      border-radius: 20px; transition: background 0.2s;
    }
    .mgmt-link a:hover { background: #e0eee8; }

    @media (max-width: 768px) {
      .form-group { flex-direction: column; }
      .features { grid-template-columns: 1fr; }
      .hero h1 { font-size: 2.2rem; }
    }
  `]
})
export class NewsletterLanding implements OnInit {
  private newsletterService = inject(NewsletterService);
  private authService = inject(AuthService);

  email = '';
  isLoading = false;
  isSubscribed = false;
  statusMessage = '';
  isError = false;

  ngOnInit(): void {
    const user = this.authService.getCurrentUserSnapshot();
    if (user?.email) {
      this.email = user.email;
      this.checkStatus(user.email);
    }
  }

  private checkStatus(email: string): void {
    this.newsletterService.getSubscriptionStatus(email, 0).subscribe(status => {
      if (status === 'ACTIVE') {
        this.isSubscribed = true;
        this.statusMessage = 'You are already a subscriber! Thank you for being part of InkWell.';
      } else if (status === 'PENDING') {
        this.isSubscribed = true;
        this.statusMessage = 'Your subscription is pending. Please check your email to confirm.';
      }
    });
  }

  isAdminOrAuthor(): boolean {
    const user = this.authService.getCurrentUserSnapshot();
    return user?.role === 'ADMIN' || user?.role === 'AUTHOR';
  }

  subscribe(): void {
    if (!this.email) return;
    this.isLoading = true;
    this.statusMessage = '';
    this.isError = false;

    const user = this.authService.getCurrentUserSnapshot();
    const request = {
      email: this.email,
      fullName: user?.fullName,
      userId: user?.userId ? Number(user.userId) : undefined
    };

    this.newsletterService.subscribe(request).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSubscribed = true;
        this.statusMessage = 'Subscription pending! Please check your email to confirm.';
      },
      error: (err) => {
        this.isLoading = false;
        this.isError = true;
        this.statusMessage = err.error || 'Failed to subscribe. Please try again.';
      }
    });
  }
}
