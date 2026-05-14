import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of, interval, Subscription } from 'rxjs';
import { catchError, switchMap, startWith } from 'rxjs/operators';
import { AuthResponse, PublicUserProfile } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { CommentResponse, CommentService } from '../../services/comment.service';

@Component({
  selector: 'app-comments-section',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './comments-section.html',
  styleUrl: './comments-section.css'
})
export class CommentsSectionComponent implements OnChanges {
  private commentService = inject(CommentService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) postId!: number;
  @Input() currentUser: AuthResponse | null = null;

  comments: CommentResponse[] = [];
  rootComments: CommentResponse[] = [];
  repliesByParent: Record<number, CommentResponse[]> = {};
  authorProfiles: Record<number, PublicUserProfile> = {};
  likedCommentIds = new Set<number>();

  newCommentContent = '';
  replyDrafts: Record<number, string> = {};
  activeReplyId: number | null = null;
  commentToDeleteId: number | null = null;

  isLoading = false;
  isSubmitting = false;
  errorMessage = '';

  private pollingSubscription?: Subscription;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['postId'] && this.postId) {
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  startPolling(): void {
    this.stopPolling();
    this.pollingSubscription = interval(15000) // Poll every 15 seconds
      .pipe(
        startWith(0),
        switchMap(() => {
          if (this.isSubmitting) return of(null); // Don't poll while submitting to avoid UI jumps
          return this.commentService.getCommentsByPost(this.postId).pipe(
            catchError(() => of(null))
          );
        })
      )
      .subscribe((comments) => {
        if (comments) {
          this.processComments(comments);
        }
      });
  }

  stopPolling(): void {
    this.pollingSubscription?.unsubscribe();
  }

  processComments(comments: CommentResponse[]): void {
    this.comments = comments;
    this.rootComments = comments.filter((comment) => !comment.parentId);
    this.repliesByParent = comments.reduce<Record<number, CommentResponse[]>>((acc, comment) => {
      if (comment.parentId) {
        acc[comment.parentId] = [...(acc[comment.parentId] ?? []), comment];
      }
      return acc;
    }, {});
    this.loadAuthorProfiles(comments);
  }

  loadComments(): void {
    this.commentService.getCommentsByPost(this.postId).subscribe({
      next: (comments) => this.processComments(comments),
      error: () => {
        this.errorMessage = 'Failed to load comments.';
      }
    });
  }

  loadAuthorProfiles(comments: CommentResponse[]): void {
    const uniqueAuthorIds = Array.from(new Set(comments.map((comment) => comment.authorId)));
    if (uniqueAuthorIds.length === 0) return;

    forkJoin(
      uniqueAuthorIds.map((authorId) => 
        this.authService.getPublicProfile(authorId).pipe(
          catchError(() => of({
            userId: String(authorId),
            username: 'unknown_user',
            fullName: 'Deleted User',
            avatarUrl: 'assets/default-avatar.png',
            bio: 'This user account was deleted.'
          } as PublicUserProfile))
        )
      )
    ).subscribe({
      next: (profiles) => {
        this.authorProfiles = profiles.reduce<Record<number, PublicUserProfile>>((acc, profile) => {
          if (profile) {
            acc[Number(profile.userId)] = profile;
          }
          return acc;
        }, {});
      }
    });
  }

  successMessage = '';

  submitComment(parentId?: number): void {
    const content = parentId ? this.replyDrafts[parentId]?.trim() : this.newCommentContent.trim();
    if (!content) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.commentService.createComment({
      postId: this.postId,
      parentId,
      content
    }).subscribe({
      next: (newComment) => {
        if (parentId) {
          this.replyDrafts[parentId] = '';
          this.activeReplyId = null;
        } else {
          this.newCommentContent = '';
        }
        this.isSubmitting = false;

        // Force immediate UI update regardless of status
        this.successMessage = newComment.status === 'PENDING' 
          ? 'Your comment is awaiting moderation.' 
          : 'Comment posted successfully.';

        // Manually push to local state first for instant feedback
        this.comments = [newComment, ...this.comments];
        if (!parentId) {
          this.rootComments = [newComment, ...this.rootComments];
        } else {
          this.repliesByParent = {
            ...this.repliesByParent,
            [parentId]: [...(this.repliesByParent[parentId] ?? []), newComment]
          };
        }

        // Add author profile for the new comment
        if (this.currentUser) {
          this.authorProfiles[newComment.authorId] = {
            userId: String(this.currentUser.userId),
            username: this.currentUser.username,
            fullName: this.currentUser.fullName,
            avatarUrl: this.currentUser.avatarUrl
          } as PublicUserProfile;
        }

        // Trigger Angular Change Detection
        this.cdr.detectChanges();

        // Refresh from server after a small delay to get full metadata
        setTimeout(() => {
          this.loadComments();
          this.cdr.detectChanges();
        }, 1000);
        
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 5000);
      },
      error: (err) => {
        const errorMsg = err.error?.message || err.error?.error || err.statusText || 'Unknown error';
        this.errorMessage = `Failed to submit comment: ${errorMsg}`;
        this.isSubmitting = false;
        setTimeout(() => this.errorMessage = '', 8000);
      }
    });
  }


  confirmDelete(id: number): void {
    this.commentToDeleteId = id;
  }

  cancelDelete(): void {
    this.commentToDeleteId = null;
  }

  executeDelete(): void {
    if (this.commentToDeleteId !== null) {
      this.isSubmitting = true;
      this.commentService.deleteComment(this.commentToDeleteId).subscribe({
        next: () => {
          const id = this.commentToDeleteId;
          this.comments = this.comments.filter(c => c.commentId !== id);
          this.rootComments = this.rootComments.filter(c => c.commentId !== id);
          if (id !== null) {
            Object.keys(this.repliesByParent).forEach(parentId => {
              const pId = Number(parentId);
              this.repliesByParent[pId] = (this.repliesByParent[pId] || []).filter(c => c.commentId !== id);
            });
          }
          this.commentToDeleteId = null;
          this.isSubmitting = false;
          this.loadComments(); // Still reload to stay in sync with server
        },
        error: (err) => {
          console.error('Failed to delete comment', err);
          const errorMsg = err.error?.message || err.error?.error || 'Failed to delete comment. Please try again later.';
          this.errorMessage = errorMsg;
          this.commentToDeleteId = null;
          this.isSubmitting = false;
          setTimeout(() => this.errorMessage = '', 8000);
        }
      });
    }
  }

  toggleLike(comment: CommentResponse): void {
    const isLiked = this.likedCommentIds.has(comment.commentId);
    const request$ = isLiked
      ? this.commentService.unlikeComment(comment.commentId)
      : this.commentService.likeComment(comment.commentId);

    request$.subscribe({
      next: (updated) => {
        comment.likesCount = updated.likesCount;
        if (isLiked) this.likedCommentIds.delete(comment.commentId);
        else this.likedCommentIds.add(comment.commentId);
      }
    });
  }

  getReplies(commentId: number): CommentResponse[] {
    return this.repliesByParent[commentId] ?? [];
  }

  getAuthor(authorId: number): PublicUserProfile | undefined {
    return this.authorProfiles[authorId];
  }
}
