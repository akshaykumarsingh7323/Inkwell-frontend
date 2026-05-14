import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { PostService, PostResponse, PageResponse } from '../../services/post.service';
import { CategoryService, CategoryResponse } from '../../services/category.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { NewsletterService } from '../../services/newsletter.service';
import { ToastService } from '../../services/toast.service';
import { PaymentService } from '../../services/payment.service';
import { Subject, Subscription, debounceTime, distinctUntilChanged, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './search.html',
  styleUrl: './search.css',
})
export class Search implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private postService = inject(PostService);
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private newsletterService = inject(NewsletterService);
  private toastService = inject(ToastService);
  private paymentService = inject(PaymentService);

  query = '';
  posts: PostResponse[] = [];
  categories: CategoryResponse[] = [];
  
  // Discovery Sections
  trendingPosts: PostResponse[] = [];
  recommendedPosts: PostResponse[] = [];
  latestPosts: PostResponse[] = [];
  topAuthors: any[] = [];
  
  selectedCategory: string = 'All';
  selectedSort: string = 'latest';
  isLoading = false;
  errorMessage = '';
  hasSearched = false;

  get isDiscoveryMode(): boolean {
    return !this.query && this.selectedSort === 'latest' && this.selectedCategory === 'All';
  }

  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  ngOnInit(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      }
    });

    this.route.queryParams.subscribe(params => {
      this.query = params['q'] || '';
      this.selectedSort = params['sort'] || 'latest';
      
      if (this.query) {
        this.performSearch();
      } else {
        this.loadDiscoveryContent();
      }
    });

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.query = searchTerm;
      // Update URL query params without reloading the page
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { q: this.query || null },
        queryParamsHandling: 'merge'
      });
      
      if (this.query) {
        this.performSearch();
      } else {
        this.hasSearched = false;
        this.posts = [];
        this.loadDiscoveryContent();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  onSearchInput(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  loadDiscoveryContent(): void {
    this.isLoading = true;
    
    // Fetch real trending posts (for the trending sidebar if needed, or just use for discovery)
    this.postService.getTrendingPosts().subscribe({
      next: (posts) => {
        this.trendingPosts = posts;
      },
      error: (err) => console.error('Failed to load trending posts:', err)
    });

    const category = this.categories.find(c => c.name === this.selectedCategory);
    
    this.postService.explorePosts({
      sort: this.selectedSort,
      categoryId: category?.categoryId,
      page: 0,
      size: 20
    }).subscribe({
      next: (res: PageResponse<PostResponse>) => {
        const allPosts = res.content || [];
        this.posts = allPosts; // Update main posts list
        this.latestPosts = allPosts; 
        this.recommendedPosts = allPosts.slice(0, 4);
        this.isLoading = false;
        this.errorMessage = '';
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.message || 'Failed to load discovery content.';
      }
    });

    this.authService.getPublicAuthors().subscribe({
      next: (authors) => {
        const currentUser = this.authService.getCurrentUserSnapshot();
        this.topAuthors = authors.map(author => {
          const authorObj = {
            id: author.userId,
            name: author.fullName || author.username,
            bio: author.bio || 'Sharing thoughts and stories on Inkwell.',
            avatar: author.avatarUrl || 'https://via.placeholder.com/150',
            isFollowing: false,
            isFollowLoading: false
          };
          
          if (currentUser) {
            this.newsletterService.checkSubscriptionStatus(currentUser.email, Number(author.userId))
              .pipe(catchError(() => of(false)))
              .subscribe(status => authorObj.isFollowing = status);
          }
          return authorObj;
        });
      },
      error: (err) => console.error('Failed to load authors:', err)
    });
  }

  setSort(sort: string): void {
    this.selectedSort = sort;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort: this.selectedSort },
      queryParamsHandling: 'merge'
    });
    this.loadDiscoveryContent();
  }

  selectCategory(name: string): void {
    this.selectedCategory = name;
    this.loadDiscoveryContent();
  }

  performSearch(): void {
    if (!this.query.trim()) return;
    this.isLoading = true;
    this.hasSearched = true;
    
    this.postService.explorePosts({
      keyword: this.query,
      sort: this.selectedSort,
      page: 0,
      size: 20
    }).subscribe({
      next: (res) => {
        this.posts = res.content || [];
        this.errorMessage = '';
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.message || 'Search failed.';
        this.isLoading = false;
      }
    });
  }

  getCategoryName(categoryId?: number): string {
    if (!categoryId) {
      return 'Uncategorized';
    }

    return this.categories.find((category) => category.categoryId === categoryId)?.name || 'Uncategorized';
  }

  getSortLabel(): string {
    switch (this.selectedSort) {
      case 'views': return 'Most Viewed';
      case 'likes': return 'Most Liked';
      case 'trending': return 'Trending';
      default: return 'Latest';
    }
  }

  handlePostClick(post: PostResponse, event: Event): void {
    if (post.isPremium && !post.accessUnlocked) {
      event.preventDefault();
      event.stopPropagation();
      this.buyPost(post);
    } else {
      this.router.navigate(['/post', post.slug]);
    }
  }

  buyPost(post: PostResponse): void {
    const currentUser = this.authService.getCurrentUserSnapshot();
    if (!currentUser) {
      this.toastService.warning('Please login to purchase posts.');
      this.authService.redirectToLogin(this.router.url);
      return;
    }

    this.isLoading = true;
    this.paymentService.createOrder(
      currentUser.userId, 
      post.postId.toString(), 
      post.price || 0
    ).subscribe({
      next: (orderId) => {
        this.isLoading = false;

        if (orderId.startsWith('order_mock_')) {
          this.paymentService.verifyPayment({
            orderId: orderId,
            paymentId: 'pay_mock_' + Math.random().toString(36).substring(7),
            signature: 'mock_signature'
          }).subscribe({
            next: (res) => {
              if (res && res.status === 'SUCCESS') {
                this.toastService.success('Payment successful! Opening post...');
                setTimeout(() => this.router.navigate(['/post', post.slug]), 1000);
              } else {
                this.toastService.error('Payment verification failed.');
              }
            },
            error: () => this.toastService.error('Payment verification failed.')
          });
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
          name: 'InkWell',
          description: 'Unlock Premium Post',
          order_id: orderId,
          handler: (response: any) => {
            this.paymentService.verifyPayment({
              orderId: orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            }).subscribe({
              next: (res: any) => {
                if (res && res.status === 'SUCCESS') {
                  this.toastService.success('Payment successful! Opening post...');
                  setTimeout(() => {
                    this.router.navigate(['/post', post.slug]);
                  }, 1000);
                } else {
                  this.toastService.error('Payment verification failed.');
                }
              },
              error: (err) => {
                this.toastService.error('Payment verification failed.');
              }
            });
          },
          prefill: {
            name: currentUser.fullName || currentUser.username,
            email: currentUser.email
          },
          theme: {
            color: '#004643'
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.error('Failed to initiate payment.');
      }
    });
  }

  toggleFollow(author: any) {
    const currentUser = this.authService.getCurrentUserSnapshot();
    if (!currentUser) {
      this.toastService.warning('Please login to follow authors.');
      this.authService.redirectToLogin();
      return;
    }

    author.isFollowLoading = true;
    const previousState = author.isFollowing;
    
    // Optimistic Update
    author.isFollowing = !previousState;

    if (previousState) {
      this.newsletterService.unsubscribeByEmail(currentUser.email, Number(author.id)).subscribe({
        next: () => {
          author.isFollowLoading = false;
          this.toastService.success(`You unfollowed ${author.name}`);
        },
        error: (err) => {
          console.error('Unfollow failed', err);
          author.isFollowing = previousState; // Revert
          author.isFollowLoading = false;
          this.toastService.error('Failed to unfollow. Please try again.');
        }
      });
    } else {
      this.newsletterService.subscribe({
        email: currentUser.email,
        fullName: currentUser.fullName,
        userId: Number(currentUser.userId),
        followedAuthorId: Number(author.id)
      }).subscribe({
        next: () => {
          author.isFollowLoading = false;
          this.toastService.success(`You are now following ${author.name}`);
        },
        error: (err) => {
          console.error('Follow failed', err);
          author.isFollowing = previousState; // Revert
          author.isFollowLoading = false;
          this.toastService.error('Failed to follow author. Please try again.');
        }
      });
    }
  }
}
