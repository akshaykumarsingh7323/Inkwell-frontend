import { Component, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicUserProfile } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { NewsletterService } from '../../services/newsletter.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-author-bio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './author-bio.html',
  styleUrl: './author-bio.css'
})
export class AuthorBioComponent implements OnInit {
  private authService = inject(AuthService);
  private newsletterService = inject(NewsletterService);
  private toastService = inject(ToastService);

  @Input({ required: true }) author!: PublicUserProfile;

  isFollowing = false;
  isPending = false;

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUserSnapshot();
    if (currentUser && this.author) {
      this.newsletterService.getSubscriptionStatus(currentUser.email, Number(this.author.userId)).subscribe(
        status => {
          this.isFollowing = (status === 'ACTIVE');
          this.isPending = (status === 'PENDING');
        }
      );
    }
  }

  toggleFollow() {
    const currentUser = this.authService.getCurrentUserSnapshot();
    if (!currentUser) {
      this.toastService.warning('Please login to follow authors.');
      this.authService.redirectToLogin();
      return;
    }

    if (!this.isFollowing && !this.isPending) {
      this.newsletterService.subscribe({
        email: currentUser.email,
        fullName: currentUser.fullName,
        userId: Number(currentUser.userId),
        followedAuthorId: Number(this.author.userId)
      }).subscribe({
        next: () => {
          this.isPending = true;
          this.toastService.success(`Follow request sent for ${this.author.fullName}! Please confirm your email.`);
        },
        error: (err) => {
          console.error('Follow failed', err);
          this.toastService.error('Could not follow at this time.');
        }
      });
    } else if (this.isFollowing) {
      // Logic for Unfollow
      this.newsletterService.unsubscribeByEmail(currentUser.email, Number(this.author.userId)).subscribe({
        next: () => {
          this.isFollowing = false;
          this.toastService.success(`You unfollowed ${this.author.fullName}`);
        },
        error: (err) => {
          console.error('Unfollow failed', err);
          this.toastService.error('Could not unfollow at this time.');
        }
      });
    }
  }
}
