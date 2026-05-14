import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthorStudioShell } from '../../components/author-studio-shell/author-studio-shell';
import { NewsletterService, Subscriber } from '../../services/newsletter.service';
import { AuthService } from '../../services/auth.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-followers',
  standalone: true,
  imports: [CommonModule, AuthorStudioShell],
  templateUrl: './followers.html',
  styleUrl: './followers.css'
})
export class Followers implements OnInit {
  private newsletterService = inject(NewsletterService);
  private authService = inject(AuthService);
  
  followers: Subscriber[] = [];
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadFollowers();
  }

  loadFollowers(): void {
    this.isLoading = true;
    const currentUser = this.authService.getCurrentUserSnapshot();
    const authorId = currentUser ? Number(currentUser.userId) : undefined;

    this.newsletterService.getAllSubscribers(authorId).pipe(
      catchError(err => {
        // Silently fail to empty list as requested
        return of([]);
      })
    ).subscribe(data => {
      this.followers = data || [];
      this.isLoading = false;
    });
  }

  getInitial(name?: string): string {
    return (name || 'U').charAt(0).toUpperCase();
  }
}
