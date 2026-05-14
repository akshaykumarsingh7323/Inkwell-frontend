import { TestBed } from '@angular/core/testing';
import { PostService } from './post.service';
import { HttpClient } from '@angular/common/http';
import { of, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

describe('PostService', () => {
  let service: PostService;
  let httpClientSpy: any;

  beforeEach(() => {
    httpClientSpy = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PostService,
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    });
    service = TestBed.inject(PostService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch published posts', async () => {
    const mockResponse = { content: [{ title: 'Post 1' }], totalElements: 1 };
    httpClientSpy.get.mockReturnValue(of(mockResponse));

    const res = await firstValueFrom(service.getPublishedPosts());
    expect(res).toEqual(mockResponse);
    expect(httpClientSpy.get).toHaveBeenCalledWith(expect.stringContaining('/posts/published'));
  });

  it('should create a post', async () => {
    const postData = { title: 'New Post', content: 'Content' };
    httpClientSpy.post.mockReturnValue(of({ ...postData, postId: 1 }));

    const res = await firstValueFrom(service.createPost(postData as any));
    expect(res.title).toBe('New Post');
    expect(httpClientSpy.post).toHaveBeenCalledWith(expect.any(String), postData);
  });

  it('should increment views', async () => {
    httpClientSpy.post.mockReturnValue(of({}));
    await firstValueFrom(service.incrementViews(1));
    expect(httpClientSpy.post).toHaveBeenCalledWith(expect.stringContaining('/posts/1/view'), {});
  });

  it('should like a post', async () => {
    httpClientSpy.post.mockReturnValue(of({}));
    await firstValueFrom(service.likePost(1));
    expect(httpClientSpy.post).toHaveBeenCalledWith(expect.stringContaining('/posts/1/like'), {});
  });

  it('should search posts', async () => {
    httpClientSpy.get.mockReturnValue(of({ content: [] }));
    await firstValueFrom(service.searchPosts('test'));
    expect(httpClientSpy.get).toHaveBeenCalledWith(expect.stringContaining('keyword=test'));
  });
});
