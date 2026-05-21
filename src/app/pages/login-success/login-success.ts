import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-success',
  standalone: true,
  templateUrl: './login-success.html',
  styleUrl: './login-success.css'
})
export class LoginSuccess implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('accessToken') || this.route.snapshot.queryParamMap.get('token');
    
    if (token) {
      console.log('OAuth2 token received, finalizing session...');
      // Save token first so the getCurrentUser call can use it in the interceptor
      localStorage.setItem('access_token', token);
      
      // Initialize a temporary user object with the token so AuthService can update it
      const tempUser: any = { accessToken: token };
      localStorage.setItem('user_data', JSON.stringify(tempUser));

      this.authService.getCurrentUser().subscribe({
        next: (user) => {
          console.log('Session finalized, redirecting to dashboard');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          console.error('Failed to finalize session:', err);
          // Only redirect to login if it's actually an auth error
          if (err.status === 401 || err.status === 403) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_data');
            this.router.navigate(['/login']);
          } else {
            // For other errors (like 500 or timeout), maybe wait or retry?
            // For now, go back to login to be safe
            this.router.navigate(['/login']);
          }
        }
      });
    } else {
      console.warn('No token found in OAuth2 redirect');
      this.router.navigate(['/login']);
    }
  }
}
