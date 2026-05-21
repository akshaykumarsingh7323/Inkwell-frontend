import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PaymentVerifyRequest {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface PaymentRecord {
  paymentId: string;
  userId: string;
  postId: string;
  amount: number;
  totalAmount: number;
  adminCommission: number;
  authorEarning: number;
  authorId: string;
  status: string;
  orderId: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/payments`;

  createOrder(userId: string, postId: string, amount: number): Observable<string> {
    return this.http.post(`${this.apiUrl}/create-order`, { userId, postId, amount }, { responseType: 'text' });
  }

  verifyPayment(request: PaymentVerifyRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify`, request);
  }

  checkAccess(userId: string, postId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check`, { params: { userId, postId } });
  }

  getUserPayments(userId: string): Observable<PaymentRecord[]> {
    return this.http.get<PaymentRecord[]>(`${this.apiUrl}/user/${userId}`);
  }

  getMyPurchasedPosts(): Observable<PaymentRecord[]> {
    return this.http.get<PaymentRecord[]>(`${this.apiUrl}/me/purchases`);
  }

  getSubscriptionStatus(userId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/subscriptions/status/${userId}`);
  }

  // Admin Methods
  getTotalRevenue(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/revenue/total`);
  }

  getRecentTransactions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/revenue/transactions`);
  }

  getTopAuthors(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/revenue/top-authors`);
  }

  // Author Methods
  getAuthorEarnings(authorId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/earnings/author/${authorId}`);
  }

  getAuthorTransactions(authorId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/earnings/author/${authorId}/transactions`);
  }
}
