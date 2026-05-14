import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PostDetail } from './post-detail';
import { PostService } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { NewsletterService } from '../../services/newsletter.service';
import { CategoryService } from '../../services/category.service';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CommonModule, Location } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('PostDetail', () => {
  let component: PostDetail;
  let fixture: ComponentFixture<PostDetail>;
  let postServiceSpy: any;
  let authServiceSpy: any;
  let newsletterServiceSpy: any;
  let categoryServiceSpy: any;
  let paymentServiceSpy: any;
  let toastServiceSpy: any;
  let routerSpy: any;
  let activatedRouteSpy: any;
  let locationSpy: any;

  const mockPost = {
    postId: 1,
    title: 'Test Post',
    slug: 'test-post',
    content: 'Hello world content',
    authorId: 101,
    categoryId: 1,
    isPremium: false,
    likesCount: 5,
    isLikedByCurrentUser: false
  };

  beforeEach(async () => {
    postServiceSpy = {
      getPostBySlug: vi.fn().mockReturnValue(of(mockPost)),
      incrementViews: vi.fn().mockReturnValue(of({})),
      likePost: vi.fn().mockReturnValue(of({})),
      unlikePost: vi.fn().mockReturnValue(of({})),
      getRelatedPosts: vi.fn().mockReturnValue(of([]))
    };
    authServiceSpy = {
      currentUser$: of(null),
      isLoggedIn: vi.fn().mockReturnValue(false),
      redirectToLogin: vi.fn(),
      getPublicProfile: vi.fn().mockReturnValue(of({ userId: 101, username: 'johndoe', fullName: 'John Doe' })),
      getCurrentUserSnapshot: vi.fn().mockReturnValue(null)
    };
    newsletterServiceSpy = {
      subscribe: vi.fn().mockReturnValue(of({})),
      getSubscriptionStatus: vi.fn().mockReturnValue(of('NONE'))
    };
    categoryServiceSpy = {
      getCategories: vi.fn().mockReturnValue(of([{ categoryId: 1, name: 'Tech' }])),
      getTagsByPost: vi.fn().mockReturnValue(of([]))
    };
    paymentServiceSpy = {
      createOrder: vi.fn().mockReturnValue(of('order_123')),
      verifyPayment: vi.fn().mockReturnValue(of({ status: 'SUCCESS' }))
    };
    toastServiceSpy = {
      success: vi.fn(),
      error: vi.fn()
    };
    routerSpy = {
      navigate: vi.fn(),
      url: '/post/test-post'
    };
    activatedRouteSpy = {
      paramMap: of({ get: (key: string) => 'test-post' })
    };
    locationSpy = {
      back: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PostDetail, CommonModule],
      providers: [
        { provide: PostService, useValue: postServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NewsletterService, useValue: newsletterServiceSpy },
        { provide: CategoryService, useValue: categoryServiceSpy },
        { provide: PaymentService, useValue: paymentServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        { provide: Location, useValue: locationSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PostDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load post', () => {
    expect(component).toBeTruthy();
    expect(postServiceSpy.getPostBySlug).toHaveBeenCalledWith('test-post');
    expect(component.post?.title).toBe('Test Post');
    expect(component.isLoading).toBeFalsy();
  });

  it('should handle like toggle when not logged in', () => {
    component.toggleLike();
    expect(authServiceSpy.redirectToLogin).toHaveBeenCalled();
  });

  it('should handle like toggle when logged in', () => {
    authServiceSpy.isLoggedIn.mockReturnValue(true);
    component.toggleLike();
    expect(postServiceSpy.likePost).toHaveBeenCalled();
    expect(component.isLiked).toBeTruthy();
    expect(component.post?.likesCount).toBe(6);
  });

  it('should handle newsletter subscription', () => {
    component.newsletterEmail = 'test@example.com';
    component.subscribeNewsletter();
    expect(newsletterServiceSpy.subscribe).toHaveBeenCalled();
    expect(toastServiceSpy.success).toHaveBeenCalled();
  });

  it('should navigate back', () => {
    component.goBack();
    expect(locationSpy.back).toHaveBeenCalled();
  });
});
