import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Search } from './search';
import { PostService } from '../../services/post.service';
import { CategoryService } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { NewsletterService } from '../../services/newsletter.service';
import { ToastService } from '../../services/toast.service';
import { PaymentService } from '../../services/payment.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { FormsModule } from '@angular/forms';

describe('Search', () => {
  let component: Search;
  let fixture: ComponentFixture<Search>;
  let postServiceSpy: any;
  let categoryServiceSpy: any;
  let authServiceSpy: any;
  let newsletterServiceSpy: any;
  let toastServiceSpy: any;
  let paymentServiceSpy: any;
  let routerSpy: any;
  let queryParamsSubject: Subject<any>;

  beforeEach(async () => {
    queryParamsSubject = new Subject();
    postServiceSpy = {
      getTrendingPosts: vi.fn().mockReturnValue(of([])),
      explorePosts: vi.fn().mockReturnValue(of({ content: [] })),
      getPublishedPosts: vi.fn().mockReturnValue(of({ content: [] }))
    };
    categoryServiceSpy = {
      getCategories: vi.fn().mockReturnValue(of([]))
    };
    authServiceSpy = {
      currentUser$: of(null),
      getCurrentUserSnapshot: vi.fn().mockReturnValue(null),
      getPublicAuthors: vi.fn().mockReturnValue(of([])),
      redirectToLogin: vi.fn()
    };
    newsletterServiceSpy = {
      checkSubscriptionStatus: vi.fn().mockReturnValue(of(false))
    };
    toastServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn()
    };
    paymentServiceSpy = {
      createOrder: vi.fn(),
      verifyPayment: vi.fn()
    };
    routerSpy = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [Search, FormsModule],
      providers: [
        { provide: PostService, useValue: postServiceSpy },
        { provide: CategoryService, useValue: categoryServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NewsletterService, useValue: newsletterServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: PaymentService, useValue: paymentServiceSpy },
        { provide: Router, useValue: routerSpy },
        { 
          provide: ActivatedRoute, 
          useValue: { 
            queryParams: queryParamsSubject,
            snapshot: { queryParams: {} }
          } 
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Search);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load discovery content when no query is present', () => {
    queryParamsSubject.next({});
    expect(postServiceSpy.explorePosts).toHaveBeenCalled();
    expect(authServiceSpy.getPublicAuthors).toHaveBeenCalled();
  });

  it('should perform search when query is present in URL', () => {
    queryParamsSubject.next({ q: 'Angular' });
    expect(component.query).toBe('Angular');
    expect(postServiceSpy.explorePosts).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'Angular' }));
  });

  it('should handle debounced search input', async () => {
    vi.useFakeTimers();
    component.onSearchInput({ target: { value: 'test' } });
    
    vi.advanceTimersByTime(401);
    expect(routerSpy.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: { q: 'test' }
    }));
    vi.useRealTimers();
  });

  it('should navigate to post on click if not premium', () => {
    const post = { postId: 1, slug: 'test-post', isPremium: false } as any;
    component.handlePostClick(post, new MouseEvent('click'));
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/post', 'test-post']);
  });
});
