import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { PostService, PostResponse } from '../../services/post.service';
import { CategoryService, CategoryResponse } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { AuthResponse } from '../../models/user.model';
import { PaymentService } from '../../services/payment.service';
import { NewsletterService } from '../../services/newsletter.service';
import { ToastService } from '../../services/toast.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

declare var Razorpay: any;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private postService = inject(PostService);
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private paymentService = inject(PaymentService);
  private newsletterService = inject(NewsletterService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  currentUser$ = this.authService.currentUser$;
  
  // State Signals
  posts = signal<PostResponse[]>([]);
  categories = signal<CategoryResponse[]>([]);
  trendingTags = signal<any[]>([]);
  isLoading = signal(true);
  
  // Filter & Pagination Signals
  activeCat = signal<string>('all');
  activeTag = signal<string>('all');
  searchQ = signal<string>('');
  sortMode = signal<string>('new');
  currentPage = signal<number>(1);
  pageSize = signal<number>(6);

  // Newsletter State
  newsletterEmail = signal<string>('');
  newsletterMsg = signal<string>('');
  newsletterErr = signal<string>('');

  
  // Purchase Modal State
  showPurchaseModal = signal(false);
  isProcessing = signal(false);
  selectedPostForPurchase = signal<PostResponse | null>(null);

  // Computed Filtered Posts
  filteredPosts = computed(() => {
    let p = [...this.posts()];
    const cat = this.activeCat();
    const tag = this.activeTag();
    const q = this.searchQ().trim().toLowerCase();
    const sort = this.sortMode();

    // Category Filter
    if (cat !== 'all') {
      p = p.filter(x => this.getCategoryName(x.categoryId) === cat);
    }
    
    // Tag Filter
    if (tag !== 'all') {
       p = p.filter(x => this.getCategoryName(x.categoryId).toLowerCase().includes(tag.toLowerCase()));
    }

    // Search Filter
    if (q) {
      p = p.filter(x => 
        x.title.toLowerCase().includes(q) || 
        x.content.toLowerCase().includes(q) ||
        (x.excerpt && x.excerpt.toLowerCase().includes(q)) ||
        this.getCategoryName(x.categoryId).toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sort === 'new') {
      p.sort((a, b) => new Date(b.publishedAt || b.createdAt || '').getTime() - new Date(a.publishedAt || a.createdAt || '').getTime());
    } else if (sort === 'old') {
      p.sort((a, b) => new Date(a.publishedAt || a.createdAt || '').getTime() - new Date(b.publishedAt || b.createdAt || '').getTime());
    } else if (sort === 'alpha') {
      p.sort((a, b) => a.title.localeCompare(b.title));
    }

    return p;
  });

  featuredPosts = computed(() => {
    return [...this.filteredPosts()].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 3);
  });

  latestPosts = computed(() => {
    return [...this.filteredPosts()].sort((a, b) => new Date(b.publishedAt || b.createdAt || '').getTime() - new Date(a.publishedAt || a.createdAt || '').getTime()).slice(0, 5);
  });

  paginatedPosts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredPosts().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.filteredPosts().length / this.pageSize()) || 1);

  ngOnInit(): void {
    this.loadData();
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.activeCat.set(params['category']);
        this.activeTag.set('all');
      } else {
        this.activeCat.set('all');
      }
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    
    // Fetch categories first
    this.categoryService.getCategories().pipe(
      timeout(15000),
      catchError(() => of([] as CategoryResponse[]))
    ).subscribe(cats => {
      this.categories.set(cats);
      // Fetch trending tags
      this.categoryService.getTrendingTags().pipe(
        timeout(5000), catchError(() => of([]))
      ).subscribe(tags => {
        this.trendingTags.set(tags);
        this.loadPosts();
      });
    });
  }

  loadPosts(): void {
    this.postService.getPublishedPosts(0, 50).pipe(
      timeout(15000),
      catchError((err) => {
        console.error('Error loading posts', err);
        return of({ content: [] as PostResponse[] });
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe(response => {
      const posts = response.content || [];
      this.posts.set(posts);
      this.fetchAuthorNames(posts);
    });
  }

  fetchAuthorNames(posts: PostResponse[]): void {
    const uniqueAuthorIds = [...new Set(posts.map(p => p.authorId))];
    uniqueAuthorIds.forEach(id => {
      this.authService.getPublicProfile(id).pipe(
        timeout(10000),
        catchError(() => of(null))
      ).subscribe(profile => {
        if (profile) {
          this.posts.update(currentPosts => 
            currentPosts.map(p => p.authorId === id ? { ...p, authorName: profile.fullName || profile.username } : p)
          );
        }
      });
    });
  }

  // Event Handlers
  filterCat(cat: string): void {
    this.activeCat.set(cat);
    this.activeTag.set('all');
    this.currentPage.set(1);
  }

  filterTag(tag: string): void {
    this.activeTag.set(tag);
    this.activeCat.set('all');
    this.currentPage.set(1);
  }

  doSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQ.set(input.value);
    this.currentPage.set(1);
  }

  doSort(v: string): void {
    this.sortMode.set(v);
    this.currentPage.set(1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  subscribeNewsletter(): void {
    const email = this.newsletterEmail().trim();
    if (!email || !email.includes('@')) {
      this.newsletterErr.set('Please enter a valid email.');
      return;
    }
    this.newsletterErr.set('');
    this.newsletterMsg.set('');
    const user = this.authService.getCurrentUserSnapshot();
    const request = {
      email,
      fullName: user?.fullName,
      userId: user?.userId ? Number(user.userId) : undefined
    };

    this.newsletterService.subscribe(request).subscribe({
      next: (res) => {
        this.toastService.success('Subscription pending! Check your email to confirm.');
        this.newsletterEmail.set('');
      },
      error: (err) => {
        this.toastService.error('Failed to subscribe. You may already be subscribed.');
      }
    });
  }

  // Template Helpers
  getCategoryName(categoryId?: number): string {
    if (!categoryId) return 'General';
    return this.categories().find(c => c.categoryId === categoryId)?.name || 'General';
  }

  getUserInitials(name?: string): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getFirstName(fullName?: string | null): string {
    return fullName?.trim().split(/\s+/)[0] || 'Friend';
  }

  getAuthorColor(authorName: string): string {
    const colors = ['#1a7ae8', '#7c3aed', '#d97706', '#0f6e56', '#be185d', '#0369a1'];
    let hash = 0;
    for (let i = 0; i < authorName.length; i++) {
      hash = authorName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getGreetingName(user: any): string {
    if (!user) return 'Guest';
    return this.getFirstName(user.fullName);
  }

  isAdmin(user: AuthResponse | null): boolean {
    return user?.role === 'ADMIN';
  }

  navigateToPost(post: PostResponse, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (post.isPremium) {
      this.handlePremiumNavigation(post);
    } else {
      this.router.navigate(['/post', post.slug]);
    }
  }

  private async handlePremiumNavigation(post: PostResponse): Promise<void> {
    const user = await firstValueFrom(this.currentUser$);
    if (!user) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/post/' + post.slug } });
      return;
    }

    // Admins and Authors can always view their own posts
    if (user.role === 'ADMIN' || user.userId === String(post.authorId)) {
      this.router.navigate(['/post', post.slug]);
      return;
    }

    this.isLoading.set(true);
    this.paymentService.checkAccess(user.userId, String(post.postId)).subscribe({
      next: (hasAccess) => {
        this.isLoading.set(false);
        if (hasAccess) {
          this.router.navigate(['/post', post.slug]);
        } else {
          // Go direct to purchase instead of showing modal
          this.triggerPurchase(post, user);
        }
      },
      error: () => {
        this.isLoading.set(false);
        // Go direct to purchase instead of showing modal
        this.triggerPurchase(post, user);
      }
    });
  }

  confirmPurchase(): void {
    const post = this.selectedPostForPurchase();
    if (!post) return;

    this.isProcessing.set(true);
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (user) {
          this.triggerPurchase(post, user);
        } else {
          this.isProcessing.set(false);
          this.showPurchaseModal.set(false);
          this.router.navigate(['/login']);
        }
      },
      error: () => {
        this.isProcessing.set(false);
        this.showPurchaseModal.set(false);
      }
    });
  }

  cancelPurchase(): void {
    if (this.isProcessing()) return;
    this.showPurchaseModal.set(false);
    this.selectedPostForPurchase.set(null);
  }

  private triggerPurchase(post: PostResponse, user: AuthResponse): void {
    this.paymentService.createOrder(user.userId, String(post.postId), post.price || 0).subscribe({
      next: (orderId) => {
        this.isProcessing.set(false);
        this.showPurchaseModal.set(false);
        this.openRazorpay(orderId, post, user);
      },
      error: (err) => {
        this.isProcessing.set(false);
        console.error('Payment Error:', err);
        this.toastService.error('Failed to initiate payment. Please check if payment-service is running.');
      }
    });
  }

  private openRazorpay(orderId: string, post: PostResponse, user: AuthResponse): void {
    if (orderId.startsWith('order_mock_')) {
      this.verifyAndNavigate({
        razorpay_order_id: orderId,
        razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(7),
        razorpay_signature: 'mock_signature'
      }, post);
      return;
    }

    if (typeof (window as any).Razorpay === 'undefined') {
      this.toastService.error('Razorpay SDK failed to load. Please disable adblockers.');
      return;
    }

    const options = {
      key: environment.razorpayKeyId, 
      amount: (post.price || 0) * 100,
      currency: 'INR',
      name: 'InkWell Premium',
      description: `Unlock: ${post.title}`,
      order_id: orderId,
      handler: (response: any) => {
        this.verifyAndNavigate(response, post);
      },
      prefill: {
        name: user.fullName,
        email: user.email
      },
      theme: { color: '#004643' }
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }

  private verifyAndNavigate(response: any, post: PostResponse): void {
    this.isLoading.set(true);
    this.paymentService.verifyPayment({
      orderId: response.razorpay_order_id,
      paymentId: response.razorpay_payment_id,
      signature: response.razorpay_signature
    }).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res && res.status === 'SUCCESS') {
          this.toastService.success('Payment successful! Opening post...');
          this.router.navigate(['/post', post.slug]);
        } else {
          this.toastService.error('Payment verification failed.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.error('Payment verification failed. Please contact support.');
      }
    });
  }
}
