import { Component, inject, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmationService } from '../../services/confirmation.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  searchQuery = '';

  currentUser$ = this.authService.currentUser$;
  menuOpen = signal(false);
  profileOpen = signal(false);
  unreadCount = signal(0);

  constructor() {
    this.currentUser$.subscribe((user) => {
      if (!user) {
        this.unreadCount.set(0);
        return;
      }

      this.notificationService.getUnreadCount().subscribe({
        next: (count) => this.unreadCount.set(count),
        error: () => this.unreadCount.set(0)
      });
    });
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
    if (this.menuOpen()) this.profileOpen.set(false);
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/explore'], { queryParams: { q: this.searchQuery.trim() } });
      this.searchQuery = '';
      this.closeMenus();
    }
  }

  toggleProfile(): void {
    this.profileOpen.update(v => !v);
    if (this.profileOpen()) this.menuOpen.set(false);
  }

  closeMenus(): void {
    this.menuOpen.set(false);
    this.profileOpen.set(false);
  }

  async logout() {
    const confirmed = await this.confirmationService.confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to logout from your account?',
      confirmText: 'Sign Out',
      type: 'danger'
    });

    if (confirmed) {
      this.authService.logout();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenus();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.reader-nav') && !target?.closest('.reader-nav__mobile')) {
      this.closeMenus();
    }
  }
}
