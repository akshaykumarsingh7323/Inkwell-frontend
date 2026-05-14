import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PostService } from '../../services/post.service';
import { CommentService } from '../../services/comment.service';
import { NewsletterService } from '../../services/newsletter.service';
import { NotificationService } from '../../services/notification.service';
import { AuditService, AuditLog } from '../../services/audit.service';
import { forkJoin, of, catchError, timeout, take } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private authService = inject(AuthService);
  private postService = inject(PostService);
  private commentService = inject(CommentService);
  private newsletterService = inject(NewsletterService);
  private notificationService = inject(NotificationService);
  private auditService = inject(AuditService);
  private router = inject(Router);

  isLoading = true;
  currentUser$ = this.authService.currentUser$;

  totalUsers = 0;
  totalPublishedPosts = 0;
  totalPendingComments = 0;
  totalSubscribers = 0;
  totalNotifications = 0;
  
  recentLogs: AuditLog[] = [];
  errorMessage = '';

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.currentUser$.pipe(take(1)).subscribe((user: any) => {
      console.log('Current Admin User:', user);
      console.log('User Role from Token:', user?.role);
      console.log('Starting dashboard sync for role:', user?.role);

      forkJoin({
        users: this.authService.getAllUsers().pipe(
          timeout(60000), 
          catchError(err => { console.error('Users fetch failed:', err); return of([]); })
        ),
        posts: this.postService.getPublishedPosts(0, 1).pipe(
          timeout(60000), 
          catchError(err => { console.error('Posts fetch failed:', err); return of({ totalElements: 0, content: [] }); })
        ),
        comments: this.commentService.getPendingComments().pipe(
          timeout(60000), 
          catchError(err => { console.error('Comments fetch failed:', err); return of([]); })
        ),
        subscribers: this.newsletterService.getSubscriberCount().pipe(
          timeout(60000), 
          catchError(err => { console.error('Subscribers fetch failed:', err); return of(0); })
        ),
        notifications: this.notificationService.getAll().pipe(
          timeout(60000), 
          catchError(err => { console.error('Notifications fetch failed:', err); return of([]); })
        ),
        logs: this.auditService.getAuditLogs({ size: 5 }).pipe(
          timeout(60000), 
          catchError(err => { console.error('Audit logs fetch failed:', err); return of({ content: [] }); })
        )
      }).subscribe({
        next: (results: any) => {
          console.log('Dashboard sync complete. Results:', results);
          this.totalUsers = results.users?.length || 0;
          this.totalPublishedPosts = results.posts?.totalElements || 0;
          this.totalPendingComments = results.comments?.length || 0;
          this.totalSubscribers = results.subscribers || 0;
          this.totalNotifications = results.notifications?.length || 0;
          this.recentLogs = results.logs?.content || [];
          this.isLoading = false;
          
          if (this.totalUsers === 0 && this.totalPublishedPosts === 0) {
            console.warn('Dashboard loaded with all zeros. Checking for data availability...');
          }
        },
        error: (error) => {
          console.error('Fatal dashboard sync error:', error);
          this.errorMessage = 'System sync failed. Please check service connectivity.';
          this.isLoading = false;
        }
      });
    });
  }

  goToProfile(): void {
    const user = this.authService.getCurrentUserSnapshot();
    if (user?.userId) {
      this.router.navigate(['/author', user.userId]);
    } else {
      this.router.navigate(['/admin']);
    }
  }

  logout(): void {
    this.authService.logout();
  }

  isDarkMode = false;
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark-theme', this.isDarkMode);
  }
}
