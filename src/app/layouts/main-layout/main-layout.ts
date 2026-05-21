import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ConfirmationService } from '../../services/confirmation.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, CommonModule],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  currentUser$ = this.authService.currentUser$;
  
  // State Signals
  activeCat = signal<string>('all');
  mobileSidebarOpen = signal(false);
  isDarkMode = signal(false);

  ngOnInit(): void {
    // Synchronize initial state with current URL
    this.updateActiveState(this.router.url);

    if (typeof window !== 'undefined' && localStorage) {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        this.isDarkMode.set(true);
        document.body.classList.add('dark-theme');
      }
    }

    // Listen to router events to clear activeCat if not on home/search
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.mobileSidebarOpen.set(false);
      this.updateActiveState(event.urlAfterRedirects || event.url);
    });
  }

  private updateActiveState(url: string): void {
    if (!url.includes('/home') && !url.includes('/explore')) {
      this.activeCat.set('');
    } else if (url.includes('/home') || url.includes('/explore')) {
       if (!url.includes('category=')) {
         this.activeCat.set('all');
       } else {
         // The category is in the URL, we could extract it here to be perfect
         const match = url.match(/category=([^&]+)/);
         if (match) this.activeCat.set(match[1]);
       }
    }
  }

  // Event Handlers
  filterCat(cat: string): void {
    this.activeCat.set(cat);
    this.mobileSidebarOpen.set(false);
    // Navigate to /home with query params
    this.router.navigate(['/home'], { queryParams: { category: cat !== 'all' ? cat : null } });
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((value) => !value);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  toggleTheme(): void {
    this.isDarkMode.update(v => !v);
    if (typeof document !== 'undefined') {
      if (this.isDarkMode()) {
        document.body.classList.add('dark-theme');
        if (typeof localStorage !== 'undefined') localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark-theme');
        if (typeof localStorage !== 'undefined') localStorage.setItem('theme', 'light');
      }
    }
  }

  async logout() {
    const confirmed = await this.confirmationService.confirm({
      title: 'Confirm Logout',
      message: 'Are you sure you want to logout, ' + this.getFirstName(this.authService.getCurrentUserSnapshot()?.fullName) + '?',
      confirmText: 'Logout',
      type: 'danger'
    });

    if (confirmed) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }

  // Template Helpers
  getUserInitials(name?: string): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getFirstName(fullName?: string | null): string {
    return fullName?.trim().split(/\s+/)[0] || 'Friend';
  }

  getGreetingName(user: any): string {
    if (!user) return 'Guest';
    return this.getFirstName(user.fullName);
  }

  getConsoleDisplayName(user: any): string {
    if (!user) {
      return 'Guest';
    }

    return user.fullName?.trim() || user.username || 'Friend';
  }

  getConsoleLabel(user: any): string {
    if (this.isAdmin(user)) {
      return 'Admin Console';
    }

    if (this.isAuthor(user)) {
      return 'Author Console';
    }

    return 'Logged in as Reader';
  }

  isAdmin(user: any): boolean {
    if (!user || !user.role) return false;
    const r = user.role.toUpperCase();
    return r.includes('ADMIN');
  }

  isAuthor(user: any): boolean {
    if (!user || !user.role) return false;
    const r = user.role.toUpperCase();
    return r.includes('AUTHOR');
  }

  goToDashboard(user: any): void {
    if (this.isAdmin(user)) {
      this.router.navigate(['/admin']);
    } else if (this.isAuthor(user)) {
      this.router.navigate(['/author-dashboard']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  getNewsletterRoute(): string {
    const user = this.authService.getCurrentUserSnapshot();
    if (this.isAdmin(user)) {
      return '/newsletter-management';
    }
    return '/newsletter';
  }

  goToProfile(): void {
    this.mobileSidebarOpen.set(false);
    const user = this.authService.getCurrentUserSnapshot();
    if (user?.userId) {
      this.router.navigate(['/author', user.userId]);
    } else {
      this.router.navigate(['/reader-settings']);
    }
  }

  isAuthorConsoleActive(): boolean {
    const url = this.router.url;
    return url.includes('/author-dashboard') || 
           url.includes('/my-posts') || 
           url.includes('/create-post') || 
           url.includes('/edit-post') || 
           url.includes('/comment-moderation') || 
           url.includes('/media-library') || 
           url.includes('/post-analytics');
  }
}
