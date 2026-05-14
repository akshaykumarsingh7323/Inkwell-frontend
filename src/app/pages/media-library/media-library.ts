import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaService, MediaResponse } from '../../services/media.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationService } from '../../services/confirmation.service';

@Component({
  selector: 'app-media-library',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-library.html',
  styleUrl: './media-library.css',
})
export class MediaLibrary implements OnInit {
  private mediaService = inject(MediaService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);

  mediaItems: MediaResponse[] = [];
  isLoading = true;
  isUploading = false;
  uploadError = '';
  isAdminView = false;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.isAdminView = user?.role === 'ADMIN';
      if (user) {
        this.loadMedia();
      }
    });
  }

  loadMedia(): void {
    this.isLoading = true;
    this.uploadError = '';
    const request$ = this.isAdminView ? this.mediaService.getAllMedia() : this.mediaService.getMyMedia();
    request$.subscribe({
      next: (data) => {
        this.mediaItems = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.uploadError = error?.message || 'Failed to load media.';
        this.isLoading = false;
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.uploadFile(file);
      input.value = '';
    }
  }

  uploadFile(file: File): void {
    this.isUploading = true;
    this.uploadError = '';

    this.mediaService.uploadMedia(file).subscribe({
      next: (data) => {
        this.mediaItems.unshift(data);
        this.isUploading = false;
        this.toastService.success('Media uploaded successfully.');
      },
      error: (error) => {
        this.toastService.error(error?.message || 'Upload failed. Please try again.');
        this.isUploading = false;
      }
    });
  }

  async deleteMedia(id: number) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Media',
      message: 'Are you sure you want to delete this media item? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    });

    if (!confirmed) return;

    this.mediaService.deleteMedia(id).subscribe({
      next: () => {
        this.mediaItems = this.mediaItems.filter((item) => item.mediaId !== id);
        this.toastService.success('Media item deleted.');
      },
      error: (error) => {
        this.toastService.error(error?.message || 'Failed to delete media item.');
      }
    });
  }

  copyUrl(url: string): void {
    navigator.clipboard.writeText(url).catch(() => undefined);
  }

  formatKb(sizeKb: number): string {
    if (!Number.isFinite(sizeKb)) return '0 KB';
    if (sizeKb < 1024) return `${Math.round(sizeKb)} KB`;
    return `${(sizeKb / 1024).toFixed(2)} MB`;
  }

  updateAltText(item: MediaResponse, event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.uploadError = '';

    this.mediaService.updateAltText(item.mediaId, value).subscribe({
      next: (updated) => {
        item.altText = updated.altText;
        this.toastService.success('Alt text updated.');
      },
      error: (error) => {
        this.toastService.error(error?.message || 'Failed to update alt text.');
      }
    });
  }
}
