import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthResponse, PublicUserProfile } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { CommentResponse, CommentService } from '../../services/comment.service';

@Component({
  selector: 'app-comment-section',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './comment-section.html',
  styleUrl: './comment-section.css'
})
export class CommentSectionComponent implements OnChanges {
  private commentService = inject(CommentService);
  private authService = inject(AuthService);

  @Input({ required: true }) postId!: number;
  @Input() currentUser: AuthResponse | null = null;

  comments: CommentResponse[] = [];
  rootComments: CommentResponse[] = [];
  repliesByParent: Record<number, CommentResponse[]> = {};
  authorProfiles: Record<number, PublicUserProfile> = {};
  likedCommentIds = new Set<number>();

  newCommentContent = '';
  replyDrafts: Record<number, string> = {};
  editingDrafts: Record<number, string> = {};
  activeReplyId: number | null = null;
  activeEditId: number | null = null;

  isLoading = false;
  isSubmitting = false;
  errorMessage = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['postId'] && this.postId) {
      this.loadComments();
    }
  }

  loadComments(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.commentService.getCommentsByPost(this.postId).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.rootComments = comments.filter((comment) => !comment.parentId);
        this.repliesByParent = comments.reduce<Record<number, CommentResponse[]>>((acc, comment) => {
          if (comment.parentId) {
            acc[comment.parentId] = [...(acc[comment.parentId] ?? []), comment];
          }
          return acc;
        }, {});
        this.activeEditId = null;
        this.activeReplyId = null;
        this.loadAuthorProfiles(comments);
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load comments.';
        this.isLoading = false;
      }
    });
  }

  loadAuthorProfiles(comments: CommentResponse[]): void {
    const uniqueAuthorIds = Array.from(new Set(comments.map((comment) => comment.authorId)));
    if (uniqueAuthorIds.length === 0) {
      this.authorProfiles = {};
      return;
    }

    forkJoin(
      uniqueAuthorIds.map((authorId) =>
        this.authService.getPublicProfile(authorId)
      )
    ).subscribe({
      next: (profiles) => {
        this.authorProfiles = profiles.reduce<Record<number, PublicUserProfile>>((acc, profile) => {
          acc[Number(profile.userId)] = profile;
          return acc;
        }, {});
      },
      error: () => {
        this.authorProfiles = {};
      }
    });
  }

  submitComment(): void {
    this.submitCommentRequest();
  }

  submitReply(parentCommentId: number): void {
    this.submitCommentRequest(parentCommentId);
  }

  submitCommentRequest(parentId?: number): void {
    const content = parentId ? this.replyDrafts[parentId]?.trim() : this.newCommentContent.trim();

    if (!this.currentUser?.userId || !content) {
      return;
    }

    this.isSubmitting = true;
    this.commentService.createComment({
      postId: this.postId,
      parentId,
      content
    }).subscribe({
      next: () => {
        if (parentId) {
          this.replyDrafts[parentId] = '';
          this.activeReplyId = null;
        } else {
          this.newCommentContent = '';
        }
        this.isSubmitting = false;
        this.loadComments();
      },
      error: () => {
        this.errorMessage = 'Failed to submit comment.';
        this.isSubmitting = false;
      }
    });
  }

  startReply(commentId: number): void {
    this.activeReplyId = this.activeReplyId === commentId ? null : commentId;
    if (this.activeReplyId && !this.replyDrafts[commentId]) {
      this.replyDrafts[commentId] = '';
    }
  }

  startEdit(comment: CommentResponse): void {
    this.activeEditId = comment.commentId;
    this.editingDrafts[comment.commentId] = comment.content;
  }

  cancelEdit(): void {
    this.activeEditId = null;
  }

  saveEdit(commentId: number): void {
    const content = this.editingDrafts[commentId]?.trim();
    if (!content) {
      return;
    }

    this.commentService.updateComment(commentId, { content }).subscribe({
      next: () => {
        this.activeEditId = null;
        this.loadComments();
      },
      error: () => {
        this.errorMessage = 'Failed to update comment.';
      }
    });
  }

  deleteComment(comment: CommentResponse): void {
    const request$ = this.currentUser?.role === 'ADMIN'
      ? this.commentService.deleteComment(comment.commentId)
      : this.commentService.deleteOwnComment(comment.commentId);

    request$.subscribe({
      next: () => {
        this.loadComments();
      },
      error: () => {
        this.errorMessage = 'Failed to delete comment.';
      }
    });
  }

  toggleLike(comment: CommentResponse): void {
    if (!this.currentUser) {
      return;
    }

    const isLiked = this.likedCommentIds.has(comment.commentId);
    const request$ = isLiked
      ? this.commentService.unlikeComment(comment.commentId)
      : this.commentService.likeComment(comment.commentId);

    request$.subscribe({
      next: (updated) => {
        comment.likesCount = updated.likesCount;
        if (isLiked) {
          this.likedCommentIds.delete(comment.commentId);
        } else {
          this.likedCommentIds.add(comment.commentId);
        }
      },
      error: () => {
        this.errorMessage = 'Failed to update like.';
      }
    });
  }

  getReplies(commentId: number): CommentResponse[] {
    return this.repliesByParent[commentId] ?? [];
  }

  getAuthorLabel(comment: CommentResponse): string {
    const profile = this.authorProfiles[comment.authorId];
    return profile?.username || profile?.fullName || `User #${comment.authorId}`;
  }

  getAuthorLink(comment: CommentResponse): string[] {
    return ['/author', String(comment.authorId)];
  }

  canManage(comment: CommentResponse): boolean {
    if (!this.currentUser) {
      return false;
    }

    return this.currentUser.role === 'ADMIN' || this.currentUser.userId === String(comment.authorId);
  }

  trackByCommentId(_: number, comment: CommentResponse): number {
    return comment.commentId;
  }
}
