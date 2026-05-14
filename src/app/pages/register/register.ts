import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  registerForm = this.fb.group({
    fullName: ['', [
      Validators.required,
      Validators.pattern('^[A-Z][a-zA-Z ]*$') // Starts with Capital letter
    ]],
    email: ['', [
      Validators.required, 
      Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$') // Proper email regex
    ]],
    password: ['', [
      Validators.required, 
      Validators.pattern(strongPasswordPattern)
    ]],
    role: ['READER', [Validators.required]],
    acceptedTerms: [false]
  });

  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;
  showPassword = false;
  emailAlreadyExists = false;

  togglePassword(): void {
    this.showPassword = !this.showPassword;
    this.cdr.detectChanges();
  }
  get fullNameControl() {
    return this.registerForm.get('fullName');
  }

  get emailControl() {
    return this.registerForm.get('email');
  }

  get passwordControl() {
    return this.registerForm.get('password');
  }

  showFieldError(field: 'fullName' | 'email' | 'password'): boolean {
    const control = this.registerForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  onSubmit(): void {
    if (!this.registerForm.valid || this.isLoading) {
      return;
    }

    if (this.registerForm.value.role === 'AUTHOR' && !this.registerForm.value.acceptedTerms) {
      this.errorMessage = 'You must accept the author terms and conditions.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    const request = {
      username: '', // Backend will generate one
      fullName: this.registerForm.value.fullName!.trim(),
      email: this.registerForm.value.email!.trim().toLowerCase(),
      password: this.registerForm.value.password!
    };

    this.authService.register(request).subscribe({
      next: (response) => {
        const selectedRole = this.registerForm.value.role;
      if (selectedRole === 'AUTHOR') {
          this.authService.selectRole({
            role: 'AUTHOR',
            acceptedTerms: this.registerForm.value.acceptedTerms || false,
            username: response.username
          }).subscribe({
            next: () => {
              this.isLoading = false;
              this.successMessage = 'Account created. Redirecting...';
              this.cdr.detectChanges();
              setTimeout(() => {
                this.router.navigateByUrl('/author-dashboard');
              }, 700);
            },
            error: (err) => {
              this.isLoading = false;
              this.errorMessage = err?.message || 'Failed to assign Author role. Please complete setup later.';
              this.cdr.detectChanges();
            }
          });
        } else {
          this.isLoading = false;
          this.successMessage = 'Account created. Redirecting...';
          this.cdr.detectChanges();
          setTimeout(() => {
            const target = response.role
              ? this.authService.getDefaultRouteForRole(response.role)
              : '/select-role';
            this.router.navigateByUrl(target);
          }, 700);
        }
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 409) {
          const msg = (err.error?.message || err.message || '').toLowerCase();
          if (msg.includes('email')) {
            this.emailAlreadyExists = true;
          } else if (msg.includes('username')) {
            this.errorMessage = 'This username is already taken. Please choose another one.';
          } else {
            this.errorMessage = err.error?.message || 'Email or Username already exists.';
          }
        } else if (err.status === 400 && err.error?.errors) {
          const errors = err.error.errors;
          const firstField = Object.keys(errors)[0];
          this.errorMessage = errors[firstField];
        } else {
          this.errorMessage = err.error?.message || err.message || 'Registration failed. Please try again.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  goToLogin(): void {
    this.emailAlreadyExists = false;
    this.router.navigate(['/login']);
  }

  registerWithGoogle(): void {
    window.location.href = environment.oauthRedirectUrl;
  }

  registerWithGithub(): void {
    window.location.href = environment.githubOauthRedirectUrl;
  }
}
