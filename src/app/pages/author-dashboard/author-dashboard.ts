import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PostService } from '../../services/post.service';
import { CommentService } from '../../services/comment.service';
import { PaymentService } from '../../services/payment.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-author-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './author-dashboard.html',
  styleUrl: './author-dashboard.css'
})
export class AuthorDashboardComponent implements OnInit {
  public authService = inject(AuthService);
  private postService = inject(PostService);
  private commentService = inject(CommentService);
  private paymentService = inject(PaymentService);
  private router = inject(Router);

  isLoading = true;
  errorMessage = '';

  totalPublished = 0;
  totalUnpublished = 0;
  totalDrafts = 0;
  totalViews = 0;
  totalLikes = 0;
  totalFeatured = 0;
  totalPendingComments = 0;
  totalEarnings = 0;
  
  recentDrafts: any[] = [];
  premiumPosts: any[] = [];
  recentTransactions: any[] = [];

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        // If an admin accidentally lands here, redirect to the correct dashboard
        if (user.role?.includes('ADMIN')) {
          this.router.navigate(['/admin-dashboard']);
          return;
        }
        if (user.userId) {
          this.loadStats(user.userId);
        }
      }
    });
  }

  loadStats(userId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      posts: this.postService.getPostsByAuthor(userId, 0, 1000).pipe(
        catchError(err => of({ content: [] }))
      ),
      pendingComments: this.commentService.getPendingCommentsForModerator().pipe(
        catchError(err => of([]))
      ),
      earnings: this.paymentService.getAuthorEarnings(userId).pipe(
        catchError(err => of({ totalEarnings: 0 }))
      ),
      transactions: this.paymentService.getAuthorTransactions(userId).pipe(
        catchError(err => of([]))
      )
    }).subscribe({
      next: (results: any) => {
        const content = results.posts.content || [];
        this.totalPublished = content.filter((p: any) => p.status === 'PUBLISHED').length;
        this.totalUnpublished = content.filter((p: any) => p.status === 'UNPUBLISHED').length;
        this.totalDrafts = content.filter((p: any) => p.status === 'DRAFT').length;
        
        this.totalViews = content.reduce((sum: number, post: any) => sum + (post.viewCount || 0), 0);
        this.totalLikes = content.reduce((sum: number, post: any) => sum + (post.likesCount || 0), 0);
        
        this.recentDrafts = content.filter((p: any) => p.status === 'DRAFT').slice(0, 3);
        this.premiumPosts = content.filter((p: any) => p.isPremium);
        
        this.totalPendingComments = results.pendingComments.length || 0;
        this.totalEarnings = results.earnings.totalEarnings || 0;
        this.recentTransactions = results.transactions || [];
        
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.message || 'Failed to load dashboard data';
        this.isLoading = false;
      }
    });
  }

  retrySync(): void {
    const user = this.authService.getCurrentUserSnapshot();
    if (user?.userId) {
      this.loadStats(user.userId);
    }
  }
}
