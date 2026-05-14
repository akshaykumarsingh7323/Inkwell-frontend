import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Home } from './pages/home/home';
import { PostDetail } from './pages/post-detail/post-detail';
import { Register } from './pages/register/register';
import { authGuard } from './guards/auth.guard';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { ResetPassword } from './pages/reset-password/reset-password';
import { Search } from './pages/search/search';
import { CategoryPage } from './pages/category-page/category-page';
import { TagPage } from './pages/tag-page/tag-page';
import { ReaderSettings } from './pages/reader-settings/reader-settings';
import { MediaLibrary } from './pages/media-library/media-library';
import { AdminUserManagement } from './pages/admin-user-management/admin-user-management';
import { AdminPostManagement } from './pages/admin-post-management/admin-post-management';
import { AdminCommentManagement } from './pages/admin-comment-management/admin-comment-management';
import { AdminTaxonomyManagement } from './pages/admin-taxonomy-management/admin-taxonomy-management';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { AdminSubscribers } from './pages/admin-subscribers/admin-subscribers';
import { guestGuard } from './guards/guest.guard';
import { roleGuard } from './guards/role.guard';
import { Notifications } from './pages/notifications/notifications';
import { NewsletterManagement } from './pages/newsletter-management/newsletter-management';
import { MyPosts } from './pages/my-posts/my-posts';
import { OAuthCallbackComponent } from './pages/oauth-callback/oauth-callback';
import { AuthorDashboardComponent } from './pages/author-dashboard/author-dashboard';
import { AuthorProfilePageComponent } from './pages/author-profile-page/author-profile-page';
import { CreatePostComponent } from './pages/create-post/create-post';
import { EditPostComponent } from './pages/edit-post/edit-post';
import { PostAnalytics } from './pages/post-analytics/post-analytics';
import { MediaUploadComponent } from './pages/media-upload/media-upload';
import { ContentModerationComponent } from './pages/content-moderation/content-moderation';
import { AuditLogs } from './pages/audit-logs/audit-logs';
import { SelectRole } from './pages/select-role/select-role';
import { CommentModeration } from './pages/comment-moderation/comment-moderation';
import { BecomeAuthor } from './pages/become-author/become-author';
import { Followers } from './pages/followers/followers';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';
import { RoleLandingComponent } from './pages/role-landing/role-landing';
import { NewsletterConfirm } from './pages/newsletter-confirm/newsletter-confirm';
import { NewsletterUnsubscribe } from './pages/newsletter-unsubscribe/newsletter-unsubscribe';
import { NewsletterLanding } from './pages/newsletter-landing/newsletter-landing';
import { MyPurchases } from './pages/my-purchases/my-purchases';
import { AdminRevenueDashboard } from './pages/admin-revenue-dashboard/admin-revenue-dashboard';
import { AdminTrending } from './pages/admin-trending/admin-trending';

