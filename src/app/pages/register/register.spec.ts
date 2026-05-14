import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Register } from './register';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CommonModule } from '@angular/common';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let authServiceSpy: any;
  let routerSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      register: vi.fn(),
      selectRole: vi.fn(),
      getDefaultRouteForRole: vi.fn().mockReturnValue('/home')
    };
    routerSpy = {
      navigate: vi.fn(),
      navigateByUrl: vi.fn(),
      events: of()
    };

    await TestBed.configureTestingModule({
      imports: [Register, ReactiveFormsModule, CommonModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
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

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form when empty', () => {
    expect(component.registerForm.valid).toBeFalsy();
  });

  it('should validate full name starting with capital letter', () => {
    const fullName = component.registerForm.controls.fullName;
    fullName.setValue('john Doe');
    expect(fullName.errors?.['pattern']).toBeTruthy();
    
    fullName.setValue('John Doe');
    expect(fullName.errors).toBeNull();
  });

  it('should validate strong password', () => {
    const password = component.registerForm.controls.password;
    password.setValue('weak');
    expect(password.errors?.['pattern']).toBeTruthy();
    
    password.setValue('Strong123!');
    expect(password.errors).toBeNull();
  });

  it('should call authService.register and navigate for READER', async () => {
    const mockResponse = { username: 'testuser', role: 'READER' };
    authServiceSpy.register.mockReturnValue(of(mockResponse));
    
    component.registerForm.setValue({
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'Strong123!',
      role: 'READER',
      acceptedTerms: true
    });

    component.onSubmit();
    await new Promise(resolve => setTimeout(resolve, 800));

    expect(authServiceSpy.register).toHaveBeenCalled();
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('should call selectRole for AUTHOR registration', async () => {
    const mockResponse = { username: 'testauthor', role: 'AUTHOR' };
    authServiceSpy.register.mockReturnValue(of(mockResponse));
    authServiceSpy.selectRole.mockReturnValue(of({}));
    
    component.registerForm.setValue({
      fullName: 'Test Author',
      email: 'author@example.com',
      password: 'Strong123!',
      role: 'AUTHOR',
      acceptedTerms: true
    });

    component.onSubmit();
    await new Promise(resolve => setTimeout(resolve, 800));

    expect(authServiceSpy.register).toHaveBeenCalled();
    expect(authServiceSpy.selectRole).toHaveBeenCalled();
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/author-dashboard');
  });

  it('should handle registration failure (conflict)', async () => {
    const errorResponse = { status: 409, error: { message: 'Email already exists' } };
    authServiceSpy.register.mockReturnValue(throwError(() => errorResponse));
    
    component.registerForm.setValue({
      fullName: 'Test User',
      email: 'existing@example.com',
      password: 'Strong123!',
      role: 'READER',
      acceptedTerms: true
    });

    component.onSubmit();
    await fixture.whenStable();

    expect(component.emailAlreadyExists).toBeTruthy();
    expect(component.isLoading).toBeFalsy();
  });
});
