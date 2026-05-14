import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Component } from '@angular/core';
import { CreatePostComponent } from './create-post';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { PostEditor } from '../post-editor/post-editor';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  template: ''
})
class MockPostEditor {}

describe('CreatePostComponent', () => {
  let component: CreatePostComponent;
  let fixture: ComponentFixture<CreatePostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatePostComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        provideRouter([])
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).overrideComponent(CreatePostComponent, {
      remove: { imports: [PostEditor] },
      add: { imports: [MockPostEditor] }
    }).compileComponents();

    fixture = TestBed.createComponent(CreatePostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
