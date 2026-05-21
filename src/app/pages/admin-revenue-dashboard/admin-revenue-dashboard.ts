import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { PublicUserProfile } from '../../models/user.model';
import { catchError, forkJoin, of } from 'rxjs';

interface RevenueStats {
  totalRevenue: number;
  totalVolume: number;
  transactionCount: number;
}

interface PaymentRecord {
  paymentId?: string;
  userId?: string;
  postId?: string;
  amount?: number;
  status?: string;
  orderId?: string;
  paymentType?: string;
  authorId?: string;
  totalAmount?: number;
  adminCommission?: number;
  authorEarning?: number;
  createdAt?: string;
}

interface AuthorEarningRecord {
  authorId: string;
  totalEarnings: number;
}

@Component({
  selector: 'app-admin-revenue-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-revenue-dashboard.html',
  styleUrl: './admin-revenue-dashboard.css'
})
export class AdminRevenueDashboard implements OnInit {
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);

  revenueStats: RevenueStats | null = null;
  transactions: PaymentRecord[] = [];
  topAuthors: AuthorEarningRecord[] = [];
  userProfiles: Record<string, PublicUserProfile> = {};
  isLoading = true;
  successfulTransactions = 0;
  pendingTransactions = 0;
  failedTransactions = 0;
  totalAuthorPayout = 0;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    forkJoin({
      stats: this.paymentService.getTotalRevenue().pipe(catchError(() => of(null))),
      transactions: this.paymentService.getRecentTransactions().pipe(catchError(() => of([]))),
      authors: this.paymentService.getTopAuthors().pipe(catchError(() => of([])))
    }).subscribe(({ stats, transactions, authors }) => {
      this.revenueStats = stats as RevenueStats | null;
      this.transactions = (transactions as PaymentRecord[])
        .sort((a, b) => this.toTimestamp(b.createdAt) - this.toTimestamp(a.createdAt));
      this.topAuthors = (authors as AuthorEarningRecord[])
        .sort((a, b) => Number(b.totalEarnings) - Number(a.totalEarnings));

      this.successfulTransactions = this.transactions.filter(tx => tx.status === 'SUCCESS').length;
      this.pendingTransactions = this.transactions.filter(tx => tx.status === 'PENDING').length;
      this.failedTransactions = this.transactions.filter(tx => tx.status === 'FAILED').length;
      this.totalAuthorPayout = this.transactions
        .filter(tx => tx.status === 'SUCCESS')
        .reduce((sum, tx) => sum + Number(tx.authorEarning || 0), 0);

      this.loadUserProfiles();
    });
  }

  loadUserProfiles(): void {
    const ids = Array.from(new Set([
      ...this.transactions.map(tx => tx.userId).filter(Boolean),
      ...this.transactions.map(tx => tx.authorId).filter(Boolean),
      ...this.topAuthors.map(author => author.authorId).filter(Boolean)
    ])) as string[];

    if (ids.length === 0) {
      this.userProfiles = {};
      this.isLoading = false;
      return;
    }

    forkJoin(
      ids.map(id =>
        this.authService.getPublicProfile(id).pipe(
          catchError(() => of({
            userId: id,
            username: `user_${id}`
          } as PublicUserProfile))
        )
      )
    ).subscribe(profiles => {
      const nextProfiles: Record<string, PublicUserProfile> = {};
      profiles.forEach(profile => {
        nextProfiles[String(profile.userId)] = profile;
      });
      this.userProfiles = nextProfiles;
      this.isLoading = false;
    });
  }

  getDisplayName(userId?: string | null): string {
    if (!userId) return 'Unknown user';
    const profile = this.userProfiles[String(userId)];
    return profile?.username || profile?.fullName || `User ${userId}`;
  }

  getAuthorInitial(authorId?: string | null): string {
    return this.getDisplayName(authorId).charAt(0).toUpperCase();
  }

  getSuccessRate(): number {
    const total = this.transactions.length;
    return total > 0 ? Math.round((this.successfulTransactions / total) * 100) : 0;
  }

  formatDate(value?: string): string {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatTime(value?: string): string {
    if (!value) return '';
    return new Date(value).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  private toTimestamp(value?: string): number {
    return value ? new Date(value).getTime() : 0;
  }
}
