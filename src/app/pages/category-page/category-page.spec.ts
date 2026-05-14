import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryPage } from './category-page';
import { CategoryService } from '../../services/category.service';
import { PostService } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { NO_ERRORS_SCHEMA, Component } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-navbar',
  standalone: true,
  template: ''
})
class MockNavbar {}

@Component({
  selector: 'app-footer',
  standalone: true,
  template: ''
})
class MockFooter {}

describe('CategoryPage', () => {
  let component: CategoryPage;
  let fixture: ComponentFixture<CategoryPage>;
  let categoryServiceSpy: any;
  let postServiceSpy: any;
  let authServiceSpy: any;
  let paymentServiceSpy: any;
  let toastServiceSpy: any;
  let routerSpy: any;

  beforeEach(async () => {
    categoryServiceSpy = {
      getCategoryBySlug: vi.fn().mockReturnValue(of({ categoryId: 1, name: 'Tech' }))
    };
    postServiceSpy = {
      getPublishedPostsByCategory: vi.fn().mockReturnValue(of({ content: [] }))
    };
    authServiceSpy = {
      getCurrentUserSnapshot: vi.fn().mockReturnValue(null),
      redirectToLogin: vi.fn()
    };
    paymentServiceSpy = {
      createOrder: vi.fn(),
      verifyPayment: vi.fn()
    };
    toastServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn()
    };
    routerSpy = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CategoryPage],
      providers: [
        { provide: CategoryService, useValue: categoryServiceSpy },
        { provide: PostService, useValue: postServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: PaymentService, useValue: paymentServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: Router, useValue: routerSpy },
        { 
          provide: ActivatedRoute, 
          useValue: { 
            paramMap: of({ get: (key: string) => 'tech' })
          } 
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).overrideComponent(CategoryPage, {
      remove: { imports: [Navbar, Footer] },
      add: { imports: [MockNavbar, MockFooter] }
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load category and posts on init', () => {
    expect(categoryServiceSpy.getCategoryBySlug).toHaveBeenCalledWith('tech');
    expect(postServiceSpy.getPublishedPostsByCategory).toHaveBeenCalledWith(1, 0, 100);
  });

  it('should handle pagination', () => {
    component.posts = new Array(15).fill({ postId: 1 });
    component.pageSize = 10;
    component.totalPages = 2;
    component.currentPage = 1;
    
    component.updatePagination(); // manual update because we set posts directly
    
    component.nextPage();
    expect(component.currentPage).toBe(2);
    expect(component.paginatedPosts.length).toBe(5);
    
    component.prevPage();
    expect(component.currentPage).toBe(1);
    expect(component.paginatedPosts.length).toBe(10);
  });
});
