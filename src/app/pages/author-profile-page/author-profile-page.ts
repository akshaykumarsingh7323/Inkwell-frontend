import { Component, OnInit, inject, signal, ViewChild, ElementRef, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { combineLatest, forkJoin, of } from 'rxjs';
import { catchError, filter, take } from 'rxjs/operators';

import { Footer } from '../../components/footer/footer';
import { AuthService } from '../../services/auth.service';
import { CategoryService, CategoryResponse } from '../../services/category.service';
import { PostResponse, PostService } from '../../services/post.service';
import { MediaService } from '../../services/media.service';
import { NewsletterService } from '../../services/newsletter.service';
import { NotificationService } from '../../services/notification.service';
import { ToastService } from '../../services/toast.service';
import { PublicUserProfile } from '../../models/user.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-author-profile-page',
  standalone: true,
  imports: [CommonModule, Footer, FormsModule, RouterLink],
  templateUrl: './author-profile-page.html',
  styleUrl: './author-profile-page.css'
})
export class AuthorProfilePageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private postService = inject(PostService);
  private categoryService = inject(CategoryService);
  private mediaService = inject(MediaService);
  private newsletterService = inject(NewsletterService);
  private notificationService = inject(NotificationService);
  private toastService = inject(ToastService);
  private location = inject(Location);

  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;

  author: PublicUserProfile | null = null;

  posts: PostResponse[] = [];
  categories: CategoryResponse[] = [];
  isLoading = true;
  isSaving = false;
  isUploading = false;
  isOtpSending = false;
  isEditing = false;
  errorMessage = '';
  successMessage = '';

  followerCount = signal<number>(0);
  isFollowing = signal<boolean>(false);
  isPending = signal<boolean>(false);
  isFollowLoading = signal<boolean>(false);

  currentUser = this.authService.getCurrentUserSnapshot();
  isOwnProfile = false;
  activeTab = signal<'latest' | 'popular'>('latest');

  filteredPosts = computed(() => {
    let p = [...this.posts];
    if (this.activeTab() === 'popular') {
      p.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    } else {
      // Default latest
      p.sort((a, b) => new Date(b.publishedAt || b.createdAt || '').getTime() - new Date(a.publishedAt || a.createdAt || '').getTime());
    }
    return p;
  });

  // Edit fields
  editFullName = '';
  editBio = '';
  editAvatarUrl = '';
  editPhoneNumber = '';
  editUsername = '';
  editEmail = '';
  
  // OTP logic
  showOtpModal = false;
  showSuccessModal = false;
  otpCodeArray = ['', '', '', '', '', ''];
  isVerifyingOtp = false;
  otpErrorMessage = '';
  
  // Messaging logic
  showMsgModal = false;
  isMsgSending = false;
  msgBody = '';
  msgError = '';
  msgSuccess = '';

  isPhoneVerified(): boolean {
    return !!this.author?.phoneNumber && this.author.phoneNumber === this.editPhoneNumber;
  }

  onPhoneChange(): void {
    // Used to trigger UI updates if needed
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    // Allow only numbers
    input.value = input.value.replace(/[^0-9]/g, '');
    this.otpCodeArray[index] = input.value;
    
    if (input.value && index < 5) {
      const next = document.getElementById(`otp-input-${index + 1}`);
      if (next) {
        next.focus();
      }
    }
  }

  onOtpKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpCodeArray[index] && index > 0) {
      const prev = document.getElementById(`otp-input-${index - 1}`);
      if (prev) {
        prev.focus();
        this.otpCodeArray[index - 1] = '';
      }
    }
  }

  ngOnInit(): void {
    combineLatest([
      this.authService.isInitializing$,
      this.authService.currentUser$,
      this.route.paramMap
    ]).pipe(
      filter(([isInitializing]) => !isInitializing),
      take(1)
    ).subscribe(([_, user, params]) => {
      this.currentUser = user;
      const userId = params.get('userId');
      if (!userId) {
        this.errorMessage = 'Author not found.';
        this.isLoading = false;
        return;
      }

      this.isOwnProfile = (this.currentUser?.userId === userId);
      this.loadAuthorProfile(userId);

      // Force edit mode if explicitly requested or if it's our own profile
      this.route.queryParamMap.pipe(take(1)).subscribe(qParams => {
        if (qParams.get('edit') === 'true' && this.isOwnProfile) {
          this.isEditing = true;
        }
      });
    });
  }

  loadAuthorProfile(userId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    const profileObs = this.isOwnProfile 
      ? this.authService.getCurrentUser().pipe(catchError(() => of(null)))
      : this.authService.getPublicProfile(userId).pipe(catchError(() => of(null)));

    forkJoin({
      author: profileObs,
      posts: this.postService.getPublishedPostsByAuthor(userId, 0, 24).pipe(catchError(() => of({ content: [] }))),
      categories: this.categoryService.getCategories().pipe(catchError(() => of([]))),
      followerCount: this.newsletterService.getSubscriberCount(Number(userId)).pipe(catchError(() => of(0)))
    }).subscribe({
      next: ({ author, posts, categories, followerCount }) => {
        if (!author) {
          this.errorMessage = 'Author profile not found or could not be loaded.';
          this.isLoading = false;
          return;
        }
        this.author = author;
        this.posts = posts.content ?? [];
        this.categories = categories;
        this.followerCount.set(followerCount);

        // Check if current user is following this author
        if (this.currentUser && !this.isOwnProfile) {
          this.newsletterService.getSubscriptionStatus(this.currentUser.email, Number(userId))
            .subscribe(status => {
              this.isFollowing.set(status === 'ACTIVE');
              this.isPending.set(status === 'PENDING');
            });
        }
        
        // If it's our own profile, ensure we have the private details (email, phone, name)
        if (this.isOwnProfile && this.currentUser) {
          if (!this.author.email) this.author.email = this.currentUser.email;
          if (!this.author.phoneNumber) this.author.phoneNumber = this.currentUser.phoneNumber;
          if (!this.author.fullName) this.author.fullName = this.currentUser.fullName;
        }

        // Initialize edit fields
        this.editFullName = this.author.fullName || author.fullName || '';
        this.editBio = author.bio || '';
        this.editAvatarUrl = author.avatarUrl || '';
        this.editPhoneNumber = this.author.phoneNumber || '';
        this.editUsername = author.username || '';
        this.editEmail = this.author.email || '';

        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.message || 'Failed to load author profile.';
        this.isLoading = false;
      }
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      // Reset if cancelled
      this.editFullName = this.author?.fullName || '';
      this.editBio = this.author?.bio || '';
      this.editAvatarUrl = this.author?.avatarUrl || '';
    }
  }

  triggerPhotoUpload(): void {
    if (this.isOwnProfile && this.photoInput) {
      this.photoInput.nativeElement.click();
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.uploadPhoto(file);
    }
  }

  uploadPhoto(file: File): void {
    this.isUploading = true;
    this.mediaService.uploadMedia(file).subscribe({
      next: (res) => {
        this.editAvatarUrl = res.url;
        this.isUploading = false;
        if (!this.isEditing) {
           this.saveProfile(); // Auto save if just changing photo
        }
      },
      error: (err) => {
        console.error('Photo upload failed:', err);
        this.isUploading = false;
        this.errorMessage = err.error?.message || err.error?.error || 'Failed to upload photo. Please check backend logs.';
      }
    });
  }

  sendOtp(): void {
    if (!this.editPhoneNumber) {
      this.errorMessage = 'Please enter a phone number first.';
      return;
    }

    // Auto-prepend '+91' if it's a 10-digit number without country code
    let formattedPhone = this.editPhoneNumber.trim();
    if (/^\d{10}$/.test(formattedPhone)) {
      formattedPhone = '+91' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    this.editPhoneNumber = formattedPhone;

    this.isOtpSending = true;
    this.errorMessage = '';
    
    this.authService.sendOtp(this.editPhoneNumber).subscribe({
      next: () => {
        this.isOtpSending = false;
        this.showOtpModal = true;
        this.otpCodeArray = ['', '', '', '', '', ''];
        this.otpErrorMessage = '';
        setTimeout(() => {
          const firstInput = document.getElementById('otp-input-0');
          if (firstInput) firstInput.focus();
        }, 100);
      },
      error: (err) => {
        this.isOtpSending = false;
        this.errorMessage = err?.error?.message || 'Failed to send OTP. Please try again.';
      }
    });
  }

  verifyOtp(): void {
    const code = this.otpCodeArray.join('');
    if (code.length < 4) {
      this.otpErrorMessage = 'Please enter the complete OTP code.';
      return;
    }
    this.isVerifyingOtp = true;
    this.otpErrorMessage = '';

    this.authService.verifyOtp(this.editPhoneNumber, code).subscribe({
      next: () => {
        this.isVerifyingOtp = false;
        this.showOtpModal = false;
        this.showSuccessModal = true;
        
        // Update the author object to mark it verified locally before saving
        if (this.author) {
          this.author.phoneNumber = this.editPhoneNumber;
        }

        setTimeout(() => {
          this.showSuccessModal = false;
        }, 2500);
      },
      error: (err) => {
        this.isVerifyingOtp = false;
        this.otpErrorMessage = err?.error?.message || 'Invalid or expired OTP code.';
        this.otpCodeArray = ['', '', '', '', '', ''];
        document.getElementById('otp-input-0')?.focus();
      }
    });
  }

  saveProfile(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      fullName: this.editFullName,
      bio: this.editBio,
      avatarUrl: this.editAvatarUrl,
      phoneNumber: this.editPhoneNumber
    };

    this.authService.updateProfile(payload).subscribe({
      next: (updatedUser) => {
        if (this.author) {
          this.author.fullName = updatedUser.fullName;
          this.author.bio = updatedUser.bio;
          this.author.avatarUrl = updatedUser.avatarUrl;
          this.author.phoneNumber = updatedUser.phoneNumber;
        }
        this.isSaving = false;
        this.isEditing = false;
        
        this.successMessage = 'Profile updated successfully.';
        setTimeout(() => {
          this.successMessage = '';
          const user = this.authService.getCurrentUserSnapshot();
          if (user?.role === 'ADMIN') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/author-dashboard']);
          }
        }, 1500);
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = err?.message || 'Failed to update profile.';
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  getDisplayName(): string {
    const name = this.isEditing ? this.editFullName : this.author?.fullName;
    return name && name.trim() !== '' ? name : (this.author?.username || 'Author');
  }

  getInitial(): string {
    return this.getDisplayName().charAt(0).toUpperCase();
  }

  getCategoryName(categoryId?: number): string {
    if (!categoryId) return 'Uncategorized';
    return this.categories.find((c) => c.categoryId === categoryId)?.name || 'Uncategorized';
  }

  toggleFollow(): void {
    if (!this.currentUser) {
      this.authService.redirectToLogin();
      return;
    }

    if (!this.author) return;

    this.isFollowLoading.set(true);
    const previousState = this.isFollowing();
    
    if (previousState) {
      // Optimistic Update for Unfollow
      this.isFollowing.set(false);
      this.followerCount.update(c => Math.max(0, c - 1));

      this.newsletterService.unsubscribeByEmail(this.currentUser.email, Number(this.author.userId)).subscribe({
        next: () => {
          this.isFollowLoading.set(false);
          this.toastService.success(`You unfollowed ${this.author?.fullName}`);
        },
        error: () => {
          // Revert
          this.isFollowing.set(true);
          this.followerCount.update(c => c + 1);
          this.isFollowLoading.set(false);
          this.toastService.error('Failed to unfollow.');
        }
      });
    } else {
      // Follow action (requires confirmation)
      this.newsletterService.subscribe({
        email: this.currentUser.email,
        fullName: this.currentUser.fullName,
        userId: Number(this.currentUser.userId),
        followedAuthorId: Number(this.author.userId)
      }).subscribe({
        next: () => {
          this.isFollowLoading.set(false);
          this.isPending.set(true); // Show pending state
          this.toastService.success(`Follow request sent for ${this.author?.fullName}! Check your email to confirm.`);
        },
        error: () => {
          this.isFollowLoading.set(false);
          this.toastService.error('Failed to follow.');
        }
      });
    }
  }

  openMessageModal(): void {
    if (!this.currentUser) {
      this.authService.redirectToLogin();
      return;
    }
    this.showMsgModal = true;
    this.msgBody = '';
    this.msgError = '';
    this.msgSuccess = '';
  }

  sendMessage(): void {
    if (!this.msgBody.trim()) return;
    this.isMsgSending = true;
    this.msgError = '';
    this.msgSuccess = '';

    // For now, we use notification service to send a message notification
    // to the author
    const authorId = Number(this.author?.userId);
    const senderName = this.currentUser?.fullName || this.currentUser?.username || 'Someone';

    const notificationRequest = {
      recipientId: authorId,
      title: `New Message from ${senderName}`,
      message: this.msgBody.trim(),
      type: 'DIRECT_MESSAGE'
    };

    this.notificationService.send(notificationRequest).subscribe({
      next: () => {
        this.isMsgSending = false;
        this.toastService.success('Message sent successfully!');
        this.msgBody = '';
        this.showMsgModal = false;
      },
      error: (err: any) => {
        this.isMsgSending = false;
        this.toastService.error('Failed to send message. Please try again.');
      }
    });
  }
}
