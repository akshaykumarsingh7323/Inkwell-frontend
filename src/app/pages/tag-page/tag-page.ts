import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { CategoryService, CategoryResponse, TagResponse } from '../../services/category.service';
import { PostService, PostResponse } from '../../services/post.service';

@Component({
  selector: 'app-tag-page',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, Footer],
  templateUrl: './tag-page.html',
  styleUrl: './tag-page.css',
})
export class TagPage implements OnInit {
  private route = inject(ActivatedRoute);
  private categoryService = inject(CategoryService);
  private postService = inject(PostService);

  slug = '';
  tag: TagResponse | null = null;
  posts: PostResponse[] = [];
  paginatedPosts: PostResponse[] = [];
  categories: CategoryResponse[] = [];
  isLoading = true;
  currentPage = 1;
  pageSize = 12;
  totalPages = 1;

  ngOnInit(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      }
    });

    this.route.paramMap.subscribe(params => {
      this.slug = params.get('slug') || '';
      if (this.slug) {
        this.loadTag();
      }
    });
  }

  loadTag(): void {
    this.isLoading = true;
    this.categoryService.getTagBySlug(this.slug).subscribe({
      next: (res) => {
        this.tag = res;
        this.loadPosts(res.tagId);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadPosts(tagId: number): void {
    this.postService.getPublishedPostsByTag(tagId, 0, 100).subscribe({
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

  getCategoryName(categoryId?: number): string {
    if (!categoryId) {
      return 'Uncategorized';
    }

    return this.categories.find((category) => category.categoryId === categoryId)?.name || 'Uncategorized';
  }
}
