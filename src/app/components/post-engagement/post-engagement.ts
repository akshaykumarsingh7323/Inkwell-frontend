import { Component, Input, inject, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PostService, PostResponse } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-post-engagement',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './post-engagement.html',
  styleUrl: './post-engagement.css'
})
export class PostEngagementComponent implements OnInit, OnChanges {
  @Input({ required: true }) post!: PostResponse;
  @Input() isSticky = false;

  private postService = inject(PostService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  isLiked = false;
  isBookmarked = false;
  likesCount = 0;
  commentsCount = 0;

  ngOnInit() {
    this.syncState();
  }

  ngOnChanges() {
    this.syncState();
  }

  private syncState() {
    if (this.post) {
      this.isLiked = !!this.post.isLikedByCurrentUser;
      this.isBookmarked = !!this.post.isBookmarkedByCurrentUser;
      this.likesCount = this.post.likesCount || 0;
      this.commentsCount = this.post.commentsCount || 0;
    }
  }

  toggleLike() {
    if (!this.authService.isLoggedIn()) {
      this.authService.redirectToLogin(this.router.url);
      return;
    }

    const previousState = this.isLiked;
    this.isLiked = !this.isLiked;
    this.likesCount += this.isLiked ? 1 : -1;
    if (previousState) {
      this.postService.unlikePost(this.post.postId).subscribe({
        error: (err) => {
          this.isLiked = true;
          this.likesCount++;
        }
      });
    } else {
      this.postService.likePost(this.post.postId).subscribe({
        next: () => this.toastService.success('Post liked!'),
        error: (err) => {
          this.isLiked = false;
          this.likesCount--;
        }
      });
    }
  }

  toggleBookmark() {
    if (!this.authService.isLoggedIn()) {
      this.authService.redirectToLogin(this.router.url);
      return;
    }

    this.isBookmarked = !this.isBookmarked;
    
    if (this.isBookmarked) {
      this.postService.bookmarkPost(this.post.postId).subscribe({
        next: () => this.toastService.success('Post bookmarked!'),
        error: (err) => {
          this.isBookmarked = false;
        }
      });
    } else {
      this.postService.unbookmarkPost(this.post.postId).subscribe({
        error: (err) => {
          this.isBookmarked = true;
        }
      });
    }
  }

  scrollToComments() {
    const element = document.getElementById('comments-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  sharePost() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: this.post.title,
        url: url
      }).catch(() => undefined);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        this.toastService.info('Link copied to clipboard!');
      }).catch(() => undefined);
    }
  }
}
