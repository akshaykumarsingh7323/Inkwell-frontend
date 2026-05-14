import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-select-role',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './select-role.html',
  styleUrl: './select-role.css'
})
export class SelectRole implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  isLoading = false;
  errorMessage: string | null = null;
  currentRole: string | null = null;
  acceptedTerms = false;
  isUpgradeMode = false;

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (token) {
      localStorage.setItem('access_token', token);
      localStorage.setItem('user_data', JSON.stringify({ accessToken: token, role: 'ROLE_NOT_SELECTED' }));
      this.authService.initAuth().subscribe({
        next: () => this.resolveCurrentState(),
        error: () => this.router.navigate(['/login'])
      });
      return;
    }

    this.resolveCurrentState();
  }

  private resolveCurrentState(): void {
    const currentUser = this.authService.getCurrentUserSnapshot();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.currentRole = currentUser.role;
    this.isUpgradeMode = this.currentRole === 'READER';

    if (this.currentRole === 'AUTHOR' || this.currentRole === 'ADMIN') {
      this.router.navigate([this.authService.getDefaultRouteForRole(this.currentRole)]);
    }
  }

  continueAsReader(): void {
    this.submitRole('READER');
  }

  becomeAuthor(): void {
    this.submitRole('AUTHOR');
  }

  private submitRole(role: 'READER' | 'AUTHOR'): void {
    if (this.isLoading) {
      return;
    }

    if (role === 'AUTHOR' && !this.acceptedTerms) {
      this.errorMessage = 'Accepting author terms is required before continuing.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.authService.selectRole({ role, acceptedTerms: this.acceptedTerms }).subscribe({
      next: () => {
        this.router.navigateByUrl(role === 'AUTHOR' ? '/author-dashboard' : '/');
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Failed to update your role. Please try again.';
      }
    });
  }
}
