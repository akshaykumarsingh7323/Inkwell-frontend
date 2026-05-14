import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommentsSectionComponent } from './comments-section';
import { CommentService } from '../../services/comment.service';
import { AuthService } from '../../services/auth.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

describe('CommentsSectionComponent', () => {
  let component: CommentsSectionComponent;
  let fixture: ComponentFixture<CommentsSectionComponent>;
  let commentServiceSpy: any;
  let authServiceSpy: any;

  beforeEach(async () => {
    commentServiceSpy = {
      getCommentsByPost: vi.fn().mockReturnValue(of([])),
      createComment: vi.fn(),
      deleteComment: vi.fn(),
      likeComment: vi.fn(),
      unlikeComment: vi.fn()
    };
    authServiceSpy = {
      getPublicProfile: vi.fn().mockReturnValue(of({ fullName: 'Author Name' }))
    };

    await TestBed.configureTestingModule({
      imports: [CommentsSectionComponent, FormsModule, CommonModule],
      providers: [
        { provide: CommentService, useValue: commentServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { 
          provide: ActivatedRoute, 
          useValue: { 
            snapshot: { queryParamMap: { get: () => null } },
            params: of({}),
            queryParams: of({}) 
          } 
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommentsSectionComponent);
    component = fixture.componentInstance;
    component.postId = 1;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load comments and author profiles', () => {
    const mockComments = [
      { commentId: 1, authorId: 101, content: 'Comment 1', parentId: null }
    ];
    commentServiceSpy.getCommentsByPost.mockReturnValue(of(mockComments));
    
    component.loadComments();
    
    expect(component.comments.length).toBe(1);
    expect(authServiceSpy.getPublicProfile).toHaveBeenCalledWith(101);
  });

  it('should submit a new comment', () => {
    const newComment = { commentId: 2, authorId: 1, content: 'New', status: 'APPROVED' };
    commentServiceSpy.createComment.mockReturnValue(of(newComment));
    component.newCommentContent = 'New comment';
    
    component.submitComment();
    
    expect(commentServiceSpy.createComment).toHaveBeenCalledWith({
      postId: 1,
      parentId: undefined,
      content: 'New comment'
    });
    expect(component.newCommentContent).toBe('');
  });

  it('should handle comment deletion', () => {
    component.comments = [{ commentId: 10, content: 'Delete me' } as any];
    commentServiceSpy.deleteComment.mockReturnValue(of({}));
    
    component.confirmDelete(10);
    component.executeDelete();
    
    expect(commentServiceSpy.deleteComment).toHaveBeenCalledWith(10);
    expect(component.comments.length).toBe(0);
  });

  it('should toggle like on a comment', () => {
    const comment = { commentId: 5, likesCount: 0 } as any;
    commentServiceSpy.likeComment.mockReturnValue(of({ likesCount: 1 }));
    
    component.toggleLike(comment);
    
    expect(commentServiceSpy.likeComment).toHaveBeenCalledWith(5);
    expect(comment.likesCount).toBe(1);
    expect(component.likedCommentIds.has(5)).toBeTruthy();
  });
});
