import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RelatedPostsComponent } from './related-posts';
import { PostService } from '../../services/post.service';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

describe('RelatedPostsComponent', () => {
  let component: RelatedPostsComponent;
  let fixture: ComponentFixture<RelatedPostsComponent>;
  let postServiceSpy: any;
  let paymentServiceSpy: any;
  let authServiceSpy: any;
  let toastServiceSpy: any;
  let routerSpy: any;

  beforeEach(async () => {
    postServiceSpy = {
      getRelatedPosts: vi.fn().mockReturnValue(of([])),
      getPublishedPostsByCategory: vi.fn()
    };
    paymentServiceSpy = {
      createOrder: vi.fn(),
      verifyPayment: vi.fn()
    };
    authServiceSpy = {
      getCurrentUserSnapshot: vi.fn(),
      redirectToLogin: vi.fn()
    };
    toastServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn()
    };
    routerSpy = {
      navigate: vi.fn(),
      url: '/current-url'
    };

    await TestBed.configureTestingModule({
      imports: [RelatedPostsComponent],
      providers: [
        { provide: PostService, useValue: postServiceSpy },
        { provide: PaymentService, useValue: paymentServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RelatedPostsComponent);
    component = fixture.componentInstance;
    component.postId = 1;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load related posts on init', () => {
    const mockPosts = [{ postId: 2, title: 'Related' } as any];
    postServiceSpy.getRelatedPosts.mockReturnValue(of(mockPosts));
    
    component.ngOnInit();
    
    expect(postServiceSpy.getRelatedPosts).toHaveBeenCalledWith(1);
    expect(component.relatedPosts.length).toBe(1);
  });

  it('should fallback to category posts if related posts fail', () => {
    component.categoryId = 5;
    postServiceSpy.getRelatedPosts.mockReturnValue(throwError(() => new Error()));
    postServiceSpy.getPublishedPostsByCategory.mockReturnValue(of({ content: [{ postId: 3 }] }));
    
    component.loadRelatedPosts();
    
    expect(postServiceSpy.getPublishedPostsByCategory).toHaveBeenCalledWith(5, 0, 4);
    expect(component.relatedPosts.length).toBe(1);
  });

  it('should navigate to post if not premium', () => {
    const post = { postId: 2, slug: 'test-post', isPremium: false } as any;
    component.handlePostClick(post, new MouseEvent('click'));
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/post', 'test-post']);
  });

  it('should initiate purchase for premium post if logged in', () => {
    const post = { postId: 2, isPremium: true, accessUnlocked: false, price: 100 } as any;
    authServiceSpy.getCurrentUserSnapshot.mockReturnValue({ userId: 'u1' });
    paymentServiceSpy.createOrder.mockReturnValue(of('order_mock_123'));
    paymentServiceSpy.verifyPayment.mockReturnValue(of({ status: 'SUCCESS' }));
    
    component.buyPost(post);
    
    expect(paymentServiceSpy.createOrder).toHaveBeenCalled();
    expect(paymentServiceSpy.verifyPayment).toHaveBeenCalled();
    expect(toastServiceSpy.success).toHaveBeenCalled();
  });
});
