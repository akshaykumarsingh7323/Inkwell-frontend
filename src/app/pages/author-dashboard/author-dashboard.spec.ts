import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthorDashboardComponent } from './author-dashboard';
import { AuthService } from '../../services/auth.service';
import { PostService } from '../../services/post.service';
import { CommentService } from '../../services/comment.service';
import { PaymentService } from '../../services/payment.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';

describe('AuthorDashboardComponent', () => {
  let component: AuthorDashboardComponent;
  let fixture: ComponentFixture<AuthorDashboardComponent>;
  let authServiceSpy: any;
  let postServiceSpy: any;
  let commentServiceSpy: any;
  let paymentServiceSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      currentUser$: of({ userId: '1', role: 'AUTHOR' }),
      getCurrentUserSnapshot: vi.fn().mockReturnValue({ userId: '1' })
    };
    postServiceSpy = {
      getPostsByAuthor: vi.fn().mockReturnValue(of({ content: [] }))
    };
    commentServiceSpy = {
      getPendingCommentsForModerator: vi.fn().mockReturnValue(of([]))
    };
    paymentServiceSpy = {
      getAuthorEarnings: vi.fn().mockReturnValue(of({ totalEarnings: 0 })),
      getAuthorTransactions: vi.fn().mockReturnValue(of([]))
    };

    await TestBed.configureTestingModule({
      imports: [AuthorDashboardComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: PostService, useValue: postServiceSpy },
        { provide: CommentService, useValue: commentServiceSpy },
        { provide: PaymentService, useValue: paymentServiceSpy },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate stats from posts correctly', () => {
    const mockPosts = {
      content: [
        { status: 'PUBLISHED', viewCount: 10, likesCount: 5, isPremium: false },
        { status: 'DRAFT', viewCount: 0, likesCount: 0, isPremium: false },
        { status: 'PUBLISHED', viewCount: 20, likesCount: 10, isPremium: true }
      ]
    };
    postServiceSpy.getPostsByAuthor.mockReturnValue(of(mockPosts));
    paymentServiceSpy.getAuthorEarnings.mockReturnValue(of({ totalEarnings: 500 }));
    
    component.loadStats('1');
    
    expect(component.totalPublished).toBe(2);
    expect(component.totalDrafts).toBe(1);
    expect(component.totalViews).toBe(30);
    expect(component.totalLikes).toBe(15);
    expect(component.totalEarnings).toBe(500);
    expect(component.premiumPosts.length).toBe(1);
  });

  it('should handle dashboard errors', () => {
    // forkJoin handles errors via catchError in implementation, so next() still called with empty results
    postServiceSpy.getPostsByAuthor.mockReturnValue(throwError(() => new Error('API Error')));
    
    component.loadStats('1');
    
    expect(component.totalPublished).toBe(0);
    expect(component.isLoading).toBeFalsy();
  });
});
