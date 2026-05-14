import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, take, map, Subject, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface NotificationResponse {
  notificationId: number;
  recipientId: number;
  actorId: number;
  type: string;
  title: string;
  message: string;
  relatedId?: number;
  relatedType?: string;
  relatedSlug?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationRequest {
  recipientId?: number;
  actorId?: number;
  type: string;
  title: string;
  message: string;
  relatedId?: number;
  relatedType?: string;
  recipientEmail?: string;
  sendEmail?: boolean;
}

export interface BroadcastRequest {
  targetRole: 'READER' | 'AUTHOR' | 'ADMIN' | 'ALL';
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiBaseUrl}/notifications`;
  private refreshCountSubject = new Subject<void>();
  refreshCount$ = this.refreshCountSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {}

  triggerRefreshCount(): void {
    this.refreshCountSubject.next();
  }

  private getUserId(): Observable<number> {
    return this.authService.currentUser$.pipe(
      take(1),
      map((user) => {
        if (!user?.userId) {
          throw new Error('User not authenticated');
        }
        return Number(user.userId);
      })
    );
  }

  getMyNotifications(): Observable<NotificationResponse[]> {
    return this.getUserId().pipe(
      switchMap((userId) => this.http.get<NotificationResponse[]>(`${this.apiUrl}/user/${userId}`))
    );
  }

  getUnreadCount(): Observable<number> {
    return this.getUserId().pipe(
      switchMap((userId) => this.http.get<number>(`${this.apiUrl}/unread-count/${userId}`))
    );
  }

  getAll(): Observable<NotificationResponse[]> {
    return this.http.get<NotificationResponse[]>(this.apiUrl);
  }

  getByUser(recipientId: number): Observable<NotificationResponse[]> {
    return this.http.get<NotificationResponse[]>(`${this.apiUrl}/user/${recipientId}`);
  }

  send(request: NotificationRequest): Observable<NotificationResponse> {
    return this.http.post<NotificationResponse>(`${this.apiUrl}/send`, request);
  }

  sendBulk(recipientIds: number[], request: NotificationRequest): Observable<string> {
    const query = recipientIds.map((id) => `recipientIds=${id}`).join('&');
    return this.http.post(`${this.apiUrl}/send-bulk?${query}`, request, { responseType: 'text' });
  }

  broadcastByRole(request: BroadcastRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/broadcast`, request, { responseType: 'text' });
  }

  markAsRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => this.triggerRefreshCount())
    );
  }

  markAllRead(): Observable<void> {
    return this.getUserId().pipe(
      switchMap((userId) => this.http.put<void>(`${this.apiUrl}/read-all/${userId}`, {})),
      tap(() => this.triggerRefreshCount())
    );
  }

  deleteRead(): Observable<void> {
    return this.getUserId().pipe(
      switchMap((userId) => this.http.delete<void>(`${this.apiUrl}/read/${userId}`)),
      tap(() => this.triggerRefreshCount())
    );
  }

  deleteReadForUser(recipientId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/read/${recipientId}`);
  }

  deleteNotification(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.triggerRefreshCount())
    );
  }
}
