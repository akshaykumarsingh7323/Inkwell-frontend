import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommentService, CommentResponse } from '../../services/comment.service';
import { AuthService } from '../../services/auth.service';
import { PostService } from '../../services/post.service';
import { PublicUserProfile } from '../../models/user.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Router } from '@angular/router';

@Component({
  selector: 'app-comment-moderation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comment-moderation.html',
  styleUrl: './comment-moderation.css',
})
export class CommentModeration implements OnInit {
  private commentService = inject(CommentService);
  private authService = inject(AuthService);
  private router = inject(Router);

  comments: CommentResponse[] = [];
  isLoading = true;
  roleLabel = 'Author';

  authorProfiles: Record<number, PublicUserProfile> = {};
  postDetails: Record<number, { title: string, slug: string }> = {};

  commentToDeleteId: number | null = null;
  isSubmitting = false;

  private postService = inject(PostService);

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.roleLabel = user?.role === 'ADMIN' ? 'Admin' : 'Author';
    });
    this.loadPendingComments();
  }

  loadPendingComments(): void {
    this.isLoading = true;
    this.commentService.getPendingCommentsForModerator().subscribe({
      next: (data) => {
        this.comments = data;
        this.loadExtraDetails(data);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadExtraDetails(comments: CommentResponse[]): void {
    const uniqueAuthorIds = Array.from(new Set(comments.map(c => c.authorId)));
    const uniquePostIds = Array.from(new Set(comments.map(c => c.postId)));

    // Load Author Profiles
    if (uniqueAuthorIds.length > 0) {
      forkJoin(
        uniqueAuthorIds.map(id => 
          this.authService.getPublicProfile(id).pipe(
            catchError(() => of(null))
          )
        )
      ).subscribe(profiles => {
        profiles.forEach(p => {
          if (p) this.authorProfiles[Number(p.userId)] = p;
        });
      });
    }

    // Load Post Titles and Slugs
    if (uniquePostIds.length > 0) {
      forkJoin(
        uniquePostIds.map(id => 
          this.postService.getPostById(id).pipe(
            catchError(() => of(null))
          )
        )
      ).subscribe(posts => {
        posts.forEach(p => {
          if (p) this.postDetails[p.postId] = { title: p.title, slug: p.slug };
        });
      });
    }
  }

  confirmDelete(id: number): void {
    this.commentToDeleteId = id;
  }

  cancelDelete(): void {
    this.commentToDeleteId = null;
  }

  executeDelete(): void {
    if (this.commentToDeleteId !== null) {
      const id = this.commentToDeleteId;
      this.isSubmitting = true;
      this.commentService.deleteComment(id).subscribe({
        next: () => {
          this.comments = this.comments.filter(c => c.commentId !== id);
          this.commentToDeleteId = null;
          this.isSubmitting = false;
        },
        error: () => {
          this.isSubmitting = false;
          this.commentToDeleteId = null;
        }
      });
    }
  }

  viewPost(postId: number): void {
    const slug = this.postDetails[postId]?.slug;
    if (slug) {
      this.router.navigate(['/post', slug]);
    }
  }

  approveComment(id: number): void {
    this.commentService.moderateComment(id, 'APPROVE').subscribe({
      next: () => {
        this.comments = this.comments.filter((c) => c.commentId !== id);
      }
    });
  }

  rejectComment(id: number): void {
    this.commentService.moderateComment(id, 'REJECT').subscribe({
      next: () => {
        this.comments = this.comments.filter((c) => c.commentId !== id);
      }
    });
  }

  getInitial(authorId: number): string {
    const name = this.authorProfiles[authorId]?.fullName || this.authorProfiles[authorId]?.username || String(authorId);
    return name.charAt(0).toUpperCase();
  }

  getAuthorName(authorId: number): string {
    const profile = this.authorProfiles[authorId];
    return profile ? (profile.fullName || profile.username) : `User #${authorId}`;
  }

  getPostTitle(postId: number): string {
    return this.postDetails[postId]?.title || `Post #${postId}`;
  }
}
