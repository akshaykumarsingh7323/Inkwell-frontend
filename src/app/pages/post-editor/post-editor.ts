import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthorStudioShell } from '../../components/author-studio-shell/author-studio-shell';
import { PostService, PostRequest } from '../../services/post.service';
import { CategoryService, CategoryResponse, TagResponse } from '../../services/category.service';
import { MediaService } from '../../services/media.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { PromptService } from '../../services/prompt.service';
import { AuthResponse } from '../../models/user.model';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, interval, Subscription, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime } from 'rxjs/operators';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './post-editor.html',
  styleUrl: './post-editor.css',
})
export class PostEditor implements OnInit, OnDestroy, AfterViewInit {
  private authService = inject(AuthService);
  private postService = inject(PostService);
  private categoryService = inject(CategoryService);
  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private promptService = inject(PromptService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('editorContainer') editorContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('inlineImageInput') inlineImageInput!: ElementRef<HTMLInputElement>;

  editor: Editor | null = null;
  postId: number | null = null;
  postTitle: string = '';
  postContent: string = '';
  postExcerpt: string = '';
  postSlug: string = '';
  /**
   * Raw URL stored in the database (may be relative, e.g. /media/files/abc.jpg).
   * Always use featuredImagePreviewUrl in templates so the browser gets an absolute URL.
   */
  featuredImageUrl: string = '';
  isPremium: boolean = false;
  price: number = 0;
  
  categories: CategoryResponse[] = [];
  selectedCategoryId: number | null = null;
  
  allTags: TagResponse[] = [];
  selectedTags: TagResponse[] = [];
  tagInput: string = '';

  userMedia: any[] = [];
  featuredImageMediaId: number | null = null;
  currentUser$: Observable<AuthResponse | null> = this.authService.currentUser$;
  profileOpen = signal(false);

  isSaving: boolean = false;
  isUploading: boolean = false;
  /** True when the browser fired an error event for the featured image src */
  imageLoadFailed: boolean = false;
  /** True while the browser is fetching the image after upload (before load/error fires) */
  imageLoading: boolean = false;
  lastSaved: Date | null = null;
  tagError = '';
  errorMessage = '';
  statusMessage = '';
  currentStatus: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' = 'DRAFT';
  showPublishModal = false;

  private lastSavedContent: string = '';
  private lastSavedTitle: string = '';
  private autoSaveSub?: Subscription;
  private autoSave$ = new Subject<void>();

  ngOnInit(): void {
    this.refreshCurrentUser();
    forkJoin({
      categories: this.categoryService.getCategories().pipe(catchError(() => of([]))),
      tags: this.categoryService.getAllTags().pipe(catchError(() => of([]))),
      media: this.mediaService.getMyMedia().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ categories, tags, media }) => {
        this.categories = categories;
        this.allTags = tags;
        this.userMedia = media;

        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
          this.postId = +id;
          this.loadPost(this.postId);
        }
      },
      error: (error) => {
        this.errorMessage = error?.message || 'Failed to load editor metadata.';
      }
    });

    // Auto-save 3 seconds after the user stops typing/changing content
    this.autoSaveSub = this.autoSave$.pipe(
      debounceTime(3000)
    ).subscribe(() => {
      if (this.shouldAutoSave()) {
        this.saveDraft();
      }
    });

    // Recovery logic: if on /create-post and no ID, check for last draft
    const path = this.router.url;
    if (path.includes('/create-post') && !this.postId) {
      const savedId = localStorage.getItem('last_draft_id');
      if (savedId) {
        // Verify if the draft actually exists and is still a draft before showing the message
        this.postService.getPostById(+savedId).subscribe({
          next: (post) => {
            if (post.status === 'DRAFT') {
              this.statusMessage = 'You have a recent draft. Go to "My Posts" to continue writing.';
            } else {
              // If it's already published, it's not a "recent draft" anymore
              localStorage.removeItem('last_draft_id');
            }
          },
          error: () => {
            // If the post was deleted or not found, clear the stale ID
            localStorage.removeItem('last_draft_id');
            this.statusMessage = '';
          }
        });
      }
    }
  }

  private shouldAutoSave(): boolean {
    const hasContent = this.postTitle?.trim() || (this.postContent && this.postContent !== '<p></p>');
    const isDirty = this.postTitle !== this.lastSavedTitle || this.postContent !== this.lastSavedContent;
    return !!hasContent && isDirty && !this.isSaving && !this.isUploading;
  }

  isDirty(): boolean {
    return this.postTitle !== this.lastSavedTitle || this.postContent !== this.lastSavedContent;
  }

  ngAfterViewInit(): void {
    this.initEditor();
  }

  refreshCurrentUser(): void {
    this.authService.getCurrentUser().subscribe();
  }

  toggleProfile(): void {
    this.profileOpen.update(v => !v);
  }

  logout(): void {
    this.authService.logout();
  }

  /** Auto-grow title / subtitle textareas as the user types */
  autoResizeTitle(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';

    // Reactive error clearing
    if (this.errorMessage.includes('title') && this.postTitle.trim().length >= 5) {
      this.errorMessage = '';
    }

    // Clear recovery message if they start a new post
    if (this.statusMessage.includes('recent draft')) {
      this.statusMessage = '';
    }

    this.autoSave$.next();
  }

  initEditor(): void {
    this.editor = new Editor({
      element: this.editorContainer.nativeElement,
      extensions: [
        StarterKit.configure({
          // Disable StarterKit's bundled link/underline so our configured
          // versions below are the sole registered instances (avoids duplicate
          // extension warning from TipTap).
          link: false,
          underline: false,
        }),
        Highlight,
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        }),
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
        Placeholder.configure({
          placeholder: 'Start writing your story...',
        }),
      ],
      content: this.postContent,
      onUpdate: ({ editor }) => {
        this.postContent = editor.getHTML();
        
        // Reactive error clearing for content
        const plainText = (this.postContent || '').replace(/<[^>]*>/g, '').trim();
        if (this.errorMessage.includes('content') && plainText.length >= 10) {
          this.errorMessage = '';
        }

        // Clear recovery message if they start typing content
        if (this.statusMessage.includes('recent draft')) {
          this.statusMessage = '';
        }

        this.cdr.markForCheck();
        this.autoSave$.next();
      },
    });
  }

  ngOnDestroy(): void {
    if (this.shouldAutoSave()) {
      this.saveDraft();
    }
    this.editor?.destroy();
    this.autoSaveSub?.unsubscribe();
  }

  loadPost(id: number) {
    this.postService.getPostById(id).subscribe({
      next: (post) => {
        this.postTitle = post.title;
        this.postContent = post.content;
        this.lastSavedContent = post.content;
        this.postExcerpt = post.excerpt || '';
        this.postSlug = post.slug;
        this.featuredImageUrl = post.featuredImageUrl || '';
        this.featuredImageMediaId = (post as any).featuredImageMediaId || null;
        this.selectedCategoryId = post.categoryId || null;
        this.isPremium = post.isPremium || false;
        this.price = post.price || 0;
        this.currentStatus = post.status as 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';

        if (this.editor) {
          this.editor.commands.setContent(this.postContent);
        }

        this.lastSavedTitle = post.title;
        this.lastSavedContent = post.content;
        this.lastSaved = new Date(post.updatedAt || new Date());

        if (post.tagIds && post.tagIds.length > 0) {
          this.selectedTags = this.allTags.filter(t => post.tagIds?.includes(t.tagId));
        }
      },
      error: (error) => {
        this.errorMessage = error?.message || 'Failed to load post.';
      }
    });
  }

  // Editor Toolbar Commands
  toggleBold() { this.editor?.chain().focus().toggleBold().run(); }
  toggleItalic() { this.editor?.chain().focus().toggleItalic().run(); }
  toggleUnderline() { this.editor?.chain().focus().toggleUnderline().run(); }
  toggleHeading(level: 1 | 2 | 3) { this.editor?.chain().focus().toggleHeading({ level: level as any }).run(); }
  toggleQuote() { this.editor?.chain().focus().toggleBlockquote().run(); }
  toggleCode() { this.editor?.chain().focus().toggleCodeBlock().run(); }
  toggleBulletList() { this.editor?.chain().focus().toggleBulletList().run(); }
  toggleOrderedList() { this.editor?.chain().focus().toggleOrderedList().run(); }

  async insertLink() {
    const url = await this.promptService.prompt({
      title: 'Insert Link',
      message: 'Enter the URL for the link',
      placeholder: 'https://example.com'
    });
    
    if (url) {
      this.editor?.chain().focus().setLink({ href: url }).run();
    }
  }

  /** Insert inline image via file upload into editor body */
  triggerInlineImageUpload() {
    if (this.inlineImageInput) {
      this.inlineImageInput.nativeElement.value = '';
      this.inlineImageInput.nativeElement.click();
    }
  }

  onInlineImageSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    // Show base64 preview immediately, then replace with real URL after upload
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      this.editor?.chain().focus().setImage({ src: base64 }).run();
    };
    reader.readAsDataURL(file);
    // Upload to media service and replace base64 src with real URL
    this.mediaService.uploadMedia(file).subscribe({
      next: (res) => {
        // Replace the last inserted base64 image with the uploaded URL
        // We do this by updating the editor HTML
        const currentHtml = this.editor?.getHTML() || '';
        const updatedHtml = currentHtml.replace(
          /src="data:image\/[^;]+;base64,[^"]+"/,
          `src="${res.url}"`
        );
        this.editor?.commands.setContent(updatedHtml, { emitUpdate: false });
        this.postContent = this.editor?.getHTML() || '';
        this.userMedia.unshift(res);
      },
      error: () => {
        // base64 preview remains if upload fails — acceptable fallback
      }
    });
  }

  triggerFeaturedImageUpload() {
    if (this.fileInput) {
      // Reset the input so selecting the same file again triggers the change event
      this.fileInput.nativeElement.value = '';
      this.fileInput.nativeElement.click();
    }
  }

  onImageSelected(event: any) {
    const file: File | undefined = event.target.files[0];
    if (file) {
      this.uploadImage(file);
    }
  }

  /** Called by the (error) binding on the preview <img> tag */
  onImageError(): void {
    this.imageLoadFailed = true;
    this.imageLoading = false;
  }

  /** Called by the (load) binding on the preview <img> tag */
  onImageLoad(): void {
    this.imageLoadFailed = false;
    this.imageLoading = false;
  }

  private resetImageState(): void {
    this.imageLoadFailed = false;
    this.imageLoading = false;
  }

  uploadImage(file: File) {
    this.isUploading = true;
    this.imageLoading = true;
    this.imageLoadFailed = false;
    this.errorMessage = '';

    this.mediaService.uploadMedia(file).subscribe({
      next: (res) => {
        // Store raw URL in the model; use featuredImagePreviewUrl in the template
        this.featuredImageUrl = res.url;
        this.featuredImageMediaId = res.mediaId;
        // imageLoading stays true until the browser fires (load) or (error)
        this.userMedia.unshift(res);
        this.isUploading = false;
        this.toastService.success('Image uploaded successfully.');
      },
      error: () => {
        this.isUploading = false;
        this.imageLoading = false;
        this.imageLoadFailed = false;
        this.toastService.error(
          'Upload failed. Check that the file is a valid image (JPEG/PNG/GIF/WebP, max 10 MB).'
        );
      }
    });
  }

  selectMedia(media: any) {
    this.featuredImageUrl = media.url;
    this.featuredImageMediaId = media.mediaId;
    // Reset state: let (load)/(error) re-fire for the newly set src
    this.resetImageState();
    this.imageLoading = true;
  }

  /**
   * Absolute URL suitable for use in an <img [src]> binding.
   * Converts relative paths from the local storage backend into fully-qualified
   * URLs the browser can fetch. Passes through absolute URLs (e.g. old S3 links)
   * unchanged.
   */
  get featuredImagePreviewUrl(): string {
    return this.mediaService.resolveMediaUrl(this.featuredImageUrl);
  }

  get wordCount(): number {
    if (!this.postContent) return 0;
    // Strip HTML tags for word count
    const text = this.postContent.replace(/<[^>]*>/g, ' ');
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  get readTime(): number {
    return Math.ceil(this.wordCount / 200) || 1;
  }

  addTag(event?: KeyboardEvent) {
    if (event && event.key !== 'Enter') return;
    
    const tagStr = this.tagInput.trim();
    if (!tagStr) return;
    
    if (this.selectedTags.find(t => t.name.toLowerCase() === tagStr.toLowerCase())) {
      this.tagInput = '';
      return;
    }

    const existing = this.allTags.find(t => t.name.toLowerCase() === tagStr.toLowerCase());
    if (existing) {
      this.selectedTags.push(existing);
      this.tagInput = '';
      this.tagError = '';
    } else {
      this.tagError = 'Select an existing tag from the list.';
    }
  }

  removeTag(tag: TagResponse) {
    this.selectedTags = this.selectedTags.filter(t => t.tagId !== tag.tagId);
  }

  saveDraft() {
    this.savePost(false);
  }

  confirmPublish() {
    if (!this.postTitle?.trim()) {
      this.errorMessage = 'Title is required before publishing.';
      return;
    }
    const plainText = (this.postContent || '').replace(/<[^>]*>/g, '').trim();
    if (plainText.length < 10) {
      this.errorMessage = 'Content is too short (min 10 chars).';
      return;
    }
    this.showPublishModal = true;
  }

  cancelPublish() {
    this.showPublishModal = false;
  }

  publishPost() {
    this.showPublishModal = false;
    this.savePost(true);
  }

  private savePost(publish: boolean) {
    if (!this.postTitle?.trim()) {
      this.errorMessage = 'Post title is required.';
      return;
    }

    if (this.postTitle.trim().length < 5) {
      this.errorMessage = 'Post title must be at least 5 characters long.';
      return;
    }

    // Strip HTML tags to get plain text, then check backend's min=10 chars constraint
    const plainText = (this.postContent || '').replace(/<[^>]*>/g, '').trim();
    if (plainText.length < 10) {
      if (publish || plainText.length > 0) {
        this.errorMessage = 'Post content must be at least 10 characters long.';
      }
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.statusMessage = '';

    const request: PostRequest = {
      title: this.postTitle.trim(),
      content: this.postContent,
      excerpt: this.postExcerpt || undefined,
      // Only send a URL if we actually have one
      featuredImageUrl: this.featuredImageUrl || undefined,
      // Only send mediaId when a URL is also present (avoids calling media-service with stale ID)
      featuredImageMediaId: (this.featuredImageMediaId && this.featuredImageUrl)
        ? this.featuredImageMediaId
        : undefined,
      categoryId: this.selectedCategoryId ? +this.selectedCategoryId : undefined,
      tagIds: this.selectedTags.map(t => t.tagId),
      isPremium: this.isPremium,
      price: this.isPremium ? this.price : 0
    };

    if (this.postId) {
      this.postService.updatePost(this.postId, request).subscribe({
        next: (res) => {
          this.lastSaved = new Date();
          this.lastSavedTitle = this.postTitle;
          this.lastSavedContent = this.postContent;
          this.isSaving = false;
          localStorage.setItem('last_draft_id', res.postId.toString());
          if (publish) {
            localStorage.removeItem('last_draft_id');
            this.postService.publishPost(res.postId).subscribe(() => {
              this.toastService.success('Post published successfully!');
              setTimeout(() => this.router.navigate(['/my-posts']), 1500);
            });
          } else {
            // No message for auto-save, we use the lastSaved date in UI
          }
        },
        error: (err) => {
          this.isSaving = false;
          if (err.status === 400 && err.error?.errors) {
            // Handle Spring validation errors object
            const firstError = Object.values(err.error.errors)[0];
            this.errorMessage = `Invalid data: ${firstError}`;
          } else {
            this.errorMessage = err.error?.message || err.error || err.message || 'Failed to save post.';
          }
        }
      });
    } else {
      this.postService.createPost(request).subscribe({
        next: (res) => {
          this.postId = res.postId;
          this.postSlug = res.slug;
          this.lastSaved = new Date();
          this.lastSavedTitle = this.postTitle;
          this.lastSavedContent = this.postContent;
          this.isSaving = false;
          localStorage.setItem('last_draft_id', res.postId.toString());
          if (publish) {
            localStorage.removeItem('last_draft_id');
            this.postService.publishPost(res.postId).subscribe(() => {
              this.toastService.success('Post published successfully!');
              setTimeout(() => this.router.navigate(['/my-posts']), 1500);
            });
          } else {
            this.router.navigate(['/edit-post', res.postId], { replaceUrl: true });
          }
        },
        error: (err) => {
          this.isSaving = false;
          if (err.status === 400 && err.error?.errors) {
            const firstError = Object.values(err.error.errors)[0];
            this.errorMessage = `Invalid data: ${firstError}`;
          } else {
            this.errorMessage = err.error?.message || err.error || err.message || 'Failed to create post.';
          }
        }
      });
    }
  }
}
