import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmationService } from '../../services/confirmation.service';

@Component({
  selector: 'app-author-studio-shell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './author-studio-shell.html',
  styleUrl: './author-studio-shell.css'
})
export class AuthorStudioShell implements OnInit {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);

  @Input() title = '';
  @Input() subtitle = '';
  @Input() activeSection:
    | 'overview'
    | 'posts'
    | 'create'
    | 'comments'
    | 'media'
    | 'analytics'
    | 'settings'
    | 'notifications'
    | 'followers' = 'overview';

  currentUser$ = this.authService.currentUser$;
  menuOpen = signal(false);
  isDarkMode = signal(this.getInitialTheme());
  unreadCount = signal(0);

  private getInitialTheme(): boolean {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  toggleTheme(): void {
    this.isDarkMode.update(dark => !dark);
    const theme = this.isDarkMode() ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: string): void {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  ngOnInit(): void {
    this.applyTheme(this.isDarkMode() ? 'dark' : 'light');
    this.fetchUnreadCount();
    
    // Refresh count when user changes or when service triggers it
    this.currentUser$.subscribe(() => this.fetchUnreadCount());
    this.notificationService.refreshCount$.subscribe(() => this.fetchUnreadCount());
  }

  fetchUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadCount.set(count),
      error: () => this.unreadCount.set(0)
    });
  }

  sectionLabel = computed(() => {
    switch (this.activeSection) {
      case 'posts': return 'My Posts';
      case 'create': return 'Create Post';
      case 'comments': return 'Comments';
      case 'media': return 'Media Library';
      case 'analytics': return 'Analytics';
      case 'settings': return 'Profile Settings';
      case 'followers': return 'Followers';
      default: return 'Overview';
    }
  });

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  async logout() {
    const confirmed = await this.confirmationService.confirm({
      title: 'Confirm Logout',
      message: 'Are you sure you want to logout from the author studio?',
      confirmText: 'Logout',
      type: 'danger'
    });

    if (confirmed) {
      this.authService.logout();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }
}
