import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AuthorRequest {
  id: number;
  userId: number;
  username: string;
  phoneNumber: string;
  status: string;
  createdAt: string;
  userEmail: string;
  userFullName: string;
}

@Component({
  selector: 'app-admin-author-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-author-requests.html',
  styleUrl: './admin-author-requests.css'
})
export class AdminAuthorRequests implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/auth/author-requests`;

  requests: AuthorRequest[] = [];
  isLoading = true;
  error: string | null = null;

  ngOnInit(): void {
    this.fetchRequests();
  }

  fetchRequests(): void {
    this.isLoading = true;
    this.error = null;
    this.http.get<AuthorRequest[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.requests = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load requests';
        this.isLoading = false;
      }
    });
  }

  approveRequest(id: number): void {
    if (!confirm('Are you sure you want to approve this request?')) return;
    this.http.put(`${this.apiUrl}/${id}/approve`, {}).subscribe({
      next: () => {
        this.requests = this.requests.filter(r => r.id !== id);
      },
      error: (err) => {
        alert('Failed to approve request');
      }
    });
  }

  rejectRequest(id: number): void {
    if (!confirm('Are you sure you want to reject this request?')) return;
    this.http.put(`${this.apiUrl}/${id}/reject`, {}).subscribe({
      next: () => {
        this.requests = this.requests.filter(r => r.id !== id);
      },
      error: (err) => {
        alert('Failed to reject request');
      }
    });
  }
}
