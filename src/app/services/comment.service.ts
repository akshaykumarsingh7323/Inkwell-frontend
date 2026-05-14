import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CommentRequest {
  postId: number;
  content: string;
  parentId?: number;
}

export interface CommentResponse {
  commentId: number;
  postId: number;
  authorId: number;
  parentId?: number;
  content: string;
  status: string;
  likesCount: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCommentRequest {
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrl = `${environment.apiBaseUrl}/comments`;

  constructor(private http: HttpClient) {}

  createComment(request: CommentRequest): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(this.apiUrl, request);
  }

  getCommentsByPost(postId: number): Observable<CommentResponse[]> {
    return this.http.get<CommentResponse[]>(`${this.apiUrl}/post/${postId}`);
  }

  getPendingComments(): Observable<CommentResponse[]> {
    return this.http.get<CommentResponse[]>(`${this.apiUrl}/pending`);
  }

  getPendingCommentsForModerator(): Observable<CommentResponse[]> {
    return this.http.get<CommentResponse[]>(`${this.apiUrl}/pending/mine`);
  }

  approveComment(id: number): Observable<CommentResponse> {
    return this.http.put<CommentResponse>(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectComment(id: number): Observable<CommentResponse> {
    return this.http.put<CommentResponse>(`${this.apiUrl}/${id}/reject`, {});
  }

  deleteComment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateComment(id: number, request: UpdateCommentRequest): Observable<CommentResponse> {
    return this.http.put<CommentResponse>(`${this.apiUrl}/${id}`, request);
  }

  deleteOwnComment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  moderateComment(id: number, action: 'APPROVE' | 'REJECT' | 'DELETE'): Observable<CommentResponse> {
    return this.http.patch<CommentResponse>(`${this.apiUrl}/${id}/moderate`, { action });
  }

  likeComment(id: number): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(`${this.apiUrl}/${id}/like`, {});
  }

  unlikeComment(id: number): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(`${this.apiUrl}/${id}/unlike`, {});
  }
}
