import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { AuthService } from '../../services/auth.service';
import { MediaService } from '../../services/media.service';
import { NewsletterService } from '../../services/newsletter.service';

@Component({
  selector: 'app-reader-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, Sidebar],
  templateUrl: './reader-settings.html',
  styleUrl: './reader-settings.css',
})
export class ReaderSettings implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private mediaService = inject(MediaService);
  private newsletterService = inject(NewsletterService);

  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  user = this.authService.getCurrentUserSnapshot();

  profileMessage = '';
  passwordMessage = '';
  newsletterMessage = '';
  profileError = '';
  passwordError = '';
  
  isSavingProfile = false;
  isSavingPassword = false;
  isUploadingAvatar = false;
  isSavingNewsletter = false;
  isSubscribed = false;
  
  preferences = '';
  subscriberId: number | null = null;

  profileForm = this.fb.group({
    fullName: ['', [Validators.required]],
    bio: [''],
    avatarUrl: ['']
  });

  passwordForm = this.fb.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.refreshUser();
    this.checkNewsletterStatus();
  }

  refreshUser(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.user = user;
        this.profileForm.patchValue({
          fullName: user.fullName ?? '',
          bio: user.bio ?? '',
          avatarUrl: user.avatarUrl ?? ''
        });
      }
    });
  }

  checkNewsletterStatus(): void {
    if (!this.user?.email) return;
    this.newsletterService.getCurrentUserSubscription().subscribe(mySub => {
      if (mySub) {
        this.isSubscribed = mySub.status === 'ACTIVE';
        this.preferences = mySub.preferences || '';
        this.subscriberId = mySub.subscriberId;
      } else {
        this.isSubscribed = false;
        this.preferences = '';
        this.subscriberId = null;
      }
    });
  }

  triggerAvatarUpload(): void {
    if (this.avatarInput) {
      this.avatarInput.nativeElement.click();
    }
  }

  onAvatarSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.uploadAvatar(file);
    }
  }

  uploadAvatar(file: File): void {
    this.isUploadingAvatar = true;
    this.profileError = '';
    
    this.mediaService.uploadMedia(file).subscribe({
      next: (res) => {
        this.profileForm.patchValue({ avatarUrl: res.url });
        this.isUploadingAvatar = false;
        this.profileMessage = 'Avatar uploaded. Click Save to apply.';
      },
      error: (err) => {
        this.isUploadingAvatar = false;
        this.profileError = 'Failed to upload avatar.';
      }
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.isSavingProfile) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSavingProfile = true;
    this.profileMessage = '';
    this.profileError = '';

    const payload = {
      fullName: this.profileForm.getRawValue().fullName ?? '',
      bio: this.profileForm.getRawValue().bio ?? '',
      avatarUrl: this.profileForm.getRawValue().avatarUrl ?? ''
    };

    this.authService.updateProfile(payload).subscribe({
      next: (user) => {
        this.user = user;
        this.isSavingProfile = false;
        this.profileMessage = 'Profile updated successfully.';
      },
      error: (error) => {
        this.isSavingProfile = false;
        this.profileError = error?.message || 'Failed to update profile.';
      }
    });
  }

  updatePassword(): void {
    if (this.passwordForm.invalid || this.isSavingPassword) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { oldPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.passwordError = 'New password and confirmation must match.';
      this.passwordMessage = '';
      return;
    }

    this.isSavingPassword = true;
    this.passwordMessage = '';
    this.passwordError = '';

    this.authService.changePassword(oldPassword!, newPassword!).subscribe({
      next: () => {
        this.isSavingPassword = false;
        this.passwordMessage = 'Password updated successfully.';
        this.passwordForm.reset();
      },
      error: (error) => {
        this.isSavingPassword = false;
        this.passwordError = error?.message || 'Failed to update password.';
      }
    });
  }

  subscribe(): void {
    if (!this.user?.email) return;
    this.isSavingNewsletter = true;
    this.newsletterService.subscribe({ 
      email: this.user.email,
      fullName: this.user.fullName || undefined,
      preferences: this.preferences || undefined
    }).subscribe({
      next: () => {
        this.isSavingNewsletter = false;
        this.newsletterMessage = 'Subscription pending. Please check your email to confirm.';
        this.checkNewsletterStatus();
      },
      error: () => this.isSavingNewsletter = false
    });
  }

  saveNewsletterPreferences(): void {
    if (!this.subscriberId) return;
    this.isSavingNewsletter = true;
    this.newsletterService.updatePreferences({ preferences: this.preferences }).subscribe({
      next: () => {
        this.isSavingNewsletter = false;
        this.newsletterMessage = 'Preferences saved.';
      },
      error: () => this.isSavingNewsletter = false
    });
  }

  unsubscribe(): void {
    if (!this.user?.email) return;
    this.isSavingNewsletter = true;
    this.newsletterService.unsubscribeCurrentUser().subscribe({
      next: () => {
        this.isSavingNewsletter = false;
        this.isSubscribed = false;
        this.preferences = '';
        this.subscriberId = null;
        this.newsletterMessage = 'Unsubscribed successfully.';
      },
      error: () => this.isSavingNewsletter = false
    });
  }
}
