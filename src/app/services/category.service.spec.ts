import { TestBed } from '@angular/core/testing';
import { CategoryService } from './category.service';
import { HttpClient } from '@angular/common/http';
import { of, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

describe('CategoryService', () => {
  let service: CategoryService;
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
        CategoryService,
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    });
    service = TestBed.inject(CategoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get categories', async () => {
    const mockCategories = [{ categoryId: 1, name: 'Tech' }];
    httpClientSpy.get.mockReturnValue(of(mockCategories));

    const res = await firstValueFrom(service.getCategories());
    expect(res).toEqual(mockCategories);
    expect(httpClientSpy.get).toHaveBeenCalledWith(expect.stringContaining('/categories'));
  });

  it('should get category tree', async () => {
    const mockTree = [{ categoryId: 1, name: 'Tech', children: [] }];
    httpClientSpy.get.mockReturnValue(of(mockTree));

    const res = await firstValueFrom(service.getCategoryTree());
    expect(res).toEqual(mockTree);
  });

  it('should create category', async () => {
    const req = { name: 'New Cat', description: 'Desc' };
    httpClientSpy.post.mockReturnValue(of({ ...req, categoryId: 1 }));

    const res = await firstValueFrom(service.createCategory(req));
    expect(res.name).toBe('New Cat');
    expect(httpClientSpy.post).toHaveBeenCalledWith(expect.stringContaining('/categories'), req);
  });

  it('should delete category', async () => {
    httpClientSpy.delete.mockReturnValue(of({}));
    await firstValueFrom(service.deleteCategory(1));
    expect(httpClientSpy.delete).toHaveBeenCalledWith(expect.stringContaining('/categories/1'));
  });

  it('should get trending tags', async () => {
    const mockTags = [{ tagId: 1, name: 'Angular' }];
    httpClientSpy.get.mockReturnValue(of(mockTags));

    const res = await firstValueFrom(service.getTrendingTags());
    expect(res).toEqual(mockTags);
  });
});
