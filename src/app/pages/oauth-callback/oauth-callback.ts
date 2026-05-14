import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Loading State -->
    <div *ngIf="isLoading" style="display:flex;min-height:100vh;align-items:center;justify-content:center;flex-direction:column;gap:1rem;">
      <div style="width:40px;height:40px;border:3px solid rgba(0,0,0,.1);border-top-color:#004643;border-radius:50%;animation:spin 1s linear infinite"></div>
      <p style="color:#004643;font-weight:600;">Finalizing your session...</p>
    </div>

    <!-- Full Name Modal for New Google Users -->
    <div *ngIf="showNameModal" class="modal-backdrop">
      <div class="name-modal">
        <div class="modal-icon">
          <span class="material-symbols-outlined">person_add</span>
        </div>

        <h2>Welcome to Inkwell! 🎉</h2>
        <p>You're almost in! Please enter your full name to complete your profile setup.</p>

        <div class="input-wrap">
          <label>Full Name</label>
          <input
            type="text"
            [(ngModel)]="fullName"
            placeholder="Enter your full name"
            class="name-input"
            (keyup.enter)="submitName()"
            id="full-name-input"
          />
        </div>

        <div class="error-msg" *ngIf="nameError">{{ nameError }}</div>

        <button class="btn-continue" (click)="submitName()" [disabled]="isSaving">
          {{ isSaving ? 'Saving...' : 'Continue to Inkwell →' }}
        </button>
      </div>
    </div>

    <!-- Success State -->
    <div *ngIf="showSuccess" class="modal-backdrop">
      <div class="success-modal">
        <div class="success-icon">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <h2>Login Successful!</h2>
        <p>Welcome to Inkwell. Redirecting you now...</p>
      </div>
    </div>

    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes modalPop {
        from { opacity: 0; transform: scale(0.95) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }

      .modal-backdrop {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #004643 0%, #00302e 100%);
        animation: fadeIn 0.3s ease;
      }

      .name-modal, .success-modal {
        background: white;
        border-radius: 20px;
        padding: 48px 40px;
        width: 90%;
        max-width: 440px;
        text-align: center;
        box-shadow: 0 25px 50px rgba(0,0,0,0.25);
        animation: modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .modal-icon {
        width: 72px;
        height: 72px;
        background: linear-gradient(135deg, #004643, #00685e);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;
        box-shadow: 0 8px 20px rgba(0,70,67,0.3);
      }

      .modal-icon span {
        font-size: 36px;
        color: white;
      }

      .name-modal h2, .success-modal h2 {
        font-size: 24px;
        font-weight: 800;
        color: #001e1d;
        margin-bottom: 10px;
      }

      .name-modal p, .success-modal p {
        color: #667c7b;
        font-size: 15px;
        line-height: 1.6;
        margin-bottom: 30px;
      }

      .input-wrap {
        text-align: left;
        margin-bottom: 20px;
      }

      .input-wrap label {
        display: block;
        font-size: 13px;
        font-weight: 700;
        color: #667c7b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 8px;
      }

      .name-input {
        width: 100%;
        padding: 14px 18px;
        border: 2px solid #e2e8f0;
        border-radius: 10px;
        font-size: 16px;
        color: #001e1d;
        background: #f8fafc;
        transition: all 0.2s;
        outline: none;
      }

      .name-input:focus {
        border-color: #004643;
        background: white;
        box-shadow: 0 0 0 4px rgba(0,70,67,0.08);
      }

      .error-msg {
        background: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fee2e2;
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 16px;
        text-align: left;
      }

      .btn-continue {
        width: 100%;
        padding: 15px;
        background: #f9bc2c;
        color: #001e1d;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 15px rgba(249,188,44,0.3);
      }

      .btn-continue:hover:not(:disabled) {
        background: #e5a924;
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(249,188,44,0.4);
      }

      .btn-continue:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .success-icon {
        width: 80px;
        height: 80px;
        background: #22c55e;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;
        box-shadow: 0 8px 20px rgba(34,197,94,0.3);
      }

      .success-icon span {
        font-size: 40px;
        color: white;
      }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
  `
})
export class OAuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  isLoading = true;
  showNameModal = false;
  showSuccess = false;
  fullName = '';
  nameError = '';
  isSaving = false;
  private targetRoute = '/home';
  private pendingUser: any = null;

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const isNewUser = this.route.snapshot.queryParamMap.get('isNewUser') === 'true';
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    localStorage.setItem('access_token', token);
    localStorage.setItem('user_data', JSON.stringify({ accessToken: token }));

    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.pendingUser = user;
        this.targetRoute = returnUrl || this.authService.getDefaultRouteForRole(user.role);
        this.isLoading = false;

        if (isNewUser && (!user.fullName || user.fullName === user.email?.split('@')[0])) {
          // Pre-fill with whatever Google provided
          this.fullName = user.fullName || '';
          this.showNameModal = true;
          setTimeout(() => {
            document.getElementById('full-name-input')?.focus();
          }, 300);
        } else {
          // Existing user — show success and redirect
          this.showSuccessAndRedirect();
        }
      },
      error: () => {
        this.authService.clearStorage();
        this.router.navigate(['/login']);
      }
    });
  }

  submitName(): void {
    const trimmed = this.fullName.trim();
    if (!trimmed || trimmed.length < 2) {
      this.nameError = 'Please enter your full name (at least 2 characters).';
      return;
    }

    this.nameError = '';
    this.isSaving = true;

    this.authService.updateProfile({ fullName: trimmed }).subscribe({
      next: () => {
        this.isSaving = false;
        this.showNameModal = false;
        this.showSuccessAndRedirect();
      },
      error: () => {
        this.isSaving = false;
        this.nameError = 'Failed to save name. Please try again.';
      }
    });
  }

  private showSuccessAndRedirect(): void {
    this.showSuccess = true;
    setTimeout(() => {
      this.router.navigateByUrl(this.targetRoute);
    }, 1800);
  }
}
