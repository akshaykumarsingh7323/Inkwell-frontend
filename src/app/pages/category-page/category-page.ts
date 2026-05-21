import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { CategoryService, CategoryResponse } from '../../services/category.service';
import { PostService, PostResponse } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-category-page',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, Footer, MediaUrlPipe],
  templateUrl: './category-page.html',
  styleUrl: './category-page.css',
})
export class CategoryPage implements OnInit {
  private route = inject(ActivatedRoute);
  private categoryService = inject(CategoryService);
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private paymentService = inject(PaymentService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  slug = '';
  category: CategoryResponse | null = null;
  posts: PostResponse[] = [];
  paginatedPosts: PostResponse[] = [];
  isLoading = true;
  currentPage = 1;
  pageSize = 12;
  totalPages = 1;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.slug = params.get('slug') || '';
      if (this.slug) {
        this.loadCategory();
      }
    });
  }

  loadCategory(): void {
    this.isLoading = true;
    this.categoryService.getCategoryBySlug(this.slug).subscribe({
      next: (res) => {
        this.category = res;
        this.loadPosts(res.categoryId);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadPosts(categoryId: number): void {
    this.postService.getPublishedPostsByCategory(categoryId, 0, 100).subscribe({
      next: (res) => {
        this.posts = res.content || [];
        this.totalPages = Math.ceil(this.posts.length / this.pageSize) || 1;
        this.updatePagination();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
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

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedPosts = this.posts.slice(start, start + this.pageSize);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
