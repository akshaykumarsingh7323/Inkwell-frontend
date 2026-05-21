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
  showConfirmModal = false;
  confirmAction: 'approve' | 'reject' | null = null;
  selectedRequestId: number | null = null;

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

  openConfirmModal(action: 'approve' | 'reject', id: number): void {
    this.confirmAction = action;
    this.selectedRequestId = id;
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmAction = null;
    this.selectedRequestId = null;
  }

  executeConfirmAction(): void {
    if (!this.selectedRequestId || !this.confirmAction) return;

    const id = this.selectedRequestId;
    const action = this.confirmAction;

    this.closeConfirmModal();

    if (action === 'approve') {
      this.http.put(`${this.apiUrl}/${id}/approve`, {}).subscribe({
        next: () => {
          this.requests = this.requests.filter(r => r.id !== id);
        },
        error: (err) => {
          alert('Failed to approve request');
        }
      });
    } else if (action === 'reject') {
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
}
