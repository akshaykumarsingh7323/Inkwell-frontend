import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface PostResponse {
  postId: number;
  authorId: number;
  authorName?: string;
  categoryId?: number;
  tagIds?: number[];
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImageUrl: string;
  status: string;
  readTimeMin: number;
  viewCount: number;
  likesCount: number;
  createdAt: string;
  updatedAt?: string;
  publishedAt: string;
  isLikedByCurrentUser?: boolean;
  isBookmarkedByCurrentUser?: boolean;
  commentsCount?: number;
  isPremium?: boolean;
  price?: number;
  accessUnlocked?: boolean;
}

export interface PostRequest {
  title: string;
  content: string;
  excerpt?: string;
  featuredImageUrl?: string;
  featuredImageMediaId?: number;
  categoryId?: number;
  tagIds?: number[];
  isPremium?: boolean;
  price?: number;
}

export interface TopViewedPost {
  postId: number;
  title: string;
  slug: string;
  authorId: number;
  viewCount: number;
  likesCount: number;
}

export interface TopAuthorAnalytics {
  authorId: number;
  totalViews: number;
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/posts`;

  getPublishedPosts(page = 0, size = 10): Observable<PageResponse<PostResponse>> {
    return this.http.get<PageResponse<PostResponse>>(`${this.apiUrl}/published?page=${page}&size=${size}`);
  }

  getPostBySlug(slug: string): Observable<PostResponse> {
    return this.http.get<PostResponse>(`${this.apiUrl}/slug/${slug}`);
  }

  getPostById(id: number): Observable<PostResponse> {
    return this.http.get<PostResponse>(`${this.apiUrl}/${id}`);
  }

  createPost(postData: PostRequest): Observable<PostResponse> {
    return this.http.post<PostResponse>(this.apiUrl, postData);
  }

  updatePost(id: number, postData: PostRequest): Observable<PostResponse> {
    return this.http.put<PostResponse>(`${this.apiUrl}/${id}`, postData);
  }

  deletePost(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  publishPost(id: number): Observable<PostResponse> {
    return this.http.put<PostResponse>(`${this.apiUrl}/${id}/publish`, {});
  }

  unpublishPost(id: number): Observable<PostResponse> {
    return this.http.put<PostResponse>(`${this.apiUrl}/${id}/unpublish`, {});
  }

  getPostsByAuthor(authorId: number | string, page = 0, size = 10): Observable<PageResponse<PostResponse>> {
    return this.http.get<PageResponse<PostResponse>>(`${this.apiUrl}/author/${authorId}?page=${page}&size=${size}`);
  }

  getPublishedPostsByAuthor(authorId: number | string, page = 0, size = 10): Observable<PageResponse<PostResponse>> {
    return this.http.get<PageResponse<PostResponse>>(`${this.apiUrl}/public/author/${authorId}?page=${page}&size=${size}`);
  }

  getPublishedPostsByCategory(categoryId: number, page = 0, size = 10): Observable<PageResponse<PostResponse>> {
    return this.http.get<PageResponse<PostResponse>>(`${this.apiUrl}/published/category/${categoryId}?page=${page}&size=${size}`);
  }

  getPublishedPostsByTag(tagId: number, page = 0, size = 10): Observable<PageResponse<PostResponse>> {
    return this.http.get<PageResponse<PostResponse>>(`${this.apiUrl}/published/tag/${tagId}?page=${page}&size=${size}`);
  }

  getPostCountByAuthor(authorId: number | string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count/${authorId}`);
  }

  searchPosts(keyword: string, page = 0, size = 10): Observable<PageResponse<PostResponse>> {
    return this.http.get<PageResponse<PostResponse>>(`${this.apiUrl}/search?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`);
  }

  incrementViews(postId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${postId}/view`, {});
  }

  likePost(postId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${postId}/like`, {});
  }

  unlikePost(postId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${postId}/unlike`, {});
  }

  bookmarkPost(postId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${postId}/bookmark`, {});
  }

  unbookmarkPost(postId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${postId}/unbookmark`, {});
  }

  getRelatedPosts(postId: number): Observable<PostResponse[]> {
    // Temporary mock since backend doesn't have /related endpoint yet
    return of([]);
  }

  getTopViewedPosts(): Observable<TopViewedPost[]> {
    return this.http.get<TopViewedPost[]>(`${this.apiUrl}/analytics/top-viewed`);
  }

  getTopAuthors(): Observable<TopAuthorAnalytics[]> {
    return this.http.get<TopAuthorAnalytics[]>(`${this.apiUrl}/analytics/top-authors`);
  }

  getTrendingPosts(): Observable<PostResponse[]> {
    return this.http.get<PostResponse[]>(`${this.apiUrl}/public/trending`);
  }

  explorePosts(params: {
    sort?: string;
    categoryId?: number;
    tagId?: number;
    keyword?: string;
    page?: number;
    size?: number;
  }): Observable<PageResponse<PostResponse>> {
    const { sort = 'latest', categoryId, tagId, keyword, page = 0, size = 10 } = params;
    let url = `${this.apiUrl}/explore?sort=${sort}&page=${page}&size=${size}`;
    if (categoryId) url += `&categoryId=${categoryId}`;
    if (tagId) url += `&tagId=${tagId}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
    return this.http.get<PageResponse<PostResponse>>(url);
  }
}
