import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService, ADMIN_EMAILS } from './services/supabase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  title = 'Future Institute of Commerce';
  currentYear = new Date().getFullYear();
  isLoggedIn = false;
  isAdmin = false;
  studentName = '';

  private supabase = inject(SupabaseService);
  private router = inject(Router);

  // Admin email list - these emails have admin access
  private readonly adminEmails = ADMIN_EMAILS;

  ngOnInit() {
    // React to login/logout changes
    this.supabase.student$.subscribe(student => {
      this.isLoggedIn = !!student;
      this.isAdmin = student ? this.adminEmails.includes(student.email) : false;
      this.studentName = student?.full_name || '';
    });
  }

  logout() {
    this.supabase.signOut();
    this.router.navigate(['/']);
  }
}
