import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationService, NotificationResponse } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { CommentService } from '../../services/comment.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class Notifications implements OnInit {
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private commentService = inject(CommentService);
  private toastService = inject(ToastService);

  notifications: NotificationResponse[] = [];
  isLoading = true;
  errorMessage = '';
  isAdmin = false;
  currentUser$ = this.authService.currentUser$;

  ngOnInit(): void {
    const user = this.authService.getCurrentUserSnapshot();
    this.isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.notificationService.getMyNotifications().subscribe({
      next: (data) => {
        this.notifications = data;
        this.errorMessage = '';
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.message || 'Failed to load notifications.';
        this.isLoading = false;
      }
    });
  }

  markAsRead(id: number): void {
    this.notificationService.markAsRead(id).subscribe(() => {
      const n = this.notifications.find((item) => item.notificationId === id);
      if (n) {
        n.isRead = true;
      }
    });
  }

  // Removed markAllAsRead as requested

  deleteNotification(id: number): void {
    this.notificationService.deleteNotification(id).subscribe(() => {
      this.notifications = this.notifications.filter((n) => n.notificationId !== id);
    });
  }

  approveComment(notification: NotificationResponse): void {
    if (!notification.relatedId) return;
    
    const commentId = notification.relatedId;
    const notifId = notification.notificationId;

    this.commentService.moderateComment(commentId, 'APPROVE').subscribe({
      next: () => {
        // Once approved, delete the notification permanently
        this.notificationService.deleteNotification(notifId).subscribe({
          next: () => {
            // Remove from local list for instant update
            this.notifications = this.notifications.filter(n => n.notificationId !== notifId);
          },
          error: (err) => {
            console.error('Failed to delete notification', err);
            // Fallback: just mark it as read locally if delete fails
            notification.isRead = true;
          }
        });
        this.toastService.success('Comment approved successfully');
      },
      error: (err) => {
        console.error('Failed to approve comment', err);
        if (err.status === 404) {
          // Comment is already gone, so let's clean up this orphaned notification
          this.notificationService.deleteNotification(notifId).subscribe(() => {
            this.notifications = this.notifications.filter(n => n.notificationId !== notifId);
          });
          this.toastService.info('This comment was already deleted. Removing notification.');
        } else {
          this.toastService.error('Failed to approve comment. Please try again later.');
        }
      }
    });
  }

  clearRead(): void {
    this.notificationService.deleteRead().subscribe(() => {
      // Clear anything that is read OR an approved stub
      this.notifications = this.notifications.filter((n) => !n.isRead && n.type !== 'APPROVED_STUB');
      this.toastService.info('Read notifications cleared');
    });
  }

  formatSmartDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    const timeStr = date.toLocaleTimeString([], timeOptions);

    if (diffDays === 0 && date.getDate() === now.getDate()) {
      return `Today ${timeStr}`;
    } else if (diffDays <= 1 && date.getDate() !== now.getDate()) {
      return `Yesterday ${timeStr}`;
    } else {
      const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
      return `${date.toLocaleDateString([], dateOptions)} ${timeStr}`;
    }
  }

  getIcon(type: string, title: string = ''): string {
    switch (type) {
      case 'NEW_COMMENT':
      case 'COMMENT_REPLY':
        return 'forum';
      case 'LIKE':
        return 'favorite';
      case 'NEW_POST':
        return 'article';
      case 'ADMIN_BROADCAST':
        if (title.includes('Post Unpublished') || title.includes('Content Removed')) {
          return 'gavel';
        }
        return 'campaign';
      case 'MODERATION':
        return 'gavel';
      case 'MENTION':
        return 'alternate_email';
      default:
        return 'notifications';
    }
  }
}
