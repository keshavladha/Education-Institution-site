import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService, ADMIN_EMAILS } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.css']
})
export class AdminLogin {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  adminEmails = ADMIN_EMAILS;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  errorMessage: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const email = this.loginForm.value.email?.toLowerCase() || '';
    const password = this.loginForm.value.password || '';

    // Enforce that only admin emails can use this portal
    if (!this.adminEmails.includes(email)) {
      this.errorMessage = 'Access denied. This portal is strictly for system administrators.';
      this.isLoading = false;
      return;
    }

    try {
      await this.supabase.signIn(email, password);
      this.router.navigate(['/admin']);
    } catch (e: any) {
      this.errorMessage = e.message || 'Login failed. Please check your credentials.';
    } finally {
      this.isLoading = false;
    }
  }
}
