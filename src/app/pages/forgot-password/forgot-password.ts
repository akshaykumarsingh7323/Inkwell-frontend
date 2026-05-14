import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  email: string = '';
  loading: boolean = false;

  onSubmit(): void {
    if (!this.email) return;

    this.loading = true;

    this.authService.forgotPassword(this.email).subscribe({
      next: (res: any) => {
        this.toastService.success('OTP has been sent to your email. Redirecting to reset page...');
        this.loading = false;
        setTimeout(() => this.router.navigate(['/reset-password']), 2000);
      },
      error: (err: any) => {
        let errorMsg = '';
        if (err.status === 404) {
          errorMsg = 'This email is not registered with us.';
        } else {
          errorMsg = err.error?.message || err.message || 'Failed to send OTP. Please try again.';
        }
        this.toastService.error(errorMsg);
        this.loading = false;
      }
    });
  }
}
