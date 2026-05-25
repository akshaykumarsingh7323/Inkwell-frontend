import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PostService, PostResponse } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicUserProfile } from '../../models/user.model';
import { catchError, forkJoin, of, Subscription, timeout } from 'rxjs';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';

@Component({
  selector: 'app-admin-post-management',
  standalone: true,
  imports: [CommonModule, RouterLink, MediaUrlPipe],
  templateUrl: './admin-post-management.html',
  styleUrl: './admin-post-management.css'
})
export class AdminPostManagement implements OnInit {
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  posts: PostResponse[] = [];
  authorProfiles: Record<number, PublicUserProfile> = {};
  isLoading = true;
  errorMessage = '';
  authorFilterId: number | null = null;
  currentUser$ = this.authService.currentUser$;
  private routeSub: Subscription | null = null;

  ngOnInit(): void {
    this.routeSub = this.route.queryParams.subscribe(params => {
      this.authorFilterId = params['authorId'] ? Number(params['authorId']) : null;
      this.loadPosts();
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  loadPosts(): void {
    this.isLoading = true;
    this.errorMessage = '';
    console.log(`Loading posts... Author filter: ${this.authorFilterId}`);

    const request$ = this.authorFilterId 
      ? this.postService.getPostsByAuthor(this.authorFilterId, 0, 100)
      : this.postService.getAllPostsForAdmin(0, 100);

    request$.pipe(
      timeout(60000),
      catchError((error) => {
        console.error('Error fetching posts:', error);
        this.errorMessage = 'Failed to sync platform posts. Please check if the Post Service is running.';
        this.isLoading = false;
        return of({ content: [] });
      })
    ).subscribe((res: any) => {
      console.log('Posts fetch result:', res);
      this.posts = res.content || [];
      this.loadAuthorProfiles(this.posts);
      this.isLoading = false;
    });
  }

  loadAuthorProfiles(posts: PostResponse[]): void {
    const uniqueAuthorIds = Array.from(new Set(posts.map(post => Number(post.authorId)).filter(id => !Number.isNaN(id))));

    if (uniqueAuthorIds.length === 0) {
      this.authorProfiles = {};
      return;
    }

    forkJoin(
      uniqueAuthorIds.map(id =>
        this.authService.getPublicProfile(id).pipe(
          catchError(() => of({
            userId: String(id),
            username: `User #${id}`
          } as PublicUserProfile))
        )
      )
    ).subscribe(profiles => {
      const nextProfiles: Record<number, PublicUserProfile> = {};
      profiles.forEach(profile => {
        nextProfiles[Number(profile.userId)] = profile;
      });
      this.authorProfiles = nextProfiles;
    });
  }

  getAuthorDisplayName(authorId: number): string {
    const profile = this.authorProfiles[authorId];
    return profile?.username || profile?.fullName || `User #${authorId}`;
  }

  clearFilter(): void {
    this.authorFilterId = null;
    this.loadPosts();
  }

  async requestDelete(id: number) {
    const post = this.posts.find(p => p.postId === id);
    if (!post) return;

    const confirmed = await this.confirmationService.confirm({
      title: 'Permanently Delete Post',
      message: `Are you sure you want to delete "${post.title}"? This will also notify the author.`,
      confirmText: 'Delete Post',
      type: 'danger'
    });

    if (!confirmed) return;

    const admin = this.authService.getCurrentUserSnapshot();
    if (admin) {
      this.notificationService.send({
        recipientId: post.authorId,
        actorId: Number(admin.userId),
        type: 'ADMIN_BROADCAST', // Use existing type to avoid DB constraint issues
        title: 'Content Removed by Admin',
        message: `Your post "${post.title}" has been permanently removed by an administrator for policy violations.`,
        relatedId: post.postId,
        relatedType: 'POST',
        sendEmail: true
      }).subscribe({
        next: () => console.log('Notification sent to author'),
        error: (err) => {
          console.error('Failed to send notification:', err);
          this.toastService.error('Author notification failed.');
        }
      });
    }
    
    this.postService.deletePost(id).subscribe({
      next: () => {
        this.posts = this.posts.filter(p => p.postId !== id);
        this.toastService.success('Post deleted and author notified.');
      },
      error: () => {
        this.toastService.error('Failed to delete post.');
      }
    });
  }

  async unpublishPost(id: number) {
    const post = this.posts.find(p => p.postId === id);
    if (!post) return;

    const confirmed = await this.confirmationService.confirm({
      title: 'Unpublish Post',
      message: `Are you sure you want to unpublish "${post.title}"? This will move the post to drafts and notify the author.`,
      confirmText: 'Unpublish Post',
      type: 'warning'
    });

    if (!confirmed) return;

    // Use snapshot to avoid observable timing issues
    const admin = this.authService.getCurrentUserSnapshot();
    if (admin) {
      console.log('Attempting to notify author:', post.authorId, 'about unpublish of post:', post.postId);
      this.notificationService.send({
        recipientId: post.authorId,
        actorId: Number(admin.userId),
        type: 'ADMIN_BROADCAST', // Use existing type to avoid DB constraint issues
        title: 'Post Unpublished by Admin',
        message: `Your post "${post.title}" has been moved to drafts by an administrator for review.`,
        relatedId: post.postId,
        relatedType: 'POST',
        sendEmail: true
      }).subscribe({
        next: () => console.log('Notification successful'),
        error: (err) => {
          console.error('Notification failed:', err);
          this.toastService.error('Author notification failed, but continuing unpublish...');
        }
      });
    }

    this.postService.unpublishPost(id).subscribe({
      next: () => {
        this.posts = this.posts.filter(p => p.postId !== id);
        this.toastService.info('Post moved to drafts.');
      },
      error: (err) => {
        console.error('Failed to unpublish post:', err);
        this.toastService.error('Failed to unpublish post.');
      }
    });
  }

  goToProfile(): void {
    const user = this.authService.getCurrentUserSnapshot();
    if (user?.userId) {
      this.router.navigate(['/author', user.userId]);
    } else {
      this.router.navigate(['/admin']);
    }
  }

  async logout() {
    const confirmed = await this.confirmationService.confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of the Admin panel?',
      confirmText: 'Sign Out',
      type: 'danger'
    });

    if (confirmed) {
      this.authService.logout();
    }
  }
}
