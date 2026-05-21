import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NewsletterService } from '../../services/newsletter.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-newsletter-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="newsletter-page">
      <div class="newsletter-shell">
        <header class="hero">
          <div class="mgmt-link" *ngIf="isAdmin()">
            <a routerLink="/newsletter-management">Manage newsletters</a>
          </div>
          <h1>Stay Inspired with InkWell</h1>
        </header>

        <section class="subscription-card">
          <div class="card-content">
            <div class="icon-circle" [class.is-success]="isSubscribed">
              <span class="material-symbols-outlined">{{ isSubscribed ? 'task_alt' : 'mail' }}</span>
            </div>

            <ng-container *ngIf="!isSubscribed; else subscribedState">
              <div class="copy-block">
                <h2>Join the weekly list</h2>
              </div>

              <div class="form-group stacked">
                <input
                  type="email"
                  [(ngModel)]="email"
                  [placeholder]="lockedEmail ? 'Signed in email' : 'Enter your email address'"
                  [readonly]="lockedEmail"
                  [disabled]="isLoading"
                  [class.locked-email]="lockedEmail"
                />
                <button (click)="subscribe()" [disabled]="isLoading || (isLoggedIn() && !email)">
                  {{ isLoading ? 'Subscribing...' : (isLoggedIn() ? 'Subscribe Now' : 'Sign in to Subscribe') }}
                </button>
              </div>
            </ng-container>

            <ng-template #subscribedState>
              <div class="success-box">
                <div class="copy-block compact">
                  <h2>{{ subscriptionStatus === 'ACTIVE' ? 'You are subscribed' : 'Confirmation pending' }}</h2>
                  <p>{{ statusMessage }}</p>
                </div>
                <button
                  class="secondary-btn"
                  *ngIf="subscriptionStatus === 'PENDING'"
                  (click)="resendConfirmationEmail()"
                  [disabled]="isResendingConfirmation || !email || resendCountdown > 0"
                >
                  {{
                    isResendingConfirmation
                      ? 'Sending...'
                      : resendCountdown > 0
                        ? 'Resend available in ' + resendCountdown + 's'
                        : 'Resend Confirmation Email'
                  }}
                </button>
              </div>
            </ng-template>

            <div class="status-msg" *ngIf="statusMessage && !isSubscribed" [class.error]="isError">
              {{ statusMessage }}
            </div>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .newsletter-page {
      padding: 20px 14px 32px;
      min-height: 100%;
      background:
        radial-gradient(circle at top center, rgba(0, 107, 77, 0.1), transparent 26%),
        linear-gradient(180deg, #fcf8ef 0%, #f5eee1 100%);
    }

    .newsletter-shell {
      max-width: 680px;
      margin: 0 auto;
      text-align: center;
    }

    .hero {
      margin-bottom: 16px;
    }

    .hero h1 {
      font-family: 'Playfair Display', serif;
      font-size: clamp(2.15rem, 4vw, 3rem);
      line-height: 1.04;
      margin-bottom: 0;
      color: #102a24;
      letter-spacing: -0.02em;
    }

    .subscription-card {
      margin-bottom: 16px;
      padding: 26px 24px;
      border: 1px solid rgba(0, 107, 77, 0.08);
      border-radius: 26px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(251, 248, 242, 0.94) 100%);
      box-shadow:
        0 18px 38px rgba(16, 42, 36, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(10px);
    }

    .card-content {
      max-width: 500px;
      margin: 0 auto;
    }

    .icon-circle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      border-radius: 50%;
      background: linear-gradient(135deg, #eef9f3, #dcefe7);
      box-shadow:
        0 12px 24px rgba(0, 107, 77, 0.1),
        inset 0 0 0 1px rgba(0, 107, 77, 0.06);
      color: #006b4d;
    }

    .icon-circle.is-success {
      background: linear-gradient(135deg, #e7f7f0, #d5eee5);
    }

    .icon-circle span {
      font-size: 32px;
    }

    .copy-block {
      max-width: 420px;
      margin: 0 auto 14px;
    }

    .copy-block.compact {
      margin-bottom: 0;
    }

    h2 {
      margin-bottom: 8px;
      color: #12352e;
      font-family: 'Playfair Display', serif;
      font-size: clamp(1.8rem, 3vw, 2.5rem);
    }

    .subscription-card p {
      margin-bottom: 0;
      color: #5d6b66;
      font-size: 0.98rem;
      line-height: 1.55;
    }

    .form-group {
      display: flex;
      gap: 10px;
      max-width: 380px;
      margin: 0 auto;
    }

    .form-group.stacked {
      flex-direction: column;
    }

    input {
      flex: 1;
      padding: 13px 16px;
      border: 1px solid rgba(0, 107, 77, 0.12);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.94);
      font-size: 1rem;
      color: #173a33;
      transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
    }

    input:focus {
      outline: none;
      border-color: #006b4d;
      transform: translateY(-1px);
      box-shadow:
        0 0 0 4px rgba(0, 107, 77, 0.11),
        0 10px 18px rgba(0, 107, 77, 0.08);
    }

    input.locked-email {
      border-color: #f1f1f1;
      background: #fcfcfc;
      color: #777;
      cursor: not-allowed;
    }

    button {
      padding: 13px 22px;
      border: none;
      border-radius: 16px;
      background: linear-gradient(135deg, #0d6b4c, #074b36);
      color: white;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 12px 22px rgba(0, 107, 77, 0.18);
      transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s, filter 0.2s;
    }

    button:hover {
      transform: translateY(-2px);
      filter: brightness(1.02);
      box-shadow: 0 16px 26px rgba(0, 107, 77, 0.2);
    }

    button:disabled {
      background: #b9c4bf;
      box-shadow: none;
      cursor: not-allowed;
      transform: none;
    }

    .secondary-btn {
      min-width: 240px;
      margin-top: 18px;
      border: 1px solid rgba(0, 107, 77, 0.1);
      background: rgba(255, 255, 255, 0.72);
      color: #006b4d;
      box-shadow: 0 10px 20px rgba(0, 107, 77, 0.08);
    }

    .secondary-btn:hover {
      background: rgba(255, 255, 255, 0.92);
    }

    .status-msg {
      margin-top: 16px;
      color: #006b4d;
      font-weight: 500;
    }

    .status-msg.error {
      color: #c62828;
    }

    .success-box {
      padding: 22px 20px;
      border: 1px solid rgba(0, 107, 77, 0.1);
      border-radius: 24px;
      background: linear-gradient(180deg, #f4fbf7 0%, #eaf5ef 100%);
      color: #006b4d;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
    }

    .mgmt-link {
      margin-bottom: 18px;
      text-align: right;
    }

    .mgmt-link a {
      padding: 8px 16px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(0, 107, 77, 0.08);
      color: #006b4d;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      box-shadow: 0 8px 18px rgba(0, 107, 77, 0.05);
      transition: background 0.2s, transform 0.2s;
    }

    .mgmt-link a:hover {
      background: rgba(255, 255, 255, 0.95);
      transform: translateY(-1px);
    }

    @media (max-width: 768px) {
      .newsletter-page {
        padding: 16px 10px 28px;
      }

      .subscription-card {
        padding: 20px 16px;
        border-radius: 24px;
      }

      .form-group {
        flex-direction: column;
      }

      .hero h1 {
        font-size: 2rem;
      }

      h2 {
        font-size: 1.6rem;
      }

      .secondary-btn {
        min-width: 100%;
      }
    }
  `]
})
export class NewsletterLanding implements OnInit, OnDestroy {
  private newsletterService = inject(NewsletterService);
  private authService = inject(AuthService);
  private resendCountdownTimer: ReturnType<typeof setInterval> | null = null;
  private readonly resendCooldownSeconds = 45;
  private readonly resendCooldownStorageKeyPrefix = 'newsletter_resend_available_at';
  private readonly pendingSubscriptionStorageKey = 'newsletter_pending_subscription_email';
  private readonly knownSubscriptionStorageKey = 'newsletter_known_subscription_email';

  email = '';
  preferences = '';
  isLoading = false;
  isResendingConfirmation = false;
  isSubscribed = false;
  statusMessage = '';
  isError = false;
  lockedEmail = false;
  subscriptionStatus: 'ACTIVE' | 'PENDING' | 'NONE' = 'NONE';
  resendCountdown = 0;

  ngOnInit(): void {
    const user = this.authService.getCurrentUserSnapshot();
    if (user?.email) {
      this.applyLoggedInEmail(user.email);
      this.refreshSubscriptionState();
      return;
    }

    if (this.authService.isLoggedIn()) {
      this.authService.getCurrentUser().subscribe({
        next: (currentUser) => {
          if (currentUser?.email) {
            this.applyLoggedInEmail(currentUser.email);
          }
          this.refreshSubscriptionState();
        },
        error: () => {
          this.refreshSubscriptionState();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.clearResendCountdown();
  }

  private applyLoggedInEmail(email: string): void {
    this.clearPendingStateForDifferentEmail(email);
    this.email = email;
    this.lockedEmail = true;
  }

  private refreshSubscriptionState(): void {
    this.newsletterService.getCurrentUserSubscription().subscribe((subscriber) => {
      if (subscriber?.status === 'ACTIVE') {
        sessionStorage.removeItem(this.pendingSubscriptionStorageKey);
        this.storeKnownSubscriptionForCurrentEmail();
        this.subscriptionStatus = 'ACTIVE';
        this.isSubscribed = true;
        this.statusMessage = 'You are already a subscriber! Thank you for being part of InkWell.';
        this.isError = false;
        this.clearResendCountdown();
        this.clearResendCooldownStorage();
      } else if (subscriber?.status === 'PENDING') {
        this.storePendingStateForCurrentEmail();
        this.storeKnownSubscriptionForCurrentEmail();
        this.subscriptionStatus = 'PENDING';
        this.isSubscribed = true;
        this.statusMessage = 'Your subscription is pending. Please check your email to confirm.';
        this.isError = false;
        this.preferences = subscriber.preferences || this.preferences;
        this.restoreOrStartResendCountdown();
      } else {
        if (this.hasKnownSubscriptionForCurrentEmail()) {
          this.applyPendingState();
          return;
        }
        this.subscriptionStatus = 'NONE';
        this.isSubscribed = false;
        this.statusMessage = '';
        this.isError = false;
        this.preferences = '';
        this.clearResendCountdown();
        this.clearResendCooldownStorage();
        sessionStorage.removeItem(this.pendingSubscriptionStorageKey);
      }
    });
  }

  private applyPendingState(): void {
    this.storePendingStateForCurrentEmail();
    this.storeKnownSubscriptionForCurrentEmail();
    this.subscriptionStatus = 'PENDING';
    this.isSubscribed = true;
    this.statusMessage = 'Your subscription is pending. Please check your email to confirm.';
    this.isError = false;
    this.restoreOrStartResendCountdown();
  }

  private restoreOrStartResendCountdown(): void {
    if (this.isResendingConfirmation) {
      return;
    }

    const availableAt = Number(sessionStorage.getItem(this.getResendCooldownStorageKey()) || '0');
    const remainingSeconds = Math.max(0, Math.ceil((availableAt - Date.now()) / 1000));

    if (remainingSeconds > 0) {
      this.startResendCountdown(remainingSeconds, false);
      return;
    }

    if (availableAt > 0) {
      this.clearResendCooldownStorage();
      this.clearResendCountdown();
      return;
    }

    this.startResendCountdown(this.resendCooldownSeconds);
  }

  private startResendCountdown(seconds = this.resendCooldownSeconds, persist = true): void {
    this.clearResendCountdown();
    this.resendCountdown = seconds;
    if (persist) {
      sessionStorage.setItem(
        this.getResendCooldownStorageKey(),
        (Date.now() + seconds * 1000).toString()
      );
    }
    this.resendCountdownTimer = setInterval(() => {
      if (this.resendCountdown > 0) {
        this.resendCountdown -= 1;
      }

      if (this.resendCountdown <= 0) {
        this.clearResendCountdown();
        this.clearResendCooldownStorage();
      }
    }, 1000);
  }

  private clearResendCountdown(): void {
    if (this.resendCountdownTimer) {
      clearInterval(this.resendCountdownTimer);
      this.resendCountdownTimer = null;
    }
    this.resendCountdown = 0;
  }

  private storePendingStateForCurrentEmail(): void {
    const normalizedEmail = this.email.trim().toLowerCase();
    if (!normalizedEmail) {
      sessionStorage.removeItem(this.pendingSubscriptionStorageKey);
      return;
    }
    sessionStorage.setItem(this.pendingSubscriptionStorageKey, normalizedEmail);
  }

  private hasPendingStateForCurrentEmail(): boolean {
    const normalizedEmail = this.email.trim().toLowerCase();
    if (!normalizedEmail) {
      return false;
    }

    return sessionStorage.getItem(this.pendingSubscriptionStorageKey) === normalizedEmail;
  }

  private clearPendingStateForDifferentEmail(email: string): void {
    const storedPendingEmail = sessionStorage.getItem(this.pendingSubscriptionStorageKey);
    if (!storedPendingEmail) {
      return;
    }

    if (storedPendingEmail !== email.trim().toLowerCase()) {
      sessionStorage.removeItem(this.pendingSubscriptionStorageKey);
      this.clearResendCooldownStorage(storedPendingEmail);
      this.clearResendCountdown();
    }
  }

  private storeKnownSubscriptionForCurrentEmail(): void {
    const normalizedEmail = this.email.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }
    localStorage.setItem(this.knownSubscriptionStorageKey, normalizedEmail);
  }

  private hasKnownSubscriptionForCurrentEmail(): boolean {
    const normalizedEmail = this.email.trim().toLowerCase();
    if (!normalizedEmail) {
      return false;
    }

    const pendingEmail = sessionStorage.getItem(this.pendingSubscriptionStorageKey);
    const knownEmail = localStorage.getItem(this.knownSubscriptionStorageKey);

    return pendingEmail === normalizedEmail || knownEmail === normalizedEmail;
  }

  private getResendCooldownStorageKey(email = this.email): string {
    const normalizedEmail = email.trim().toLowerCase();
    return normalizedEmail
      ? `${this.resendCooldownStorageKeyPrefix}_${normalizedEmail}`
      : this.resendCooldownStorageKeyPrefix;
  }

  private clearResendCooldownStorage(email = this.email): void {
    sessionStorage.removeItem(this.getResendCooldownStorageKey(email));
  }

  resendConfirmationEmail(): void {
    if (!this.email || this.isResendingConfirmation || this.resendCountdown > 0) return;

    this.isResendingConfirmation = true;
    this.isError = false;

    this.newsletterService.resendConfirmation({ email: this.email }).subscribe({
      next: () => {
        this.isResendingConfirmation = false;
        this.statusMessage = 'Confirmation email sent again. Please check your email.';
        this.startResendCountdown();
      },
      error: (err) => {
        this.isResendingConfirmation = false;
        this.isError = true;
        this.statusMessage = err.error?.error || 'Failed to resend confirmation email.';
      }
    });
  }

  isAdmin(): boolean {
    const user = this.authService.getCurrentUserSnapshot();
    return user?.role === 'ADMIN';
  }

  subscribe(): void {
    if (!this.email) return;

    if (!this.authService.isLoggedIn()) {
      this.isError = true;
      this.statusMessage = 'Please sign in to subscribe to the newsletter.';
      this.authService.redirectToLogin('/newsletter');
      return;
    }

    this.isLoading = true;
    this.statusMessage = '';
    this.isError = false;

    const user = this.authService.getCurrentUserSnapshot();
    const subscriptionEmail = user?.email || this.email;
    const request = {
      email: subscriptionEmail,
      fullName: user?.fullName,
      preferences: this.preferences.trim() || undefined
    };

    this.newsletterService.subscribe(request).subscribe({
      next: () => {
        this.isLoading = false;
        this.applyPendingState();
        this.refreshSubscriptionState();
      },
      error: (err) => {
        this.isLoading = false;
        this.isError = true;
        this.statusMessage = err.error?.error || 'Failed to subscribe. Please try again.';
      }
    });
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
}
