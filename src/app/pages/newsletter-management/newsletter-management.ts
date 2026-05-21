import { Component, OnInit, OnDestroy, AfterViewInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewsletterService, Subscriber, CampaignRequest, NewsletterAnalytics } from '../../services/newsletter.service';
import { catchError, of, timeout } from 'rxjs';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';

@Component({
  selector: 'app-newsletter-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './newsletter-management.html',
  styleUrl: './newsletter-management.css',
})
export class NewsletterManagement implements OnInit, OnDestroy, AfterViewInit {
  private newsletterService = inject(NewsletterService);

  @ViewChild('editorContainer') editorContainer!: ElementRef;

  subscribers: Subscriber[] = [];
  analytics: NewsletterAnalytics | null = null;
  isLoading = true;
  isSending = false;
  errorMessage = '';
  statusMessage = '';
  statusIsError = false;
  
  editor: Editor | null = null;

  newsletter: CampaignRequest = {
    subject: '',
    content: ''
  };

  campaignFilters = {
    status: 'ACTIVE',
    tags: ''
  };

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.initEditor();
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.destroy();
    }
  }

  initEditor(): void {
    this.editor = new Editor({
      element: this.editorContainer.nativeElement,
      extensions: [
        StarterKit.configure({
          // Avoid duplicate extension registration warnings while keeping
          // the configured link and underline behavior below.
          link: false,
          underline: false,
        }),
        Underline,
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder: 'Start writing your campaign content here...' })
      ],
      content: '',
      onUpdate: ({ editor }) => {
        this.newsletter.content = editor.getHTML();
      }
    });
  }

  toggleBold(): void { this.editor?.chain().focus().toggleBold().run(); }
  toggleItalic(): void { this.editor?.chain().focus().toggleItalic().run(); }
  toggleUnderline(): void { this.editor?.chain().focus().toggleUnderline().run(); }
  
  insertLink(): void {
    const url = window.prompt('URL');
    if (url) {
      this.editor?.chain().focus().setLink({ href: url }).run();
    }
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    // Load subscribers
    this.newsletterService.getAllSubscribers().pipe(
      timeout(10000),
      catchError((error) => {
        console.error('Error fetching subscribers:', error);
        this.errorMessage = 'Failed to sync subscriber database.';
        return of([]);
      })
    ).subscribe(data => {
      this.subscribers = data;
      this.isLoading = false;
    });

    // Load analytics
    this.newsletterService.getAnalytics().subscribe({
      next: (data) => this.analytics = data,
      error: (err) => console.error('Analytics failed', err)
    });
  }

  sendNewsletter(): void {
    if (!this.newsletter.subject || !this.newsletter.content) {
      this.statusMessage = 'Subject and content are required.';
      this.statusIsError = true;
      return;
    }

    this.isSending = true;
    this.statusMessage = '';
    this.statusIsError = false;

    const tags = this.campaignFilters.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    this.newsletterService.sendCampaign({
      subject: this.newsletter.subject,
      content: this.newsletter.content,
      tags: tags.length > 0 ? tags : undefined
    }).subscribe({
      next: () => {
        this.statusMessage = 'Newsletter dispatched successfully.';
        this.statusIsError = false;
        this.newsletter = { subject: '', content: '' };
        this.campaignFilters = { status: 'ACTIVE', tags: '' };
        this.isSending = false;
        this.loadData(); // Refresh analytics
      },
      error: () => {
        this.statusMessage = 'Failed to send newsletter.';
        this.statusIsError = true;
        this.isSending = false;
      }
    });
  }

  get activeSubscribers(): number {
    return this.analytics?.activeSubscribers || 0;
  }

  get targetedSubscriberCount(): number {
    const tags = this.campaignFilters.tags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);

    return this.subscribers.filter((subscriber) => {
      const matchesStatus = (subscriber.status || 'PENDING').toUpperCase() === 'ACTIVE';
      if (!matchesStatus) {
        return false;
      }

      if (tags.length === 0) {
        return true;
      }

      const preferences = (subscriber.preferences || '').toLowerCase();
      return tags.some((tag) => preferences.includes(tag));
    }).length;
  }

  isSubscriberActive(subscriber: Subscriber): boolean {
    return (subscriber.status || '').toUpperCase() === 'ACTIVE';
  }

  formatSmartDate(dateStr?: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  }
}
