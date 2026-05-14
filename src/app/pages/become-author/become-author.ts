import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-become-author',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './become-author.html',
  styleUrl: './become-author.css'
})
export class BecomeAuthor {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  becomeAuthorForm = this.fb.group({
    username: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.pattern('^[a-z0-9_]+$')
    ]],
    phoneNumber: ['', [
      Validators.required,
      Validators.pattern('^[0-9+ ]{10,15}$')
    ]],
    acceptedTerms: [false, [Validators.requiredTrue]]
  });

  errorMessage: string | null = null;
  isLoading = false;
  userEmail: string = '';

  constructor() {
    const user = this.authService.getCurrentUserSnapshot();
    if (user) {
      this.userEmail = user.email;
      // Pre-fill username if they already have one (from email prefix)
      this.becomeAuthorForm.patchValue({ username: user.username });
    } else {
      this.router.navigate(['/login']);
    }
  }

  onSubmit(): void {
    if (this.becomeAuthorForm.invalid || this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = null;

    const { username, phoneNumber, acceptedTerms } = this.becomeAuthorForm.value;

    this.authService.selectRole({
      role: 'AUTHOR',
      username: username!,
      phoneNumber: phoneNumber!,
      acceptedTerms: !!acceptedTerms
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/author-dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || err.message || 'Failed to upgrade account. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}
