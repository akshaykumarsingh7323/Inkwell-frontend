import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PaymentRecord, PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { PostResponse, PostService } from '../../services/post.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';

interface PurchasedPostView extends PaymentRecord {
  postSlug: string | null;
  postTitle: string;
  featuredImageUrl: string;
  authorName: string;
  viewCount: number;
  likesCount: number;
  categoryName: string;
}

@Component({
  selector: 'app-my-purchases',
  standalone: true,
  imports: [CommonModule, MediaUrlPipe],
  templateUrl: './my-purchases.html',
  styleUrl: './my-purchases.css'
})
export class MyPurchases implements OnInit {
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private postService = inject(PostService);
  private router = inject(Router);

  purchases: PurchasedPostView[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.paymentService.getUserPayments(user.userId).subscribe({
          next: (payments) => {
            const successfulPayments = payments.filter(payment => payment.status === 'SUCCESS');
            this.loadPurchasedPostDetails(successfulPayments);
          },
          error: () => this.isLoading = false
        });
      } else {
        this.isLoading = false;
      }
    });
  }

  openPost(purchase: PurchasedPostView): void {
    if (!purchase.postSlug) return;
    this.router.navigate(['/post', purchase.postSlug]);
  }

  private loadPurchasedPostDetails(payments: PaymentRecord[]): void {
    if (payments.length === 0) {
      this.purchases = [];
      this.isLoading = false;
      return;
    }

    forkJoin(payments.map(payment => this.mapPurchaseToView(payment))).subscribe({
      next: (purchases) => {
        this.purchases = purchases;
        this.isLoading = false;
      },
      error: () => {
        this.purchases = payments.map(payment => this.createFallbackPurchase(payment));
        this.isLoading = false;
      }
    });
  }

  private mapPurchaseToView(payment: PaymentRecord) {
    const postId = Number(payment.postId);
    if (Number.isNaN(postId)) {
      return of(this.createFallbackPurchase(payment));
    }

    return this.postService.getPostById(postId).pipe(
      map((post: PostResponse) => post),
      catchError(() => of(null)),
      map((post) => {
        if (!post) {
          return this.createFallbackPurchase(payment);
        }

        const fallbackAuthorName = post.authorName || 'InkWell Writer';

        if (!post.authorId) {
          return {
            ...payment,
            postSlug: post.slug,
            postTitle: post.title,
            featuredImageUrl: post.featuredImageUrl || '',
            authorName: fallbackAuthorName,
            viewCount: post.viewCount || 0,
            likesCount: post.likesCount || 0,
            categoryName: 'Premium'
          };
        }

        this.authService.getPublicProfile(post.authorId).subscribe({
          next: (profile) => {
            this.purchases = this.purchases.map(item =>
              item.postId === payment.postId
                ? { ...item, authorName: profile.fullName || profile.username || fallbackAuthorName }
                : item
            );
          }
        });

        return {
          ...payment,
          postSlug: post.slug,
          postTitle: post.title,
          featuredImageUrl: post.featuredImageUrl || '',
          authorName: fallbackAuthorName,
          viewCount: post.viewCount || 0,
          likesCount: post.likesCount || 0,
          categoryName: 'Premium'
        };
      }),
      catchError(() => of(this.createFallbackPurchase(payment)))
    );
  }

  private createFallbackPurchase(payment: PaymentRecord): PurchasedPostView {
    return {
      ...payment,
      postSlug: null,
      postTitle: `Post ID: ${payment.postId}`,
      featuredImageUrl: '',
      authorName: 'InkWell Writer',
      viewCount: 0,
      likesCount: 0,
      categoryName: 'Premium'
    };
  }
}