export const routes: Routes = [
  { 
    path: '', 
    component: MainLayoutComponent,
    children: [
      { path: '', component: RoleLandingComponent },
      { path: 'home', component: Home },
      { path: 'explore', component: Search },
      { path: 'post/:slug', component: PostDetail },
      { path: 'newsletter', component: NewsletterLanding },
      { path: 'newsletter/confirm', component: NewsletterConfirm },
      { path: 'newsletter/unsubscribe', component: NewsletterUnsubscribe },
      { 
        path: 'newsletter-management', 
        component: NewsletterManagement, 
        canActivate: [authGuard, roleGuard(['ADMIN', 'AUTHOR'])] 
      },
      { path: 'author-dashboard', component: AuthorDashboardComponent, canActivate: [authGuard, roleGuard(['AUTHOR'])] },
      { path: 'author/posts/new', redirectTo: 'create-post', pathMatch: 'full' },
      { path: 'author/posts', redirectTo: 'my-posts', pathMatch: 'full' },
      { path: 'author/comments', redirectTo: 'comment-moderation', pathMatch: 'full' },
      { path: 'author/media', redirectTo: 'media-library', pathMatch: 'full' },
      { path: 'author/analytics', redirectTo: 'post-analytics', pathMatch: 'full' },
      { path: 'create-post', component: CreatePostComponent, canActivate: [authGuard, roleGuard(['AUTHOR', 'ADMIN'])] },
      { path: 'edit-post/:id', component: EditPostComponent, canActivate: [authGuard, roleGuard(['AUTHOR', 'ADMIN'])] },
      { path: 'my-posts', component: MyPosts, canActivate: [authGuard, roleGuard(['AUTHOR', 'ADMIN'])] },
      { path: 'post-analytics', component: PostAnalytics, canActivate: [authGuard, roleGuard(['AUTHOR', 'ADMIN'])] },
      { path: 'comment-moderation', component: CommentModeration, canActivate: [authGuard, roleGuard(['AUTHOR', 'ADMIN'])] },
      { path: 'followers', component: Followers, canActivate: [authGuard, roleGuard(['AUTHOR', 'ADMIN'])] },
      { path: 'notifications', component: Notifications, canActivate: [authGuard] },
      { path: 'reader-settings', component: ReaderSettings, canActivate: [authGuard] },
      { path: 'media-upload', component: MediaUploadComponent, canActivate: [authGuard, roleGuard(['AUTHOR', 'ADMIN'])] },
      { path: 'media-library', component: MediaLibrary, canActivate: [authGuard, roleGuard(['AUTHOR', 'ADMIN'])] },
      { path: 'admin', component: AdminDashboard, canActivate: [authGuard, roleGuard(['ADMIN'])] },
      { path: 'admin-dashboard', component: AdminDashboard, canActivate: [authGuard, roleGuard(['ADMIN'])] },
      { path: 'admin-subscribers', component: AdminSubscribers, canActivate: [authGuard, roleGuard(['ADMIN'])] },
      { path: 'user-management', component: AdminUserManagement, canActivate: [authGuard, roleGuard(['ADMIN'])] },
      { path: 'admin-posts', component: AdminPostManagement, canActivate: [authGuard, roleGuard(['ADMIN'])] },
      { path: 'admin-comments', component: AdminCommentManagement, canActivate: [authGuard, roleGuard(['ADMIN'])] },
      { path: 'admin-categories', component: AdminTaxonomyManagement, canActivate: [authGuard, roleGuard(['ADMIN'])] },
      { path: 'audit-logs', component: AuditLogs, canActivate: [authGuard, roleGuard(['ADMIN'])] },
      { path: 'admin-revenue', component: AdminRevenueDashboard, canActivate: [authGuard, roleGuard(['ADMIN'])] },
      { path: 'admin-trending', component: AdminTrending, canActivate: [authGuard, roleGuard(['ADMIN'])] },
      { path: 'my-purchases', component: MyPurchases, canActivate: [authGuard] },
      { path: 'author/:userId', component: AuthorProfilePageComponent },
      { path: 'category/:slug', component: CategoryPage },
      { path: 'tag/:slug', component: TagPage },
    ]
  },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'register', component: Register, canActivate: [guestGuard] },
  { path: 'select-role', component: SelectRole },
  { path: 'become-author', component: BecomeAuthor, canActivate: [authGuard] },
  { path: 'oauth/callback', component: OAuthCallbackComponent },
  { path: 'login-success', component: OAuthCallbackComponent },
  { path: 'forgot-password', component: ForgotPassword, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPassword, canActivate: [guestGuard] },

  { path: 'post-editor', redirectTo: 'create-post', pathMatch: 'full' },
  { path: 'post-editor/:id', redirectTo: 'edit-post/:id', pathMatch: 'full' },
  { path: 'dashboard', redirectTo: '', pathMatch: 'full' },
  { path: 'analytics', redirectTo: 'post-analytics', pathMatch: 'full' },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];
