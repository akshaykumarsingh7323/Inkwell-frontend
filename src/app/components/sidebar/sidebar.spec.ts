import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Sidebar } from './sidebar';
import { AuthService } from '../../services/auth.service';
import { CategoryService } from '../../services/category.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  let authServiceSpy: any;
  let categoryServiceSpy: any;
  let confirmationServiceSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      currentUser$: of({ username: 'testuser', role: 'READER' }),
      logout: vi.fn()
    };
    categoryServiceSpy = {
      getTrendingTags: vi.fn().mockReturnValue(of([{ tagId: 1, name: 'Angular' }]))
    };
    confirmationServiceSpy = {
      confirm: vi.fn().mockResolvedValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CategoryService, useValue: categoryServiceSpy },
        { provide: ConfirmationService, useValue: confirmationServiceSpy },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load trending tags on init', () => {
    expect(categoryServiceSpy.getTrendingTags).toHaveBeenCalled();
    expect(component.trendingTags.length).toBe(1);
    expect(component.trendingTags[0].name).toBe('Angular');
  });

  it('should call logout when confirmed', async () => {
    await component.logout();
    expect(confirmationServiceSpy.confirm).toHaveBeenCalled();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('should NOT call logout when NOT confirmed', async () => {
    confirmationServiceSpy.confirm.mockResolvedValue(false);
    await component.logout();
    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });
});
