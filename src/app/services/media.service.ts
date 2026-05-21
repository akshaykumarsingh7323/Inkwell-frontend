import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, take, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface MediaResponse {
  mediaId: number;
  uploaderId: number;
  filename: string;
  originalName: string;
  /** Relative URL returned by the backend, e.g. /media/files/abc123.jpg */
  url: string;
  mimeType: string;
  sizeKb: number;
  altText: string;
  linkedPostId?: number;
  deleted?: boolean;
  uploadedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private apiUrl = `${environment.apiBaseUrl}/media`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  // ---------------------------------------------------------------------------
  // URL helper
  // ---------------------------------------------------------------------------

  /**
   * Converts the relative URL stored in MediaResponse.url into an absolute URL
   * that the browser can fetch directly.
   *
   * The backend returns paths like `/media/files/<filename>`.
   * Through the API gateway proxy at `/api/v1`, this becomes:
   *   `http://localhost:4200/api/v1/media/files/<filename>`
   * which the Angular dev-server proxy forwards to:
   *   `http://localhost:8080/api/v1/media/files/<filename>`
   *
   * If the URL is already absolute (starts with http/https) it is returned as-is,
   * which keeps compatibility with any previously stored S3 URLs.
   */
  resolveMediaUrl(relativeUrl: string): string {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl; // already absolute (e.g. old S3 URL stored in DB)
    }
    const cleanBase = (environment.apiBaseUrl || '/api/v1').replace(/\/$/, '');
    const cleanPath = relativeUrl.startsWith('/') ? relativeUrl : '/' + relativeUrl;

    // Older records may store `/uploads/...` while newer ones store `/media/files/...`.
    // Both should be routed through the media service.
    if (cleanPath.startsWith('/uploads/')) {
      return `${cleanBase}/media${cleanPath}`;
    }

    if (cleanPath.startsWith('/media/')) {
      return `${cleanBase}${cleanPath}`;
    }

    return `${cleanBase}/media/files${cleanPath}`;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getUserId(): Observable<number> {
    return this.authService.currentUser$.pipe(
      take(1),
      map((user) => {
        if (!user?.userId) {
          throw new Error('User not authenticated');
        }
        return Number(user.userId);
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------

  uploadMedia(file: File): Observable<MediaResponse> {
    return this.getUserId().pipe(
      switchMap(() => {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<MediaResponse>(`${this.apiUrl}/upload`, formData);
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  getMediaById(id: number): Observable<MediaResponse> {
    return this.http.get<MediaResponse>(`${this.apiUrl}/${id}`);
  }

  getMediaByUploader(uploaderId: number): Observable<MediaResponse[]> {
    return this.http.get<MediaResponse[]>(`${this.apiUrl}/uploader/${uploaderId}`).pipe(
      map((items) => items.filter((item) => Number(item.uploaderId) === Number(uploaderId)))
    );
  }

  getMyMedia(): Observable<MediaResponse[]> {
    return this.getUserId().pipe(
      switchMap((userId) =>
        this.getMediaByUploader(userId).pipe(
          map((items) => items.filter((item) => Number(item.uploaderId) === Number(userId)))
        )
      )
    );
  }

  getMediaByPost(postId: number): Observable<MediaResponse[]> {
    return this.http.get<MediaResponse[]>(`${this.apiUrl}/post/${postId}`);
  }

  getAllMedia(): Observable<MediaResponse[]> {
    return this.http.get<MediaResponse[]>(this.apiUrl);
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  updateAltText(id: number, altText: string): Observable<MediaResponse> {
    return this.http.put<MediaResponse>(`${this.apiUrl}/${id}/alt-text`, null, { params: { altText } });
  }

  linkToPost(id: number, postId: number): Observable<MediaResponse> {
    return this.http.post<MediaResponse>(`${this.apiUrl}/${id}/link/${postId}`, {});
  }

  unlinkFromPost(id: number): Observable<MediaResponse> {
    return this.http.post<MediaResponse>(`${this.apiUrl}/${id}/unlink`, {});
  }

  deleteMedia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
