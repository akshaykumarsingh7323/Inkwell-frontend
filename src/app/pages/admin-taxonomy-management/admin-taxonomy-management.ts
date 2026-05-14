import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService, CategoryResponse, CategoryRequest, TagResponse, TagRequest, CategoryTreeResponse } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { Router } from '@angular/router';
import { catchError, of, forkJoin, timeout } from 'rxjs';

@Component({
  selector: 'app-admin-taxonomy-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-taxonomy-management.html',
  styleUrl: './admin-taxonomy-management.css'
})
export class AdminTaxonomyManagement implements OnInit {
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  categories: CategoryTreeResponse[] = [];
  categoriesFlat: CategoryResponse[] = [];
  tags: TagResponse[] = [];
  isLoading = true;
  errorMessage = '';
  currentUser$ = this.authService.currentUser$;

  // Form drafts
  categoryDraft: CategoryRequest = { name: '', description: '', parentCategoryId: undefined };
  tagDraft: TagRequest = { name: '' };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    forkJoin({
      cats: this.categoryService.getCategoryTree(),
      catsFlat: this.categoryService.getCategories(),
      tags: this.categoryService.getAllTags()
    }).pipe(
      timeout(5000),
      catchError((error) => {
        console.error('Error fetching taxonomy:', error);
        this.errorMessage = 'Failed to load platform taxonomy. Please check if the Category Service is running.';
        this.isLoading = false;
        return of({ cats: [], catsFlat: [], tags: [] });
      })
    ).subscribe(({ cats, catsFlat, tags }) => {
      this.categories = cats;
      this.categoriesFlat = catsFlat;
      this.tags = tags;
      this.isLoading = false;
    });
  }

  createCategory(): void {
    if (!this.categoryDraft.name) return;
    this.categoryService.createCategory(this.categoryDraft).subscribe({
      next: () => {
        this.loadData();
        this.categoryDraft = { name: '', description: '', parentCategoryId: undefined };
        this.toastService.success('Category created successfully.');
      },
      error: () => {
        this.toastService.error('Failed to create category.');
      }
    });
  }

  async deleteCategory(id: number) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Category',
      message: 'Are you sure? This might affect posts in this category.',
      confirmText: 'Delete',
      type: 'danger'
    });

    if (!confirmed) return;

    this.categoryService.deleteCategory(id).subscribe({
      next: () => {
        this.loadData();
        this.toastService.success('Category deleted.');
      }
    });
  }

  createTag(): void {
    if (!this.tagDraft.name) return;
    this.categoryService.createTag(this.tagDraft).subscribe({
      next: () => {
        this.loadData();
        this.tagDraft = { name: '' };
        this.toastService.success('Tag created.');
      },
      error: () => {
        this.toastService.error('Failed to create tag.');
      }
    });
  }

  async deleteTag(id: number) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Remove Tag',
      message: 'Are you sure you want to remove this tag?',
      confirmText: 'Remove',
      type: 'danger'
    });

    if (!confirmed) return;

    this.categoryService.deleteTag(id).subscribe({
      next: () => {
        this.loadData();
        this.toastService.success('Tag removed.');
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
