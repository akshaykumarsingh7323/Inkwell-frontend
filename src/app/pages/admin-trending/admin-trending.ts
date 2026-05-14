import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-admin-trending',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="trending-content">
      <div class="page-header">
        <div class="header-main">
          <h1 class="page-title">Trending Content Analysis</h1>
          <p class="page-subtitle">Real-time insights into the platform's most engaging and high-velocity publications.</p>
        </div>
      </div>

      <div class="data-panel">
        <div class="empty-state">
          <div class="empty-icon">📈</div>
          <div class="empty-text">Trending metrics are being calculated in the cosmic background.</div>
          <p class="empty-hint">Check back soon for high-velocity engagement data.</p>
        </div>
      </div>
    </main>
  `,
  styles: [`
    .trending-content {
      padding: 40px;
      animation: fadeIn 0.5s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .page-header {
      margin-bottom: 40px;
    }

    .page-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: #004643;
      margin-bottom: 8px;
    }

    .page-subtitle {
      color: #64748b;
      font-size: 1.1rem;
    }

    .data-panel {
      background: white;
      border-radius: 24px;
      padding: 60px 40px;
      border: 1px solid #f1f5f9;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .empty-state {
      text-align: center;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 24px;
    }

    .empty-text {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
    }

    .empty-hint {
      color: #94a3b8;
      font-size: 1rem;
    }
  `]
})
export class AdminTrending implements OnInit {
  private authService = inject(AuthService);
  private postService = inject(PostService);

  ngOnInit(): void {}
}
