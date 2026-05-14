import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastService = inject(ToastService);

  token: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  loading: boolean = false;
  showPassword = false;

  ngOnInit(): void {
    // We allow manual OTP entry now
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  get passwordsMatch(): boolean {
    return this.newPassword === this.confirmPassword;
  }

  get isFormValid(): boolean {
    return this.token.length === 6 && 
           this.newPassword.length >= 8 && 
           this.passwordsMatch;
  }

  onSubmit(): void {
    if (!this.isFormValid) return;

    this.loading = true;

    const request = {
      token: this.token,
      newPassword: this.newPassword
    };

    this.authService.resetPassword(request).subscribe({
      next: (res) => {
        this.toastService.success('Password reset successful! Redirecting to login...');
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        const errorMsg = err.error?.message || 'Failed to reset password. Token may be expired.';
        this.toastService.error(errorMsg);
        this.loading = false;
      }
    });
  }
}
