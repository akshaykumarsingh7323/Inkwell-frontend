import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PostService, PostResponse } from '../../services/post.service';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-related-posts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './related-posts.html',
  styleUrl: './related-posts.css'
})
export class RelatedPostsComponent implements OnInit {
  @Input({ required: true }) postId!: number;
  @Input() categoryId?: number;

  private postService = inject(PostService);
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  
  relatedPosts: PostResponse[] = [];
  isLoading = true;

  ngOnInit() {
    this.loadRelatedPosts();
  }

  loadRelatedPosts() {
    this.isLoading = true;
    this.postService.getRelatedPosts(this.postId).subscribe({
      next: (posts) => {
        this.relatedPosts = posts.slice(0, 3);
        this.isLoading = false;
      },
      error: () => {
        if (this.categoryId) {
          this.postService.getPublishedPostsByCategory(this.categoryId, 0, 4).subscribe({
            next: (res) => {
              this.relatedPosts = (res.content || [])
                .filter(p => p.postId !== this.postId)
                .slice(0, 3);
              this.isLoading = false;
            },
            error: () => this.isLoading = false
          });
        } else {
          this.isLoading = false;
        }
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

    this.paymentService.createOrder(
      currentUser.userId, 
      post.postId.toString(), 
      post.price || 0
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
        this.toastService.error('Failed to initiate payment.');
      }
    });
  }

  getPostImage(post: PostResponse): string {
    return post.featuredImageUrl || 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80';
  }
}
