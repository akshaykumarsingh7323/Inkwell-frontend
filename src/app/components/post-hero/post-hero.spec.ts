import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostHeroComponent } from './post-hero';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { provideRouter } from '@angular/router';

describe('PostHeroComponent', () => {
  let component: PostHeroComponent;
  let fixture: ComponentFixture<PostHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostHeroComponent, CommonModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PostHeroComponent);
    component = fixture.componentInstance;
    component.post = {
      title: 'Test Post',
      excerpt: 'Test Excerpt',
      featuredImageUrl: 'test-image.jpg',
      readTimeMin: 5,
      publishedAt: new Date().toISOString()
    } as any;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should return featured image URL if present', () => {
    fixture.detectChanges();
    expect(component.getHeroImage()).toBe('test-image.jpg');
  });

  it('should return default image URL if featured image is missing', () => {
    component.post.featuredImageUrl = '';
    fixture.detectChanges();
    expect(component.getHeroImage()).toContain('unsplash.com');
  });

  it('should display inputs correctly', () => {
    component.authorName = 'John Doe';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('John Doe');
  });
});
