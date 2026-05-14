import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommentService, CommentResponse } from '../../services/comment.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { Router } from '@angular/router';
import { catchError, of, timeout } from 'rxjs';

@Component({
  selector: 'app-admin-comment-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-comment-management.html',
  styleUrl: './admin-comment-management.css'
})
export class AdminCommentManagement implements OnInit {
  private commentService = inject(CommentService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  comments: CommentResponse[] = [];
  isLoading = true;
  errorMessage = '';
  currentUser$ = this.authService.currentUser$;

  ngOnInit(): void {
    this.loadComments();
  }

  loadComments(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.commentService.getPendingComments().pipe(
      timeout(5000),
      catchError((error) => {
        console.error('Error fetching comments:', error);
        this.errorMessage = 'Failed to load moderation queue. Please check if the Comment Service is running.';
        this.isLoading = false;
        return of([]);
      })
    ).subscribe(data => {
      this.comments = data;
      this.isLoading = false;
    });
  }

  approveComment(id: number): void {
    this.commentService.approveComment(id).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.commentId !== id);
        this.toastService.success('Comment approved and published.');
      },
      error: () => {
        this.toastService.error('Failed to approve comment.');
      }
    });
  }

  async rejectComment(id: number) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Reject Comment',
      message: 'Are you sure you want to reject and delete this comment?',
      confirmText: 'Reject',
      type: 'danger'
    });

    if (!confirmed) return;

    this.commentService.rejectComment(id).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.commentId !== id);
        this.toastService.info('Comment rejected and removed.');
      },
      error: () => {
        this.toastService.error('Failed to reject comment.');
      }
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
}
