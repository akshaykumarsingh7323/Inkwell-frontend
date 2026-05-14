import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Component } from '@angular/core';
import { EditPostComponent } from './edit-post';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { PostEditor } from '../post-editor/post-editor';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  template: ''
})
class MockPostEditor {}

describe('EditPostComponent', () => {
  let component: EditPostComponent;
  let fixture: ComponentFixture<EditPostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditPostComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
        provideRouter([])
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).overrideComponent(EditPostComponent, {
      remove: { imports: [PostEditor] },
      add: { imports: [MockPostEditor] }
    }).compileComponents();

    fixture = TestBed.createComponent(EditPostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
