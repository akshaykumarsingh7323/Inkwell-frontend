import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicUserProfile } from '../../models/user.model';

@Component({
  selector: 'app-author-bio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './author-bio.html',
  styleUrl: './author-bio.css'
})
export class AuthorBioComponent implements OnInit {

  @Input({ required: true }) author!: PublicUserProfile;
  ngOnInit(): void {}
}
