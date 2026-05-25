import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PostService, PostResponse } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { NewsletterService } from '../../services/newsletter.service';
import { CategoryService, CategoryResponse, TagResponse } from '../../services/category.service';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { PublicUserProfile } from '../../models/user.model';
import { environment } from '../../../environments/environment';
import { map, take } from 'rxjs';

import { PostHeroComponent } from '../../components/post-hero/post-hero';
import { PostEngagementComponent } from '../../components/post-engagement/post-engagement';
import { AuthorBioComponent } from '../../components/author-bio/author-bio';
import { CommentsSectionComponent } from '../../components/comments-section/comments-section';
import { RelatedPostsComponent } from '../../components/related-posts/related-posts';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [
    RouterLink, 
    CommonModule, 
    FormsModule, 
    PostHeroComponent, 
    PostEngagementComponent, 
    AuthorBioComponent, 
    CommentsSectionComponent, 
    RelatedPostsComponent
  ],
  templateUrl: './post-detail.html',
  styleUrl: './post-detail.css',
})
export class PostDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private newsletterService = inject(NewsletterService);
  private categoryService = inject(CategoryService);
  private paymentService = inject(PaymentService);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  private location = inject(Location);

  post: PostResponse | null = null;
  authorProfile: PublicUserProfile | null = null;
  categories: CategoryResponse[] = [];
  tags: TagResponse[] = [];
  isLoading = true;
  isLiked = false;
  
  isLocked = false;
  lockMessage = '';
  previewContent = '';
  
  newsletterEmail = '';
  newsletterStatus = '';
  
  currentUser$ = this.authService.currentUser$;

  progressWidth = '0%';
  estimatedReadTime = 0;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (slug) {
        this.loadPost(slug);
      }
    });
    this.loadCategories();
    window.addEventListener('scroll', this.updateScrollProgress.bind(this));
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.updateScrollProgress.bind(this));
  }

  updateScrollProgress(): void {
    const scrollPosition = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollPosition / documentHeight) * 100;
    this.progressWidth = `${progress}%`;
  }

  loadPost(slug: string): void {
    this.isLoading = true;
    this.postService.getPostBySlug(slug).subscribe({
      next: (post) => {
        this.post = post;
        this.isLiked = !!post.isLikedByCurrentUser;
        
        // Calculate read time
        const wordCount = post.content ? post.content.replace(/<[^>]*>?/gm, '').split(/\s+/).length : 0;
        this.estimatedReadTime = Math.ceil(wordCount / 200);

        // Check for locked content
        if (post.content && post.content.startsWith('{"locked": true')) {
          try {
            const lockData = JSON.parse(post.content);
            this.isLocked = true;
            this.lockMessage = lockData.message;
            this.previewContent = lockData.preview;
            
            // Automatically prompt for payment
            setTimeout(() => {
              this.buyPost(true);
            }, 100);
          } catch (e) {
            this.isLocked = false;
          }
        } else {
          this.isLocked = false;
        }

        this.loadAuthorProfile(post.authorId);
        this.loadTags(post.postId);
        this.incrementViews(post.postId);
        this.isLoading = false;
        window.scrollTo(0, 0);
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  loadAuthorProfile(authorId: number): void {
    this.authService.getPublicProfile(authorId).subscribe({
      next: (profile) => {
        this.authorProfile = profile;
      },
      error: () => {
        // Author profile not found (e.g. 404) – keep authorProfile null and
        // let the template fall back to the post's embedded author name.
        this.authorProfile = null;
      },
    });
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
    });
  }

  loadTags(postId: number): void {
    this.categoryService.getTagsByPost(postId).subscribe({
      next: (tags) => {
        this.tags = tags;
      },
    });
  }

  incrementViews(postId: number): void {
    this.postService.incrementViews(postId).subscribe();
  }

  toggleLike(): void {
    if (!this.post) return;
    
    if (!this.authService.isLoggedIn()) {
      this.authService.redirectToLogin(this.router.url);
      return;
    }

    if (this.isLiked) {
      this.postService.unlikePost(this.post.postId).subscribe(() => {
        this.isLiked = false;
        if (this.post) this.post.likesCount--;
      });
    } else {
      this.postService.likePost(this.post.postId).subscribe(() => {
        this.isLiked = true;
        if (this.post) this.post.likesCount++;
        this.toastService.success('Post liked!');
      });
    }
  }

  subscribeNewsletter(): void {
    if (!this.newsletterEmail.trim()) return;

    if (!this.authService.isLoggedIn()) {
      this.authService.redirectToLogin(this.router.url);
      return;
    }

    this.newsletterService.subscribe({ email: this.newsletterEmail.trim() }).subscribe({
      next: () => {
        this.toastService.success('Subscription request sent. Please confirm by email.');
        this.newsletterEmail = '';
      },
      error: () => {
        this.toastService.error('Subscription failed. Try again.');
      }
    });
  }

  getPostImage(): string {
    return this.post?.featuredImageUrl ||
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&q=80';
  }

  getAuthorName(): string {
    return this.authorProfile?.fullName || this.authorProfile?.username || 'Author';
  }

  getAuthorAvatar(): string | undefined {
    return this.authorProfile?.avatarUrl;
  }

  getCategoryName(): string {
    if (!this.post?.categoryId) {
      return 'Essay';
    }

    return this.categories.find((category) => category.categoryId === this.post?.categoryId)?.name || 'Essay';
  }

  goBack(): void {
    this.location.back();
  }

  buyPost(autoTrigger: boolean = false): void {
    if (!this.post) return;

    this.confirmationService.confirm({
      title: 'Do you want to pay?',
      message: `This premium post requires payment to unlock. Continue to pay ₹${this.post!.price || 0}?`,
      confirmText: 'Yes, Pay Now',
      cancelText: 'No',
      type: 'warning'
    }).then((confirmed) => {
      if (!confirmed) {
        if (autoTrigger) {
          this.goBack();
        }
        return;
      }

      this.authService.currentUser$.pipe(take(1)).subscribe(user => {
        if (!user) {
          this.authService.redirectToLogin(this.router.url);
          return;
        }

        if (user.role === 'ADMIN' || user.userId === String(this.post!.authorId)) {
          window.location.reload();
          return;
        }

        this.paymentService.createOrder(
          user.userId, 
          this.post!.postId.toString(), 
          this.post!.price || 0
        ).subscribe({
          next: (orderId) => {
            if (orderId.startsWith('order_mock_')) {
              this.paymentService.verifyPayment({
                orderId: orderId,
                paymentId: 'pay_mock_' + Math.random().toString(36).substring(7),
                signature: 'mock_signature'
              }).subscribe({
                next: (res) => {
                  if (res && res.status === 'SUCCESS') {
                    this.toastService.success('Payment successful! Reloading...');
                    setTimeout(() => window.location.reload(), 1500);
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
              amount: (this.post!.price || 0) * 100,
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
                      setTimeout(() => {
                        window.location.reload();
                      }, 2000);
                    } else {
                      this.toastService.error('Payment verification failed.');
                    }
                  },
                  error: () => {
                    this.toastService.error('Payment verification failed. Please contact support.');
                  }
                });
              },
              prefill: {
                name: user.fullName || user.username,
                email: user.email
              },
              theme: {
                color: '#1a1a1a'
              }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
          },
          error: () => {
            this.toastService.error('Failed to initiate payment. Please try again.');
          }
        });
      });
    });
  }
}
