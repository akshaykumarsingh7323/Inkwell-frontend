import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-role-landing',
  standalone: true,
  template: ''
})
export class RoleLandingComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    const user = this.authService.getCurrentUserSnapshot();

    if (!user || !this.authService.isLoggedIn()) {
      this.router.navigateByUrl('/home');
      return;
    }

    this.router.navigateByUrl(this.authService.getDefaultRouteForRole(user.role));
  }
}
