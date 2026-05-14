import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDashboard } from './admin-dashboard';
import { AuthService } from '../../services/auth.service';
import { PostService } from '../../services/post.service';
import { CommentService } from '../../services/comment.service';
import { NewsletterService } from '../../services/newsletter.service';
import { NotificationService } from '../../services/notification.service';
import { AuditService } from '../../services/audit.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;
  let authServiceSpy: any;
  let postServiceSpy: any;
  let commentServiceSpy: any;
  let newsletterServiceSpy: any;
  let notificationServiceSpy: any;
  let auditServiceSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      currentUser$: of({ role: 'ADMIN', userId: '1' }),
      getCurrentUserSnapshot: vi.fn().mockReturnValue({ userId: '1' }),
      getAllUsers: vi.fn().mockReturnValue(of([])),
      logout: vi.fn()
    };
    postServiceSpy = {
      getPublishedPosts: vi.fn().mockReturnValue(of({ totalElements: 0, content: [] }))
    };
    commentServiceSpy = {
      getPendingComments: vi.fn().mockReturnValue(of([]))
    };
    newsletterServiceSpy = {
      getSubscriberCount: vi.fn().mockReturnValue(of(0))
    };
    notificationServiceSpy = {
      getAll: vi.fn().mockReturnValue(of([]))
    };
    auditServiceSpy = {
      getAuditLogs: vi.fn().mockReturnValue(of({ content: [] }))
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: PostService, useValue: postServiceSpy },
        { provide: CommentService, useValue: commentServiceSpy },
        { provide: NewsletterService, useValue: newsletterServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: AuditService, useValue: auditServiceSpy },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load stats on init', () => {
    authServiceSpy.getAllUsers.mockReturnValue(of([{}, {}]));
    postServiceSpy.getPublishedPosts.mockReturnValue(of({ totalElements: 10, content: [] }));
    
    component.loadStats();
    
    expect(component.totalUsers).toBe(2);
    expect(component.totalPublishedPosts).toBe(10);
    expect(component.isLoading).toBeFalsy();
  });

  it('should handle partial failures in loadStats', () => {
    authServiceSpy.getAllUsers.mockReturnValue(throwError(() => new Error('Fail')));
    newsletterServiceSpy.getSubscriberCount.mockReturnValue(of(5));
    
    component.loadStats();
    
    expect(component.totalUsers).toBe(0); // Falls back to [] which has length 0
    expect(component.totalSubscribers).toBe(5);
  });

  it('should toggle theme', () => {
    expect(component.isDarkMode).toBeFalsy();
    component.toggleTheme();
    expect(component.isDarkMode).toBeTruthy();
    expect(document.body.classList.contains('dark-theme')).toBeTruthy();
  });
});
