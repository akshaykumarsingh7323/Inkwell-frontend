import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuditLog {
  id: number;
  actorId: number;
  action: string;
  entityType: string;
  entityId: number;
  details: string;
  timestamp: string;
}

export interface PagedAuditLogs {
  content: AuditLog[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AuditLogFilters {
  actorId?: number;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/audit-logs`;

  getAuditLogs(filters: AuditLogFilters = {}): Observable<PagedAuditLogs> {
    let params = new HttpParams();
    if (filters.actorId != null)  params = params.set('actorId',    filters.actorId.toString());
    if (filters.action)           params = params.set('action',     filters.action);
    if (filters.entityType)       params = params.set('entityType', filters.entityType);
    if (filters.from)             params = params.set('from',       filters.from);
    if (filters.to)               params = params.set('to',         filters.to);
    if (filters.page != null)     params = params.set('page',       filters.page.toString());
    if (filters.size != null)     params = params.set('size',       filters.size.toString());

    return this.http.get<PagedAuditLogs>(this.apiUrl, { params });
  }
}
