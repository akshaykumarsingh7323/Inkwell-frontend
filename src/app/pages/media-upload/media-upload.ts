import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../../components/sidebar/sidebar';
import { MediaService } from '../../services/media.service';

@Component({
  selector: 'app-media-upload',
  standalone: true,
  imports: [CommonModule, Sidebar],
  templateUrl: './media-upload.html',
  styleUrl: './media-upload.css'
})
export class MediaUploadComponent {
  private mediaService = inject(MediaService);

  uploadStatus = '';
  isUploading = false;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.isUploading = true;
    this.uploadStatus = '';

    this.mediaService.uploadMedia(file).subscribe({
      next: () => {
        this.uploadStatus = 'Media uploaded successfully.';
        this.isUploading = false;
      },
      error: () => {
        this.uploadStatus = 'Upload failed.';
        this.isUploading = false;
      }
    });
  }
}
