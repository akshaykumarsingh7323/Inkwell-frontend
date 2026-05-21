import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { PostService, PostResponse } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { CategoryService, CategoryResponse } from '../../services/category.service';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Component({
  selector: 'app-my-posts',
  standalone: true,
  imports: [CommonModule, RouterLink, MediaUrlPipe],
  templateUrl: './my-posts.html',
  styleUrl: './my-posts.css',
})
export class MyPosts implements OnInit {
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  posts: PostResponse[] = [];
  filteredPosts: PostResponse[] = [];
  categories: CategoryResponse[] = [];
  isLoading = true;
  activeFilter: 'ALL' | 'PUBLISHED' | 'UNPUBLISHED' | 'DRAFT' = 'ALL';
  showPublishModal = false;
  showDeleteModal = false;
  postToPublish: PostResponse | null = null;
  postToDelete: PostResponse | null = null;

  ngOnInit(): void {
    // Read status from query params
    const statusParam = this.route.snapshot.queryParamMap.get('status');
    if (statusParam && ['PUBLISHED', 'UNPUBLISHED', 'DRAFT'].includes(statusParam)) {
      this.activeFilter = statusParam as any;
    }

    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: () => {} // category-service may not be running; non-fatal
    });

    this.authService.currentUser$.pipe(
      map(user => user ?? null),
      distinctUntilChanged((prev, curr) => prev?.userId === curr?.userId)
    ).subscribe(user => {
      if (user) {
        this.loadPosts(user.userId);
      }
    });
  }

  loadPosts(userId: string): void {
    this.isLoading = true;
    this.postService.getPostsByAuthor(userId, 0, 100).subscribe({
      next: (res) => {
        this.posts = res.content || [];
        this.applyFilter(this.activeFilter);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load posts', err);
        this.isLoading = false;
      }
    });
  }

  applyFilter(filter: 'ALL' | 'PUBLISHED' | 'UNPUBLISHED' | 'DRAFT'): void {
    this.activeFilter = filter;
    if (filter === 'ALL') {
      this.filteredPosts = this.posts;
    } else {
      this.filteredPosts = this.posts.filter(p => p.status === filter);
    }
  }

  deletePost(post: PostResponse): void {
    this.postToDelete = post;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.postToDelete = null;
  }

  confirmDelete(): void {
    if (this.postToDelete) {
      const id = this.postToDelete.postId;
      this.postService.deletePost(id).subscribe(() => {
        // Clear last_draft_id if it matches the deleted post
        const savedId = localStorage.getItem('last_draft_id');
        if (savedId === id.toString()) {
          localStorage.removeItem('last_draft_id');
        }
        
        this.posts = this.posts.filter(p => p.postId !== id);
        this.applyFilter(this.activeFilter);
        this.showDeleteModal = false;
        this.postToDelete = null;
      });
    }
  }

  togglePublish(post: PostResponse): void {
    if (post.status === 'PUBLISHED') {
      this.postService.unpublishPost(post.postId).subscribe(updated => {
        this.updatePostInList(updated);
      });
    } else {
      this.postToPublish = post;
      this.showPublishModal = true;
    }
  }

  cancelPublish(): void {
    this.showPublishModal = false;
    this.postToPublish = null;
  }

  confirmPublish(): void {
    if (this.postToPublish) {
      this.postService.publishPost(this.postToPublish.postId).subscribe(updated => {
        this.updatePostInList(updated);
        this.showPublishModal = false;
        this.postToPublish = null;
      });
    }
  }

  private updatePostInList(updated: PostResponse): void {
    const idx = this.posts.findIndex(p => p.postId === updated.postId);
    if (idx !== -1) {
      this.posts[idx] = updated;
      this.applyFilter(this.activeFilter);
    }
  }

  getCategoryName(categoryId?: number): string {
    if (!categoryId) {
      return 'Uncategorized';
    }

    return this.categories.find((category) => category.categoryId === categoryId)?.name || 'Uncategorized';
  }
}
