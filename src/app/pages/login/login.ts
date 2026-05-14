import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private toastService = inject(ToastService);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  errorMessage: string | null = null;
  isLoading = false;
  showPassword = false;
  showGithubChoices = false;
  emailNotRegistered = false;

  togglePassword(): void {
    this.showPassword = !this.showPassword;
    this.cdr.detectChanges();
  }

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  showFieldError(field: 'email' | 'password'): boolean {
    const control = this.loginForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  onSubmit(): void {
    if (!this.loginForm.valid || this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = null;
    this.emailNotRegistered = false;
    const credentials = {
      usernameOrEmail: this.loginForm.value.email!.trim(),
      password: this.loginForm.value.password!
    };

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const target = returnUrl || this.authService.getDefaultRouteForRole(response.role);
        this.router.navigateByUrl(target);
      },
      error: (err) => {
        this.isLoading = false;
        let errorMsg = '';
        if (err.status === 404) {
          this.emailNotRegistered = true;
          errorMsg = 'This email is not registered.';
        } else if (err.status === 401) {
          errorMsg = 'Wrong password. Please try again.';
        } else if (err.status === 403) {
          errorMsg = 'Your account has been deactivated. Please contact support.';
        } else {
          errorMsg = err.error?.message || err.message || 'Login failed. Please check your connection.';
        }
        this.toastService.error(errorMsg);
        this.cdr.detectChanges();
      }
    });
  }

  goToRegister(): void {
    this.emailNotRegistered = false;
    this.router.navigate(['/register']);
  }

  loginWithGoogle(): void {
    window.location.href = `${environment.oauthRedirectUrl}?prompt=select_account`;
  }

  toggleGithubChoices(): void {
    this.showGithubChoices = !this.showGithubChoices;
  }

  startGithubLogin(forceLogin: boolean): void {
    const prompt = forceLogin ? 'select_account' : 'none';
    window.location.href = `${environment.githubOauthRedirectUrl}?prompt=${prompt}`;
  }
}

