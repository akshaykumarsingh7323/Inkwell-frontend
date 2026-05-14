import { Component } from '@angular/core';
import { PostEditor } from '../post-editor/post-editor';

@Component({
  selector: 'app-edit-post',
  standalone: true,
  imports: [PostEditor],
  templateUrl: './edit-post.html',
  styleUrl: './edit-post.css'
})
export class EditPostComponent {}
