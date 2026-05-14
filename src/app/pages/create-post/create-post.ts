import { Component } from '@angular/core';
import { PostEditor } from '../post-editor/post-editor';

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [PostEditor],
  templateUrl: './create-post.html',
  styleUrl: './create-post.css'
})
export class CreatePostComponent {}
