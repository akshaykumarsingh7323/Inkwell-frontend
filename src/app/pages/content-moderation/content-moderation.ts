import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../components/sidebar/sidebar';
import { CommentService, CommentResponse } from '../../services/comment.service';
import { CategoryService, CategoryTreeResponse, TagResponse } from '../../services/category.service';
import { NotificationService } from '../../services/notification.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-content-moderation',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './content-moderation.html',
  styleUrl: './content-moderation.css'
})
export class ContentModerationComponent implements OnInit {
  private commentService = inject(CommentService);
  private categoryService = inject(CategoryService);
  private notificationService = inject(NotificationService);

  comments: CommentResponse[] = [];
  categories: CategoryTreeResponse[] = [];
  categoriesFlat: CategoryTreeResponse[] = [];
  tags: TagResponse[] = [];

  isLoadingComments = true;
  isLoadingTaxonomy = true;
  statusMessage = '';
  errorMessage = '';

  categoryDraft = {
    name: '',
    description: '',
    parentCategoryId: null as number | null
  };

  tagDraft = {
    name: ''
  };

  broadcast = {
    targetRole: 'ALL' as 'READER' | 'AUTHOR' | 'ADMIN' | 'ALL',
    title: '',
    message: ''
  };

  ngOnInit(): void {
    this.loadPendingComments();
    this.loadTaxonomy();
  }

  loadPendingComments(): void {
    this.isLoadingComments = true;
    this.commentService.getPendingComments().subscribe({
      next: (data) => {
        this.comments = data;
        this.isLoadingComments = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load pending comments.';
        this.isLoadingComments = false;
      }
    });
  }

  loadTaxonomy(): void {
    this.isLoadingTaxonomy = true;
    forkJoin({
      categories: this.categoryService.getCategoryTree(),
      tags: this.categoryService.getAllTags()
    }).subscribe({
      next: ({ categories, tags }) => {
        this.categories = categories;
        this.categoriesFlat = this.flattenCategories(categories);
        this.tags = tags;
        this.errorMessage = '';
        this.isLoadingTaxonomy = false;
      },
      error: (error) => {
        this.errorMessage = error?.message || 'Failed to load taxonomy.';
        this.isLoadingTaxonomy = false;
      }
    });
  }

  private flattenCategories(nodes: CategoryTreeResponse[], level = 0): CategoryTreeResponse[] {
    let result: CategoryTreeResponse[] = [];
    for (const node of nodes) {
      const flatNode = { ...node, name: '—'.repeat(level) + ' ' + node.name };
      result.push(flatNode);
      if (node.children && node.children.length > 0) {
        result = result.concat(this.flattenCategories(node.children, level + 1));
      }
    }
    return result;
  }

  approveComment(id: number): void {
    this.commentService.approveComment(id).subscribe({
      next: () => {
        this.comments = this.comments.filter((comment) => comment.commentId !== id);
        this.statusMessage = 'Comment approved.';
      }
    });
  }

  rejectComment(id: number): void {
    this.commentService.rejectComment(id).subscribe({
      next: () => {
        this.comments = this.comments.filter((comment) => comment.commentId !== id);
        this.statusMessage = 'Comment rejected.';
      }
    });
  }

  createCategory(): void {
    if (!this.categoryDraft.name.trim()) {
      return;
    }

    const payload = {
      name: this.categoryDraft.name.trim(),
      description: this.categoryDraft.description.trim(),
      parentCategoryId: this.categoryDraft.parentCategoryId
    };

    // Assuming the service supports passing an object payload. Wait, I'll need to update categoryService.createCategory
    this.categoryService.createCategoryWithParent(payload.name, payload.description, payload.parentCategoryId).subscribe({
      next: () => {
        this.loadTaxonomy(); // Reload to get updated tree structure
        this.categoryDraft = { name: '', description: '', parentCategoryId: null };
        this.statusMessage = 'Category created.';
      },
      error: () => {
        this.errorMessage = 'Failed to create category.';
      }
    });
  }

  deleteCategory(categoryId: number): void {
    this.categoryService.deleteCategory(categoryId).subscribe({
      next: () => {
        this.categories = this.categories.filter((category) => category.categoryId !== categoryId);
        this.statusMessage = 'Category deleted.';
      },
      error: () => {
        this.errorMessage = 'Failed to delete category.';
      }
    });
  }

  createTag(): void {
    if (!this.tagDraft.name.trim()) {
      return;
    }

    this.categoryService.createTag(this.tagDraft.name.trim()).subscribe({
      next: (tag) => {
        this.tags.unshift(tag);
        this.tagDraft = { name: '' };
        this.statusMessage = 'Tag created.';
      },
      error: () => {
        this.errorMessage = 'Failed to create tag.';
      }
    });
  }

  deleteTag(tagId: number): void {
    this.categoryService.deleteTag(tagId).subscribe({
      next: () => {
        this.tags = this.tags.filter((tag) => tag.tagId !== tagId);
        this.statusMessage = 'Tag deleted.';
      },
      error: () => {
        this.errorMessage = 'Failed to delete tag.';
      }
    });
  }

  sendBroadcast(): void {
    const title = this.broadcast.title.trim();
    const message = this.broadcast.message.trim();

    if (!title || !message) {
      return;
    }

    this.notificationService.broadcastByRole({
      targetRole: this.broadcast.targetRole,
      title,
      message
    }).subscribe({
      next: () => {
        this.broadcast = { targetRole: 'ALL', title: '', message: '' };
        this.statusMessage = 'Platform notification sent.';
      },
      error: () => {
        this.errorMessage = 'Failed to send broadcast.';
      }
    });
  }
}
