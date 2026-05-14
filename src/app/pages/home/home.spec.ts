import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Home } from './home';
import { PostService } from '../../services/post.service';
import { CategoryService } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { PaymentService } from '../../services/payment.service';
import { NewsletterService } from '../../services/newsletter.service';
import { ToastService } from '../../services/toast.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let postServiceSpy: any;
  let categoryServiceSpy: any;
  let authServiceSpy: any;
  let paymentServiceSpy: any;
  let newsletterServiceSpy: any;
  let toastServiceSpy: any;
  let routerSpy: any;
  let activatedRouteSpy: any;

  const mockPosts = [
    { postId: 1, title: 'Post 1', slug: 'post-1', content: 'Content 1', authorId: 'auth1', categoryId: 1, isPremium: false },
    { postId: 2, title: 'Post 2', slug: 'post-2', content: 'Content 2', authorId: 'auth1', categoryId: 2, isPremium: true, price: 100 }
  ];

  const mockCategories = [
    { categoryId: 1, name: 'Tech' },
    { categoryId: 2, name: 'Life' }
  ];

  beforeEach(async () => {
    postServiceSpy = {
      getPublishedPosts: vi.fn().mockReturnValue(of({ content: mockPosts }))
    };
    categoryServiceSpy = {
      getCategories: vi.fn().mockReturnValue(of(mockCategories)),
      getTrendingTags: vi.fn().mockReturnValue(of(['angular', 'vitest']))
    };
    authServiceSpy = {
      currentUser$: of(null),
      getCurrentUserSnapshot: vi.fn().mockReturnValue(null),
      getCurrentUser: vi.fn().mockReturnValue(of(null)),
      getPublicProfile: vi.fn().mockReturnValue(of({ fullName: 'Author Name' })),
      getDefaultRouteForRole: vi.fn().mockReturnValue('/home')
    };
    paymentServiceSpy = {
      checkAccess: vi.fn().mockReturnValue(of(false)),
      createOrder: vi.fn().mockReturnValue(of('order_123')),
      verifyPayment: vi.fn().mockReturnValue(of({ status: 'SUCCESS' }))
    };
    newsletterServiceSpy = {
      subscribe: vi.fn().mockReturnValue(of({}))
    };
    toastServiceSpy = {
      success: vi.fn(),
      error: vi.fn()
    };
    routerSpy = {
      navigate: vi.fn()
    };
    activatedRouteSpy = {
      queryParams: of({})
    };

    await TestBed.configureTestingModule({
      imports: [Home, FormsModule, CommonModule],
      providers: [
        { provide: PostService, useValue: postServiceSpy },
        { provide: CategoryService, useValue: categoryServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: PaymentService, useValue: paymentServiceSpy },
        { provide: NewsletterService, useValue: newsletterServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load data', () => {
    expect(component).toBeTruthy();
    expect(categoryServiceSpy.getCategories).toHaveBeenCalled();
    expect(postServiceSpy.getPublishedPosts).toHaveBeenCalled();
    expect(component.posts().length).toBe(2);
  });

  it('should filter posts by category', () => {
    component.filterCat('Tech');
    expect(component.activeCat()).toBe('Tech');
    expect(component.filteredPosts().length).toBe(1);
    expect(component.filteredPosts()[0].title).toBe('Post 1');
  });

  it('should handle search', () => {
    const event = { target: { value: 'Post 2' } } as any;
    component.doSearch(event);
    expect(component.searchQ()).toBe('Post 2');
    expect(component.filteredPosts().length).toBe(1);
    expect(component.filteredPosts()[0].title).toBe('Post 2');
  });

  it('should navigate to free post', () => {
    const post = mockPosts[0];
    component.navigateToPost(post as any);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/post', 'post-1']);
  });

  it('should handle newsletter subscription', () => {
    component.newsletterEmail.set('test@example.com');
    component.subscribeNewsletter();
    expect(newsletterServiceSpy.subscribe).toHaveBeenCalled();
    expect(toastServiceSpy.success).toHaveBeenCalled();
  });

  it('should handle newsletter subscription error', () => {
    component.newsletterEmail.set('test@example.com');
    newsletterServiceSpy.subscribe.mockReturnValue(throwError(() => new Error('Error')));
    component.subscribeNewsletter();
    expect(toastServiceSpy.error).toHaveBeenCalled();
  });
});
