import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Navbar } from './navbar';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;
  let authServiceSpy: any;
  let notificationServiceSpy: any;
  let confirmationServiceSpy: any;
  let routerSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      currentUser$: of({ username: 'testuser', role: 'READER' }),
      logout: vi.fn(),
      getCurrentUserSnapshot: vi.fn().mockReturnValue({ username: 'testuser', role: 'READER' })
    };
    notificationServiceSpy = {
      getUnreadCount: vi.fn().mockReturnValue(of(5))
    };
    confirmationServiceSpy = {
      confirm: vi.fn().mockResolvedValue(true)
    };
    routerSpy = {
      navigate: vi.fn(),
      events: of()
    };

    await TestBed.configureTestingModule({
      imports: [Navbar, FormsModule, CommonModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: ConfirmationService, useValue: confirmationServiceSpy },
        { provide: Router, useValue: routerSpy },
        { 
          provide: ActivatedRoute, 
          useValue: { 
            snapshot: { queryParamMap: { get: () => null } },
            queryParams: of({}) 
          } 
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load unread count', () => {
    expect(component).toBeTruthy();
    expect(notificationServiceSpy.getUnreadCount).toHaveBeenCalled();
    expect(component.unreadCount()).toBe(5);
  });

  it('should toggle mobile menu', () => {
    expect(component.menuOpen()).toBeFalsy();
    component.toggleMenu();
    expect(component.menuOpen()).toBeTruthy();
  });

  it('should navigate on search', () => {
    component.searchQuery = 'test query';
    component.onSearch();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/explore'], { queryParams: { q: 'test query' } });
  });

  it('should call logout when confirmed', async () => {
    await component.logout();
    expect(confirmationServiceSpy.confirm).toHaveBeenCalled();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('should close menus on closeMenus()', () => {
    component.menuOpen.set(true);
    component.profileOpen.set(true);
    component.closeMenus();
    expect(component.menuOpen()).toBeFalsy();
    expect(component.profileOpen()).toBeFalsy();
  });
});
