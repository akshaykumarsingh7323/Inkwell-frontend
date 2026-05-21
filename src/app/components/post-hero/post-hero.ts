import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PostResponse } from '../../services/post.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';

@Component({
  selector: 'app-post-hero',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './post-hero.html',
  styleUrl: './post-hero.css'
})
export class PostHeroComponent {
  @Input({ required: true }) post!: PostResponse;
  @Input() authorName: string = 'Author';
  @Input() authorAvatar?: string;
  @Input() categoryName: string = 'Essay';
  @Input() readTime: number = 0;

  private readonly FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&q=80';
  private readonly pipe = new MediaUrlPipe();

  getHeroImage(): string {
    const raw = this.post.featuredImageUrl;
    if (!raw) return this.FALLBACK_IMAGE;
    return this.pipe.transform(raw) || this.FALLBACK_IMAGE;
  }
}
