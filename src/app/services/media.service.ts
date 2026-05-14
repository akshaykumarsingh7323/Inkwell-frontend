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

  uploadMedia(file: File): Observable<MediaResponse> {
    return this.getUserId().pipe(
      switchMap(() => {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<MediaResponse>(`${this.apiUrl}/upload`, formData);
      })
    );
  }

  getMediaById(id: number): Observable<MediaResponse> {
    return this.http.get<MediaResponse>(`${this.apiUrl}/${id}`);
  }

  getMediaByUploader(uploaderId: number): Observable<MediaResponse[]> {
    return this.http.get<MediaResponse[]>(`${this.apiUrl}/uploader/${uploaderId}`);
  }

  getMyMedia(): Observable<MediaResponse[]> {
    return this.getUserId().pipe(
      switchMap((userId) => this.getMediaByUploader(userId))
    );
  }

  getMediaByPost(postId: number): Observable<MediaResponse[]> {
    return this.http.get<MediaResponse[]>(`${this.apiUrl}/post/${postId}`);
  }

  getAllMedia(): Observable<MediaResponse[]> {
    return this.http.get<MediaResponse[]>(this.apiUrl);
  }

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
