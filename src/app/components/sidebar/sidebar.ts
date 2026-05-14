import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { CategoryService, TagResponse } from '../../services/category.service';
import { ConfirmationService } from '../../services/confirmation.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar implements OnInit {
  private authService = inject(AuthService);
  private categoryService = inject(CategoryService);
  private confirmationService = inject(ConfirmationService);
  
  currentUser$ = this.authService.currentUser$;
  trendingTags: TagResponse[] = [];

  ngOnInit(): void {
    this.categoryService.getTrendingTags().subscribe({
      next: (tags) => {
        this.trendingTags = tags.slice(0, 5); // take top 5
      },
      error: () => {
        console.warn('Trending tags unavailable (category-service may not be running)');
      }
    });
  }

  async logout() {
    const confirmed = await this.confirmationService.confirm({
      title: 'Confirm Logout',
      message: 'Are you sure you want to logout?',
      confirmText: 'Logout',
      type: 'danger'
    });

    if (confirmed) {
      this.authService.logout();
    }
  }
}
