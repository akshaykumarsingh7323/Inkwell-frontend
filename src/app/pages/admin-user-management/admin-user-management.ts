import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuthResponse } from '../../models/user.model';
import { Router } from '@angular/router';
import { catchError, of, timeout } from 'rxjs';

@Component({
  selector: 'app-admin-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-user-management.html',
  styleUrl: './admin-user-management.css',
})
export class AdminUserManagement implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  // State using Signals
  users = signal<AuthResponse[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');
  searchQuery = signal<string>('');
  currentRoleFilter = signal<'ALL' | 'READER' | 'AUTHOR' | 'ADMIN' | 'DELETED'>('ALL');
  selectedUser = signal<AuthResponse | null>(null);
  deletedUsers = signal<AuthResponse[]>([]);

  currentUser$ = this.authService.currentUser$;

  // Computed signal for filtered users
  filteredUsers = computed(() => {
    const filter = this.currentRoleFilter();
    const query = this.searchQuery().toLowerCase().trim();

    let filtered = filter === 'DELETED' ? this.deletedUsers() : this.users();

    if (filter !== 'ALL' && filter !== 'DELETED') {
      filtered = filtered.filter(u => u.role?.toUpperCase() === filter);
    }

    if (query) {
      filtered = filtered.filter(u => 
        u.username?.toLowerCase().includes(query) || 
        u.fullName?.toLowerCase().includes(query) || 
        u.email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  showDeleteModal = signal<boolean>(false);
  userToDelete = signal<AuthResponse | null>(null);

  showProtectionModal = signal<boolean>(false);
  protectionMessage = signal<{title: string, message: string}>({title: '', message: ''});

  ngOnInit(): void {
    const savedDeleted = localStorage.getItem('deletedUsers');
    if (savedDeleted) {
      try {
        this.deletedUsers.set(JSON.parse(savedDeleted));
      } catch (e) {
        console.error('Error parsing deleted users', e);
      }
    }
    this.loadUsers();
  }

  loadUsers(keyword: string = ''): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    console.log(`Loading users with keyword: "${keyword}"`);

    const request$ = keyword.trim() ? 
      this.authService.searchUsers(keyword) : 
      this.authService.getAllUsers();

    request$.pipe(
      timeout(60000),
      catchError((error) => {
        console.error('Error fetching users:', error);
        this.errorMessage.set('An error occurred while loading data. Please try again later.');
        this.isLoading.set(false);
        return of([]);
      })
    ).subscribe((data: any) => {
      console.log('Users fetch result:', data);
      const userList = Array.isArray(data) ? data : data?.content || [];
      this.users.set(userList);
      this.isLoading.set(false);
    });
  }

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    if (query.length > 2 || query.length === 0) {
      this.loadUsers(query);
    }
  }

  updateStatus(user: AuthResponse, active: boolean): void {
    if (user.role === 'ADMIN' && !active) {
      this.protectionMessage.set({
        title: 'System Protection',
        message: 'Security Protocol: Admin accounts cannot be deactivated to maintain system integrity and administrative access.'
      });
      this.showProtectionModal.set(true);
      return;
    }

    this.authService.updateUserStatus(user.userId, active).subscribe({
      next: (updatedUser) => {
        this.users.update(current => 
          current.map(u => u.userId === updatedUser.userId ? updatedUser : u)
        );
      },
      error: (err) => {
        console.error('Status update failed:', err);
        this.errorMessage.set('Failed to update user status.');
      }
    });
  }

  updateRole(user: AuthResponse, event: Event): void {
    const role = (event.target as HTMLSelectElement).value;
    this.authService.updateUserRole(user.userId, role).subscribe({
      next: (updatedUser) => {
        this.users.update(current => 
          current.map(u => u.userId === updatedUser.userId ? updatedUser : u)
        );
      }
    });
  }

  requestDelete(user: AuthResponse): void {
    if (user.role === 'ADMIN') {
      this.protectionMessage.set({
        title: 'Identity Protection',
        message: 'Security Protocol: Admin accounts cannot be deleted. This identity is vital to the system registry and cannot be removed.'
      });
      this.showProtectionModal.set(true);
      return;
    }
    this.userToDelete.set(user);
    this.showDeleteModal.set(true);
  }

  closeProtectionModal(): void {
    this.showProtectionModal.set(false);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.userToDelete.set(null);
  }

  confirmDelete(): void {
    const user = this.userToDelete();
    if (!user) return;

    this.authService.deleteUser(user.userId).subscribe({
      next: () => {
        this.users.update(current => current.filter(u => u.userId !== user.userId));
        this.deletedUsers.update(current => {
          const updated = [...current, user];
          localStorage.setItem('deletedUsers', JSON.stringify(updated));
          return updated;
        });
        this.showDeleteModal.set(false);
        this.userToDelete.set(null);
        this.closeDetails();
        this.errorMessage.set(''); // Clear any previous error
      },
      error: (err) => {
        console.error('Delete failed:', err);
        const msg = err.message || 'Failed to delete user. Please try again.';
        this.errorMessage.set(msg);
        this.showDeleteModal.set(false);
      }
    });
  }

  viewUser(user: AuthResponse): void {
    this.selectedUser.set(user);
  }

  closeDetails(): void {
    this.selectedUser.set(null);
  }

  viewAuthorPosts(userId: string | number): void {
    this.router.navigate(['/admin-posts'], { queryParams: { authorId: userId } });
    this.closeDetails();
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
