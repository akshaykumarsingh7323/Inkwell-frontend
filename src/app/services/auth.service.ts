import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, tap, BehaviorSubject, catchError, throwError, timeout, shareReplay } from 'rxjs';
import { AuthRequest, AuthResponse, PublicUserProfile, RegisterRequest, UpdateProfileRequest } from '../models/user.model';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiBaseUrl}/auth`;
  private readonly jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

  private currentUserSubject = new BehaviorSubject<AuthResponse | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isInitializingSubject = new BehaviorSubject<boolean>(true);
  public isInitializing$ = this.isInitializingSubject.asObservable();

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, request, { headers: this.jsonHeaders }).pipe(
      timeout(30000),
      tap((response) => {
        this.handleAuthentication(response);
      }),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  login(request: AuthRequest): Observable<AuthResponse> {
    const normalizedUsernameOrEmail = request.usernameOrEmail?.trim();
    const normalizedRequest: AuthRequest = {
      usernameOrEmail: normalizedUsernameOrEmail?.includes('@')
        ? normalizedUsernameOrEmail.toLowerCase()
        : normalizedUsernameOrEmail,
      password: request.password
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, normalizedRequest, {
      headers: this.jsonHeaders
    }).pipe(
      timeout(30000),
      tap((response) => {
        this.handleAuthentication(response);
      }),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  /**
   * Initializes authentication on app startup.
   * Checks if a token exists and validates it with the backend.
   */
  initAuth(): Observable<AuthResponse | null> {
    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) {
      if (token) this.clearStorage();
      this.isInitializingSubject.next(false);
      return new Observable(obs => {
        obs.next(null);
        obs.complete();
      });
    }

    return this.getCurrentUser().pipe(
      tap(() => this.isInitializingSubject.next(false)),
      catchError((error) => {
        if (error.status === 401 || error.status === 403) {
          this.clearStorage();
          this.currentUserSubject.next(null);
        }
        this.isInitializingSubject.next(false);
        return new Observable<null>(obs => {
          obs.next(null);
          obs.complete();
        });
      })
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const user = this.getUserFromStorage();
    if (!user?.refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${user.refreshToken}` });
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, {}, { headers }).pipe(
      tap((response) => {
        this.saveUserToStorage(response);
        this.currentUserSubject.next(response);
      })
    );
  }

  private currentUserRequest$: Observable<AuthResponse> | null = null;

  getCurrentUser(): Observable<AuthResponse> {
    if (this.currentUserRequest$) {
      return this.currentUserRequest$;
    }

    this.currentUserRequest$ = this.http.get<AuthResponse>(`${this.apiUrl}/users/me`).pipe(
      timeout(30000),
      tap((user) => {
        const current = this.currentUserSubject.value;
        const updated = this.mergeAuthState(current, user);
        this.saveUserToStorage(updated);
        this.currentUserSubject.next(updated);
      }),
      shareReplay(1),
      catchError((err) => {
        this.currentUserRequest$ = null; // Clear on error
        return throwError(() => err);
      })
    );

    return this.currentUserRequest$!;
  }

  updateProfile(request: UpdateProfileRequest): Observable<AuthResponse> {
    return this.http.put<AuthResponse>(`${this.apiUrl}/update-profile`, request).pipe(
      tap((user) => {
        const current = this.currentUserSubject.value;
        if (current) {
          const updated = this.mergeAuthState(current, user);
          this.saveUserToStorage(updated);
          this.currentUserSubject.next(updated);
        }
      })
    );
  }

  changePassword(oldPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/password`, { oldPassword, newPassword });
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        })
      }).subscribe({ error: () => undefined });
    }

    this.clearStorage();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  forgotPassword(email: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email }, { headers: this.jsonHeaders });
  }

  resetPassword(request: unknown): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/reset-password`, request, { headers: this.jsonHeaders });
  }

  sendOtp(phoneNumber: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-otp`, { phoneNumber }, { headers: this.jsonHeaders }).pipe(
      timeout(30000)
    );
  }

  verifyOtp(phoneNumber: string, code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp`, { phoneNumber, code }, { headers: this.jsonHeaders }).pipe(
      timeout(30000)
    );
  }

  searchUsers(keyword: string): Observable<AuthResponse[]> {
    return this.http.get<AuthResponse[]>(`${this.apiUrl}/search?keyword=${encodeURIComponent(keyword)}`).pipe(
      timeout(30000)
    );
  }

  getPublicProfile(userId: string | number): Observable<PublicUserProfile> {
    return this.http.get<PublicUserProfile>(`${this.apiUrl}/public/users/${userId}`).pipe(
      timeout(30000),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  getAllUsers(): Observable<AuthResponse[]> {
    return this.http.get<AuthResponse[]>(`${this.apiUrl}/admin/users`).pipe(
      timeout(30000)
    );
  }

  getPublicAuthors(): Observable<AuthResponse[]> {
    return this.http.get<AuthResponse[]>(`${this.apiUrl}/public/authors`).pipe(
      timeout(30000)
    );
  }

  updateUserRole(userId: string | number, role: string): Observable<AuthResponse> {
    return this.http.put<AuthResponse>(`${this.apiUrl}/admin/users/${userId}/role?role=${encodeURIComponent(role)}`, {});
  }

  updateUserStatus(userId: string | number, active: boolean): Observable<AuthResponse> {
    return this.http.put<AuthResponse>(`${this.apiUrl}/admin/users/${userId}/status?active=${active}`, {});
  }

  selectRole(request: { role: string; username?: string; phoneNumber?: string; acceptedTerms?: boolean }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/select-role`, request).pipe(
      tap((response) => {
        this.handleAuthentication(response);
      })
    );
  }

  deactivateAccount(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/deactivate`);
  }

  deleteUser(userId: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/users/${userId}`);
  }

  public setSession(response: AuthResponse): void {
    this.handleAuthentication(response);
  }

  private handleAuthentication(response: AuthResponse): void {
    const current = this.currentUserSubject.value;
    // Normalize role before saving to ensure '===' checks in templates work
    if (response.role) {
      response.role = this.normalizeRole(response.role);
    }
    const updated = this.mergeAuthState(current, response);
    this.saveUserToStorage(updated);
    this.currentUserSubject.next(updated);
  }

  private saveUserToStorage(user: AuthResponse): void {
    if (user.accessToken && this.isValidStoredToken(user.accessToken)) {
      localStorage.setItem('access_token', user.accessToken);
    }
    localStorage.setItem('user_data', JSON.stringify(user));
  }

  private getUserFromStorage(): AuthResponse | null {
    const user = localStorage.getItem('user_data');
    if (!user) return null;

    try {
      const parsed = JSON.parse(user) as AuthResponse;
      const token = localStorage.getItem('access_token');
      if (this.isValidStoredToken(token)) {
        parsed.accessToken = token;
      }
      return parsed;
    } catch {
      this.clearStorage();
      return null;
    }
  }

  public clearStorage(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
  }

  getToken(): string | null {
    const token = localStorage.getItem('access_token');
    return this.isValidStoredToken(token) ? token : null;
  }

  getCurrentUserId(): string | null {
    return this.currentUserSubject.value?.userId ?? null;
  }

  getCurrentUserSnapshot(): AuthResponse | null {
    return this.currentUserSubject.value;
  }

  normalizeRole(role?: string | null): string {
    return role?.toUpperCase().replace('ROLE_', '') ?? '';
  }

  hasRole(role: string, user: AuthResponse | null = this.getCurrentUserSnapshot()): boolean {
    return this.normalizeRole(user?.role) === this.normalizeRole(role);
  }

  hasAnyRole(roles: string[], user: AuthResponse | null = this.getCurrentUserSnapshot()): boolean {
    const normalizedUserRole = this.normalizeRole(user?.role);
    return roles.some((role) => this.normalizeRole(role) === normalizedUserRole);
  }

  isAdmin(user: AuthResponse | null = this.getCurrentUserSnapshot()): boolean {
    return this.hasRole('ADMIN', user);
  }

  isAuthor(user: AuthResponse | null = this.getCurrentUserSnapshot()): boolean {
    return this.hasRole('AUTHOR', user);
  }

  redirectToLogin(returnUrl?: string): void {
    this.router.navigate(['/login'], {
      queryParams: returnUrl ? { returnUrl } : undefined
    });
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  isTokenExpired(token: string): boolean {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return false;
      const expiry = payload.exp * 1000;
      return Date.now() >= expiry;
    } catch {
      return true;
    }
  }

  private mergeAuthState(current: AuthResponse | null, incoming: AuthResponse): AuthResponse {
    const fallbackAccessToken = this.isValidStoredToken(current?.accessToken) ? current!.accessToken : this.getToken();
    const nextAccessToken = this.isValidStoredToken(incoming.accessToken) ? incoming.accessToken : fallbackAccessToken ?? undefined;
    const nextRefreshToken = incoming.refreshToken || current?.refreshToken;

    return {
      ...(current ?? {}),
      ...incoming,
      accessToken: nextAccessToken ?? '',
      refreshToken: nextRefreshToken
    };
  }

  private isValidStoredToken(token: string | null | undefined): token is string {
    return !!token && token !== 'null' && token !== 'undefined';
  }

  getDefaultRouteForRole(role?: string | null): string {
    switch (this.normalizeRole(role)) {
      case 'ADMIN':
        return '/admin-dashboard';
      case 'AUTHOR':
        return '/author-dashboard';
      default:
        break;
    }
    return '/home';
  }
}
