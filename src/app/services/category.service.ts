import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CategoryResponse {
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  postCount: number;
  parentCategoryId?: number;
  createdAt?: string;
}

export interface TagResponse {
  tagId: number;
  name: string;
  slug: string;
  postCount: number;
  createdAt?: string;
}

export interface CategoryTreeResponse {
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  postCount: number;
  children: CategoryTreeResponse[];
}

export interface CategoryRequest {
  name: string;
  description: string;
  parentCategoryId?: number | null;
}

export interface TagRequest {
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  getCategories(): Observable<CategoryResponse[]> {
    return this.http.get<CategoryResponse[]>(`${this.apiUrl}/categories`);
  }

  getCategoryTree(): Observable<CategoryTreeResponse[]> {
    return this.http.get<CategoryTreeResponse[]>(`${this.apiUrl}/categories/tree`);
  }

  getCategoryBySlug(slug: string): Observable<CategoryResponse> {
    return this.http.get<CategoryResponse>(`${this.apiUrl}/categories/slug/${slug}`);
  }

  createCategory(request: CategoryRequest): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(`${this.apiUrl}/categories`, request);
  }

  createCategoryWithParent(name: string, description: string, parentCategoryId: number | null): Observable<CategoryResponse> {
    return this.createCategory({ name, description, parentCategoryId });
  }

  updateCategory(id: number, request: CategoryRequest): Observable<CategoryResponse> {
    return this.http.put<CategoryResponse>(`${this.apiUrl}/categories/${id}`, request);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categories/${id}`);
  }

  getTrendingTags(): Observable<TagResponse[]> {
    return this.http.get<TagResponse[]>(`${this.apiUrl}/tags/trending`);
  }

  getAllTags(): Observable<TagResponse[]> {
    return this.http.get<TagResponse[]>(`${this.apiUrl}/tags`);
  }

  getTagBySlug(slug: string): Observable<TagResponse> {
    return this.http.get<TagResponse>(`${this.apiUrl}/tags/slug/${slug}`);
  }

  createTag(request: string | TagRequest): Observable<TagResponse> {
    const payload = typeof request === 'string' ? { name: request } : request;
    return this.http.post<TagResponse>(`${this.apiUrl}/tags`, payload);
  }

  deleteTag(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tags/${id}`);
  }

  getTagsByPost(postId: number): Observable<TagResponse[]> {
    return this.http.get<TagResponse[]>(`${this.apiUrl}/tags/post/${postId}`);
  }

  getPostIdsByTag(tagId: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/tags/${tagId}/posts`);
  }

  addTagToPost(tagId: number, postId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/tags/${tagId}/post/${postId}`, {});
  }

  removeTagFromPost(tagId: number, postId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tags/${tagId}/post/${postId}`);
  }

  searchTags(keyword: string): Observable<TagResponse[]> {
    return this.http.get<TagResponse[]>(`${this.apiUrl}/tags/search`, {
      params: { keyword }
    });
  }

  incrementCategoryPostCount(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/categories/${id}/increment-count`, {});
  }

  decrementCategoryPostCount(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/categories/${id}/decrement-count`, {});
  }
}
