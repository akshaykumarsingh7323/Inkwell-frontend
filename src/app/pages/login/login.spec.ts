import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CommonModule } from '@angular/common';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authServiceSpy: any;
  let routerSpy: any;
  let activatedRouteSpy: any;
  let toastServiceSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      login: vi.fn(),
      getDefaultRouteForRole: vi.fn().mockReturnValue('/home'),
      currentUser$: of({ username: 'testuser', role: 'READER' }),
      logout: vi.fn(),
      getCurrentUserSnapshot: vi.fn().mockReturnValue({ username: 'testuser', role: 'READER' })
    };
    routerSpy = {
      navigate: vi.fn(),
      events: of(),
      navigateByUrl: vi.fn()
    };
    activatedRouteSpy = {
      snapshot: {
        queryParamMap: {
          get: vi.fn().mockReturnValue(null)
        }
      },
      queryParams: of({})
    };
    toastServiceSpy = {
      error: vi.fn(),
      success: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [Login, ReactiveFormsModule, CommonModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form when empty', () => {
    expect(component.loginForm.valid).toBeFalsy();
  });

  it('should validate email format', () => {
    const email = component.loginForm.controls.email;
    email.setValue('invalid-email');
    expect(email.errors?.['email']).toBeTruthy();
    
    email.setValue('test@example.com');
    expect(email.errors).toBeNull();
  });

  it('should show password when toggled', () => {
    expect(component.showPassword).toBeFalsy();
    component.togglePassword();
    expect(component.showPassword).toBeTruthy();
  });

  it('should call authService.login on submit and navigate on success', async () => {
    const mockResponse = { role: 'READER', accessToken: 'token' };
    authServiceSpy.login.mockReturnValue(of(mockResponse));
    
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123'
    });

    component.onSubmit();
    await fixture.whenStable();

    expect(authServiceSpy.login).toHaveBeenCalled();
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/home');
    expect(component.isLoading).toBeFalsy();
  });

  it('should handle login failure', async () => {
    const errorResponse = { status: 401, error: { message: 'Unauthorized' } };
    authServiceSpy.login.mockReturnValue(throwError(() => errorResponse));
    
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123'
    });

    component.onSubmit();
    await fixture.whenStable();

    expect(toastServiceSpy.error).toHaveBeenCalledWith('Wrong password. Please try again.');
    expect(component.isLoading).toBeFalsy();
  });

  it('should navigate to register page', () => {
    component.goToRegister();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/register']);
  });
});
