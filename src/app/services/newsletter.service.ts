import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SubscribeRequest {
  email: string;
  fullName?: string;
  userId?: string | number;
  followedAuthorId?: string | number;
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

  getSubscriberCount(authorId?: string | number): Observable<number> {
    let params: any = {};
    if (authorId) {
      params.authorId = authorId.toString();
    }
    return this.http.get<number>(`${this.apiUrl}/count`, { params }).pipe(
      timeout(30000)
    );
  }

  sendNewsletter(request: NewsletterRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/send`, request, { responseType: 'text' });
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

  getAllSubscribers(authorId?: string | number): Observable<Subscriber[]> {
    let params: any = {};
    if (authorId) {
      params.authorId = authorId.toString();
    }
    return this.http.get<Subscriber[]>(`${this.apiUrl}/subscribers`, { params });
  }

  confirmSubscription(token: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/confirm`, { params: { token }, responseType: 'text' });
  }

  unsubscribe(token: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/unsubscribe`, { params: { token }, responseType: 'text' });
  }

  updatePreferences(subscriberId: number, request: PreferenceRequest): Observable<string> {
    return this.http.put(`${this.apiUrl}/preferences/${subscriberId}`, request, { responseType: 'text' });
  }

  resendConfirmation(request: ResendConfirmationRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/resend-confirmation`, request, { responseType: 'text' });
  }

  getSubscriptionStatus(email: string, authorId: string | number): Observable<'ACTIVE' | 'PENDING' | 'NONE'> {
    return this.http.get<Subscriber>(`${this.apiUrl}/subscribers/${email}`, { 
      params: { authorId: authorId.toString() } 
    }).pipe(
      timeout(5000),
      map(sub => sub.status as 'ACTIVE' | 'PENDING' | 'NONE'),
      catchError(() => of('NONE' as const))
    );
  }

  checkSubscriptionStatus(email: string, authorId: string | number): Observable<boolean> {
    return this.getSubscriptionStatus(email, authorId).pipe(
      map(status => status === 'ACTIVE')
    );
  }

  unsubscribeByEmail(email: string, authorId: string | number): Observable<string> {
    return this.http.delete(`${this.apiUrl}/unsubscribe/${email}`, { 
      params: { authorId: authorId.toString() },
      responseType: 'text' 
    });
  }

  getAnalytics(authorId?: string | number): Observable<NewsletterAnalytics> {
    let params: any = {};
    if (authorId) {
      params.authorId = authorId.toString();
    }
    return this.http.get<NewsletterAnalytics>(`${this.apiUrl}/analytics`, { params });
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
