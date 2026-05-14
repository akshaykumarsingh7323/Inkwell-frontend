import { TestBed } from '@angular/core/testing';
import { CommentService } from './comment.service';
import { HttpClient } from '@angular/common/http';
import { of, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

describe('CommentService', () => {
  let service: CommentService;
  let httpClientSpy: any;

  beforeEach(() => {
    httpClientSpy = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        CommentService,
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    });
    service = TestBed.inject(CommentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a comment', async () => {
    const req = { postId: 1, content: 'Nice post' };
    httpClientSpy.post.mockReturnValue(of({ ...req, commentId: 101 }));

    const res = await firstValueFrom(service.createComment(req));
    expect(res.commentId).toBe(101);
    expect(httpClientSpy.post).toHaveBeenCalledWith(expect.stringContaining('/comments'), req);
  });

  it('should get comments by post', async () => {
    const mockComments = [{ commentId: 1, content: 'Hi' }];
    httpClientSpy.get.mockReturnValue(of(mockComments));

    const res = await firstValueFrom(service.getCommentsByPost(1));
    expect(res).toEqual(mockComments);
    expect(httpClientSpy.get).toHaveBeenCalledWith(expect.stringContaining('/comments/post/1'));
  });

  it('should moderate a comment', async () => {
    httpClientSpy.patch.mockReturnValue(of({ status: 'APPROVED' }));
    const res = await firstValueFrom(service.moderateComment(1, 'APPROVE'));
    expect(res.status).toBe('APPROVED');
    expect(httpClientSpy.patch).toHaveBeenCalledWith(expect.stringContaining('/comments/1/moderate'), { action: 'APPROVE' });
  });

  it('should like a comment', async () => {
    httpClientSpy.post.mockReturnValue(of({ likesCount: 1 }));
    const res = await firstValueFrom(service.likeComment(1));
    expect(res.likesCount).toBe(1);
    expect(httpClientSpy.post).toHaveBeenCalledWith(expect.stringContaining('/comments/1/like'), {});
  });
});
