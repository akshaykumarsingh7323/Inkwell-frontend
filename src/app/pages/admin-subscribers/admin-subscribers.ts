import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewsletterService, Subscriber, NewsletterAnalytics } from '../../services/newsletter.service';
import { catchError, of, timeout, finalize } from 'rxjs';

@Component({
  selector: 'app-admin-subscribers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-subscribers.html',
  styleUrl: './admin-subscribers.css',
})
export class AdminSubscribers implements OnInit {
  private newsletterService = inject(NewsletterService);

  // Pagination & Filter State
  subscribers = signal<Subscriber[]>([]);
  totalElements = signal<number>(0);
  currentPage = signal<number>(0);
  pageSize = signal<number>(10);
  
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');
  
  searchQuery = signal<string>('');
  statusFilter = signal<string>('');
  preferenceFilter = signal<string>('');
  
  analytics = signal<NewsletterAnalytics | null>(null);
  selectedSubscriber = signal<Subscriber | null>(null);

  ngOnInit(): void {
    this.loadAnalytics();
    this.loadSubscribers();
  }

  loadAnalytics(): void {
    this.newsletterService.getAnalytics().subscribe({
      next: (data) => this.analytics.set(data),
      error: (err) => console.error('Error fetching analytics:', err)
    });
  }

  loadSubscribers(): void {
    this.isLoading.set(true);
    this.newsletterService.searchSubscribers({
      query: this.searchQuery(),
      status: this.statusFilter(),
      preference: this.preferenceFilter(),
      page: this.currentPage(),
      size: this.pageSize(),
      sortBy: 'subscribedAt',
      direction: 'desc'
    }).pipe(
      timeout(30000),
      catchError((error) => {
        console.error('Error fetching subscribers:', error);
        this.errorMessage.set('Failed to load subscribers. Please ensure the newsletter service is running.');
        return of({ content: [], totalElements: 0 });
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe((response: any) => {
      this.subscribers.set(response.content || []);
      this.totalElements.set(response.totalElements || 0);
    });
  }

  onSearch(): void {
    this.currentPage.set(0);
    this.loadSubscribers();
  }

  onFilterChange(): void {
    this.currentPage.set(0);
    this.loadSubscribers();
  }

  changePage(page: number): void {
    this.currentPage.set(page);
    this.loadSubscribers();
  }

  viewDetails(subscriber: Subscriber): void {
    this.newsletterService.getSubscriberById(subscriber.subscriberId).subscribe({
      next: (fullData) => this.selectedSubscriber.set(fullData),
      error: (err) => {
        console.error('Error fetching details:', err);
        // Fallback to list data if details fetch fails
        this.selectedSubscriber.set(subscriber);
      }
    });
  }

  closeDetails(): void {
    this.selectedSubscriber.set(null);
  }

  getPages(): number[] {
    const total = Math.ceil(this.totalElements() / this.pageSize());
    return Array.from({ length: total }, (_, i) => i);
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return '';
    switch (status.toUpperCase()) {
      case 'ACTIVE': return 'status-active';
      case 'PENDING': return 'status-pending';
      case 'UNSUBSCRIBED': return 'status-unsubscribed';
      default: return '';
    }
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
