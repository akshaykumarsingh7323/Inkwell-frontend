import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SubscribeRequest {
  email: string;
  fullName?: string;
  preferences?: string;
}

export interface NewsletterRequest {
  subject: string;
  content: string;
}

export interface CampaignRequest extends NewsletterRequest {
  status?: string;
  tags?: string[];
}

export interface Subscriber {
  subscriberId: number;
  email: string;
  fullName?: string;
  userId?: string | number;
  status?: string;
  preferences?: string;
  subscribedAt?: string;
  unsubscribedAt?: string;
  token?: string;
}

export interface PreferenceRequest {
  preferences: string;
}

export interface ResendConfirmationRequest {
  email: string;
}

export interface NewsletterAnalytics {
  totalSubscribers: number;
  activeSubscribers: number;
  pendingSubscribers: number;
  unsubscribedCount: number;
  preferenceDistribution: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class NewsletterService {
  private apiUrl = `${environment.apiBaseUrl}/newsletter`;

  constructor(private http: HttpClient) {}

  subscribe(request: SubscribeRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/subscribe`, request, { responseType: 'text' });
  }

  getCurrentUserSubscription(): Observable<Subscriber | null> {
    return this.http.get<Subscriber>(`${this.apiUrl}/me`).pipe(
      timeout(5000),
      catchError(() => of(null))
    );
  }

  getSubscriberCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count`).pipe(
      timeout(30000)
    );
  }

  sendNewsletter(request: NewsletterRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/sendNewsletter`, request, { responseType: 'text' });
  }

  notifyNewPost(title: string, url: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/post-notify`, null, {
      params: { title, url },
      responseType: 'text'
    });
  }

  sendCampaign(request: CampaignRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/campaign`, request, { responseType: 'text' });
  }

  getAllSubscribers(): Observable<Subscriber[]> {
    return this.http.get<Subscriber[]>(`${this.apiUrl}/subscribers`);
  }

  confirmSubscription(token: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/confirm`, { params: { token }, responseType: 'text' });
  }

  unsubscribe(token: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/unsubscribe`, { params: { token }, responseType: 'text' });
  }

  updatePreferences(request: PreferenceRequest): Observable<string> {
    return this.http.put(`${this.apiUrl}/preferences`, request, { responseType: 'text' });
  }

  resendConfirmation(request: ResendConfirmationRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/resend-confirmation`, request, { responseType: 'text' });
  }

  getSubscriptionStatus(): Observable<'ACTIVE' | 'PENDING' | 'NONE'> {
    return this.getCurrentUserSubscription().pipe(
      map(sub => (sub?.status as 'ACTIVE' | 'PENDING' | 'NONE') || 'NONE'),
      catchError(() => of('NONE' as const))
    );
  }

  checkSubscriptionStatus(): Observable<boolean> {
    return this.getSubscriptionStatus().pipe(
      map(status => status === 'ACTIVE')
    );
  }

  unsubscribeCurrentUser(): Observable<string> {
    return this.http.post(`${this.apiUrl}/unsubscribe-current`, null, {
      responseType: 'text'
    });
  }

  getAnalytics(): Observable<NewsletterAnalytics> {
    return this.http.get<NewsletterAnalytics>(`${this.apiUrl}/analytics`);
  }

  searchSubscribers(params: {
    query?: string,
    status?: string,
    preference?: string,
    page?: number,
    size?: number,
    sortBy?: string,
    direction?: string
  }): Observable<any> {
    let httpParams: any = {};
    Object.keys(params).forEach(key => {
      const val = (params as any)[key];
      if (val !== undefined && val !== null && val !== '') {
        httpParams[key] = val.toString();
      }
    });
    return this.http.get<any>(`${this.apiUrl}/admin/search`, { params: httpParams });
  }

  getSubscriberById(id: number): Observable<Subscriber> {
    return this.http.get<Subscriber>(`${this.apiUrl}/admin/subscribers/${id}`);
  }
}
