import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { PostService, PostResponse } from '../../services/post.service';
import { AuthResponse } from '../../models/user.model';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { PaymentService } from '../../services/payment.service';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Sidebar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private authService = inject(AuthService);
  private postService = inject(PostService);
  private paymentService = inject(PaymentService);
  private router = inject(Router);

  user: AuthResponse | null = null;
  isLoading = true;
  recentPosts: PostResponse[] = [];
  purchases: any[] = [];

  totalViews = 0;
  totalLikes = 0;

  ngOnInit(): void {
    this.authService.currentUser$.pipe(
      map(user => user ?? null),
      distinctUntilChanged((prev, curr) => prev?.userId === curr?.userId)
    ).subscribe(user => {
      this.user = user;
      if (user) {
        this.isLoading = false;
        this.loadUserPosts(user.userId);
        this.loadPurchases(user.userId);
      }
    });
  }

  loadPurchases(userId: string): void {
    this.paymentService.getUserPayments(userId).subscribe({
      next: (res) => this.purchases = res,
      error: (err) => console.error('Failed to load purchases:', err)
    });
  }

  loadUserPosts(userId: string): void {
    this.postService.getPostsByAuthor(userId, 0, 5).subscribe({
      next: (res) => {
        this.recentPosts = res.content || [];
        this.calculateStats();
      },
      error: (err) => {
        console.error('Failed to load recent posts for dashboard:', err);
      }
    });
  }

  calculateStats(): void {
    this.totalViews = this.recentPosts.reduce((sum, post) => sum + (post.viewCount || 0), 0);
    this.totalLikes = this.recentPosts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
  }

  logout(): void {
    this.authService.logout();
  }

  createNewPost(): void {
    this.router.navigate(['/create-post']);
  }

  getInitial(): string {
    return this.user?.username?.charAt(0).toUpperCase() ?? '?';
  }
}
