import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthorStudioShell } from '../../components/author-studio-shell/author-studio-shell';
import { Subscriber } from '../../services/newsletter.service';

@Component({
  selector: 'app-followers',
  standalone: true,
  imports: [CommonModule, AuthorStudioShell],
  templateUrl: './followers.html',
  styleUrl: './followers.css'
})
export class Followers implements OnInit {
  followers: Subscriber[] = [];
  isLoading = true;
  errorMessage = 'Author follower dashboards are not available for platform-level newsletter subscriptions.';

  ngOnInit(): void {
    this.loadFollowers();
  }

  loadFollowers(): void {
    this.followers = [];
    this.isLoading = false;
  }

  getInitial(name?: string): string {
    return (name || 'U').charAt(0).toUpperCase();
  }
}
