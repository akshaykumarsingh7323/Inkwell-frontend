import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';
import { AuditService, AuditLog, AuditLogFilters } from '../../services/audit.service';
import { Router } from '@angular/router';
import { catchError, of, timeout } from 'rxjs';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.css',
})
export class AuditLogs implements OnInit {
  private auditService = inject(AuditService);
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser$ = this.authService.currentUser$;

  logs: AuditLog[] = [];
  isLoading = true;
  errorMessage = '';

  // Filters
  filters: AuditLogFilters = { page: 0, size: 20 };
  actorIdInput = '';
  actionInput = '';
  entityTypeInput = '';
  fromInput = '';
  toInput = '';

  // Pagination
  totalPages = 0;
  currentPage = 0;

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.filters = {
      page: this.currentPage,
      size: 20,
      actorId: this.actorIdInput ? Number(this.actorIdInput) : undefined,
      action: this.actionInput || undefined,
      entityType: this.entityTypeInput || undefined,
      from: this.fromInput ? this.fromInput + ':00' : undefined,
      to: this.toInput ? this.toInput + ':00' : undefined,
    };

    this.auditService.getAuditLogs(this.filters).pipe(
      timeout(5000),
      catchError((error) => {
        console.error('Audit sync error:', error);
        this.errorMessage = 'Failed to sync platform audit timeline. Please check if the Audit Service is running.';
        this.isLoading = false;
        return of({ content: [], totalPages: 0 });
      })
    ).subscribe({
      next: (data) => {
        this.logs = data.content;
        this.totalPages = data.totalPages;
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadLogs();
  }

  clearFilters(): void {
    this.actorIdInput = '';
    this.actionInput = '';
    this.entityTypeInput = '';
    this.fromInput = '';
    this.toInput = '';
    this.currentPage = 0;
    this.loadLogs();
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadLogs();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadLogs();
    }
  }

  formatDate(ts: string): string {
    return ts ? new Date(ts).toLocaleString() : '-';
  }

  getActionClass(action: string): string {
    if (!action) return '';
    if (action.includes('DELETE') || action.includes('SUSPEND')) return 'badge-danger';
    if (action.includes('UPDATE') || action.includes('APPROVE') || action.includes('REJECT')) return 'badge-warning';
    if (action.includes('CREATE') || action.includes('PUBLISH') || action.includes('SEND')) return 'badge-success';
    return 'badge-info';
  }

  goToProfile(): void {
    const user = this.authService.getCurrentUserSnapshot();
    if (user?.userId) {
      this.router.navigate(['/author', user.userId]);
    } else {
      this.router.navigate(['/admin']);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
