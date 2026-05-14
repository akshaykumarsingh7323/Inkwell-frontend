import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { PostService, PostResponse, TopAuthorAnalytics, TopViewedPost } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-post-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './post-analytics.html',
  styleUrl: './post-analytics.css',
})
export class PostAnalytics implements OnInit {
  private postService = inject(PostService);
  private authService = inject(AuthService);

  posts: PostResponse[] = [];
  topPosts: Array<PostResponse | TopViewedPost> = [];
  topAuthors: TopAuthorAnalytics[] = [];
  isLoading = true;
  isAdminView = false;

  stats = [
    { label: 'View Count', value: '0', trend: '', trendType: 'neutral' },
    { label: 'Like Count', value: '0', trend: '', trendType: 'neutral' },
    { label: 'Total Posts', value: '0', trend: '', trendType: 'neutral' },
    { label: 'Avg. Views/Post', value: '0', trend: '', trendType: 'neutral' }
  ];

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.isAdminView = user.role === 'ADMIN';
        if (this.isAdminView) {
          this.loadAdminAnalytics();
        } else {
          this.loadPosts(user.userId);
        }
      }
    });
  }

  loadPosts(userId: string): void {
    this.isLoading = true;
    this.postService.getPostsByAuthor(userId, 0, 100).subscribe({
      next: (res) => {
        this.posts = res.content || [];
        this.calculateAnalytics();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load posts', err);
        this.isLoading = false;
      }
    });
  }

  calculateAnalytics(): void {
    const totalViews = this.posts.reduce((sum, post) => sum + (post.viewCount || 0), 0);
    const totalLikes = this.posts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
    const totalPosts = this.posts.length;
    const avgViews = totalPosts ? Math.round(totalViews / totalPosts) : 0;

    this.stats[0].value = totalViews.toLocaleString();
    this.stats[1].value = totalLikes.toLocaleString();
    this.stats[2].value = totalPosts.toString();
    this.stats[3].value = avgViews.toLocaleString();

    // Sort by likes for top posts
    this.topPosts = [...this.posts].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0)).slice(0, 5);
  }

  loadAdminAnalytics(): void {
    this.isLoading = true;
    forkJoin({
      topPosts: this.postService.getTopViewedPosts(),
      topAuthors: this.postService.getTopAuthors(),
      publishedPosts: this.postService.getPublishedPosts(0, 100)
    }).subscribe({
      next: ({ topPosts, topAuthors, publishedPosts }) => {
        this.posts = publishedPosts.content || [];
        this.topPosts = topPosts;
        this.topAuthors = topAuthors;

        const totalViews = topPosts.reduce((sum, post) => sum + (post.viewCount || 0), 0);
        const totalLikes = topPosts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
        this.stats[0].value = totalViews.toLocaleString();
        this.stats[1].value = totalLikes.toLocaleString();
        this.stats[2].value = publishedPosts.totalElements.toLocaleString();
        this.stats[3].value = topAuthors.length.toString();
        this.stats[3].label = 'Active Authors';
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load admin analytics', err);
        this.isLoading = false;
      }
    });
  }

  getPercentage(likes: number): number {
    const leadLikes = this.topPosts.length ? (this.topPosts[0].likesCount || 0) : 0;
    if (!leadLikes) return 0;
    return Math.round((likes / leadLikes) * 100);
  }
}
